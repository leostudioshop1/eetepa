// ==================== HORÁRIO.JS ====================
// Gerenciamento de horários, alocações, persistência Supabase + Cache Local
// e detecção de conflitos (disponibilidade do professor + choque entre turmas).

(function (global) {
  "use strict";

  const CACHE_KEY = "eetepa_master_horario_cache_v1";

  const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const DIAS_LABEL = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
  };

  const TURNO_LABEL = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite",
  };

  const HORARIOS = {
    manha: [
      "07:00 - 07:45",
      "07:45 - 08:30",
      "08:30 - 09:15",
      "09:30 - 10:15",
      "10:15 - 11:00",
      "11:00 - 11:45",
    ],
    tarde: [
      "13:00 - 13:35",
      "13:35 - 14:10",
      "14:10 - 14:45",
      "15:00 - 15:35",
      "15:35 - 16:10",
      "16:10 - 16:45",
    ],
    noite: [
      "19:00 - 19:35",
      "19:35 - 20:10",
      "20:10 - 20:40",
      "21:00 - 21:35",
      "21:35 - 22:10",
    ],
  };

  let state = {
    turmas: [],
    disciplinas: [],
    grade: {}, // { turmaId: { "segunda|07:00 - 07:45": { id, disciplina, professorId, professorNome, cor } } }
    professores: [],
    modalCtx: { dia: null, horario: null, turmaId: null },
    professorDestacadoId: null,
    syncStatus: "idle",
    lastSyncAt: null,
    onChange: null,
    onStatusChange: null,
  };

  let realtimeChannel = null;

  function uid() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(status, detalhe = "") {
    state.syncStatus = status;
    if (status === "synced") state.lastSyncAt = new Date();
    if (typeof state.onStatusChange === "function") {
      state.onStatusChange({ status, detalhe, lastSyncAt: state.lastSyncAt });
    }
  }

  function salvarCacheLocal() {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          turmas: state.turmas,
          disciplinas: state.disciplinas,
          grade: state.grade,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn("[Horario] Falha ao salvar cache local:", e);
    }
  }

  function carregarCacheLocal() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[Horario] Falha ao ler cache local:", e);
      return null;
    }
  }

  function notificarMudanca() {
    salvarCacheLocal();
    if (typeof state.onChange === "function") {
      state.onChange(getState());
    }
  }

  function getDb() {
    return global.supabaseClient || null;
  }

  // ==================== CARREGAMENTO DO SUPABASE ====================
  async function carregarTudoDoSupabase() {
    const db = getDb();
    const cache = carregarCacheLocal();

    if (cache) {
      state.turmas = Array.isArray(cache.turmas) ? cache.turmas : [];
      state.disciplinas = Array.isArray(cache.disciplinas) ? cache.disciplinas : [];
      state.grade = cache.grade && typeof cache.grade === "object" ? cache.grade : {};
    }

    if (!db) {
      setStatus("offline", "Sem cliente Supabase");
      notificarMudanca();
      return { ok: false, offline: true };
    }

    setStatus("syncing", "Sincronizando...");

    try {
      const [resTurmas, resDisciplinas, resGrade, resProfs] = await Promise.all([
        db.from("turmas").select("*").order("ordem", { ascending: true }).order("nome", { ascending: true }),
        db.from("disciplinas").select("*").order("nome", { ascending: true }),
        db.from("grade_horarios").select("*"),
        db.from("professores").select("*").order("nome", { ascending: true }),
      ]);

      if (resTurmas.error) throw resTurmas.error;
      if (resDisciplinas.error) throw resDisciplinas.error;
      if (resGrade.error) throw resGrade.error;

      state.turmas = (resTurmas.data || []).map((t, idx) => ({
        id: t.id,
        nome: t.nome,
        turno: t.turno,
        ordem: t.ordem ?? idx,
      }));

      state.disciplinas = (resDisciplinas.data || []).map((d) => ({
        id: d.id,
        nome: d.nome,
        cargaHoraria: d.carga_horaria ?? null,
      }));

      const novaGrade = {};
      for (const row of resGrade.data || []) {
        if (!novaGrade[row.turma_id]) novaGrade[row.turma_id] = {};
        const key = `${row.dia}|${row.horario}`;
        novaGrade[row.turma_id][key] = {
          id: row.id,
          disciplina: row.disciplina,
          professorId: row.professor_id,
          professorNome: row.professor_nome,
          cor: row.cor || "#4f46e5",
        };
      }
      state.grade = novaGrade;

      if (!resProfs.error && Array.isArray(resProfs.data)) {
        state.professores = resProfs.data;
      }

      salvarCacheLocal();
      setStatus("synced", "Supabase OK");
      notificarMudanca();
      return { ok: true };
    } catch (err) {
      console.error("[Horario] Erro ao carregar do Supabase:", err);
      setStatus(cache ? "offline" : "error", err.message || "Erro Supabase");
      notificarMudanca();
      return { ok: false, erro: err.message };
    }
  }

  function iniciarRealtime() {
    const db = getDb();
    if (!db || !global.SUPABASE_CONFIG?.realtime || realtimeChannel) return;

    try {
      realtimeChannel = db
        .channel("master-horario-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "turmas" }, () => carregarTudoDoSupabase())
        .on("postgres_changes", { event: "*", schema: "public", table: "disciplinas" }, () => carregarTudoDoSupabase())
        .on("postgres_changes", { event: "*", schema: "public", table: "grade_horarios" }, () => carregarTudoDoSupabase())
        .on("postgres_changes", { event: "*", schema: "public", table: "professores" }, () => carregarTudoDoSupabase())
        .subscribe();
    } catch (e) {
      console.warn("[Horario] Realtime indisponível:", e);
    }
  }

  // ==================== DISPONIBILIDADE E CHOQUE ====================
  function professorDisponivel(prof, dia, horario) {
    if (!prof || !prof.disponibilidade) return false;
    const disp = prof.disponibilidade;

    if (disp[dia] && Array.isArray(disp[dia])) {
      return disp[dia].includes(horario);
    }

    if (Array.isArray(disp.dias) && Array.isArray(disp.horarios)) {
      return disp.dias.includes(dia) && disp.horarios.includes(horario);
    }

    return false;
  }

  function professorEmChoque(professorId, dia, horario, turmaIdAtual) {
    if (!professorId) return { conflito: false };

    for (const turma of state.turmas) {
      if (turma.id === turmaIdAtual) continue;

      const alocacoes = state.grade[turma.id] || {};
      const key = `${dia}|${horario}`;
      const cell = alocacoes[key];

      if (cell && String(cell.professorId) === String(professorId)) {
        return {
          conflito: true,
          turmaNome: turma.nome,
          disciplina: cell.disciplina,
          turno: turma.turno,
        };
      }
    }

    return { conflito: false };
  }

  function validarAlocacao(professorId, dia, horario, turmaId, disciplinaNome) {
    const resultado = {
      valido: false,
      mensagem: "",
      tipo: "erro",
    };

    if (!professorId || !disciplinaNome) {
      resultado.mensagem = "Selecione disciplina e professor.";
      return resultado;
    }

    const prof = state.professores.find((p) => String(p.id) === String(professorId));
    if (!prof) {
      resultado.mensagem = "Professor não encontrado.";
      return resultado;
    }

    if (!professorDisponivel(prof, dia, horario)) {
      resultado.mensagem =
        "Professor <strong>não</strong> está disponível neste dia/horário (conforme cadastro de disponibilidade).";
      resultado.tipo = "erro";
      return resultado;
    }

    const choque = professorEmChoque(prof.id, dia, horario, turmaId);
    if (choque.conflito) {
      resultado.mensagem = `Choque de horário: <strong>${escapeHtml(prof.nome)}</strong> já está lotado em <strong>${escapeHtml(choque.turmaNome)}</strong> (${escapeHtml(choque.disciplina)}) neste mesmo dia e horário.`;
      resultado.tipo = "erro";
      return resultado;
    }

    resultado.valido = true;
    resultado.tipo = "ok";
    resultado.mensagem = "Professor disponível neste horário e sem choque com outras turmas.";
    return resultado;
  }

  // ==================== CRUD TURMAS ====================
  async function addTurma(nome, turno) {
    const limpo = (nome || "").trim();
    if (!limpo) return { ok: false, erro: "Digite o nome da turma" };
    if (!["manha", "tarde", "noite"].includes(turno)) {
      return { ok: false, erro: "Turno inválido" };
    }

    const novaTurma = {
      id: uid(),
      nome: limpo,
      turno,
      ordem: state.turmas.length,
    };

    state.turmas.push(novaTurma);
    notificarMudanca();

    const db = getDb();
    if (db) {
      setStatus("syncing", "Salvando turma...");
      const { error } = await db.from("turmas").insert({
        id: novaTurma.id,
        nome: novaTurma.nome,
        turno: novaTurma.turno,
        ordem: novaTurma.ordem,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setStatus("error", error.message);
        return { ok: false, erro: `Salvo localmente, mas erro no Supabase: ${error.message}` };
      }
      setStatus("synced", "Supabase OK");
    }

    return { ok: true, turma: novaTurma };
  }

  async function removerTurma(id) {
    state.turmas = state.turmas.filter((t) => t.id !== id);
    delete state.grade[id];
    notificarMudanca();

    const db = getDb();
    if (db) {
      setStatus("syncing", "Removendo turma...");
      await db.from("grade_horarios").delete().eq("turma_id", id);
      const { error } = await db.from("turmas").delete().eq("id", id);
      if (error) {
        setStatus("error", error.message);
        return { ok: false, erro: error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  // ==================== CRUD DISCIPLINAS ====================
  async function addDisciplina(nome, cargaHoraria = null) {
    const limpo = (nome || "").trim();
    if (!limpo) return { ok: false, erro: "Digite o nome da disciplina" };

    const duplicada = state.disciplinas.some(
      (d) => d.nome.toLowerCase() === limpo.toLowerCase()
    );
    if (duplicada) return { ok: false, erro: "Esta disciplina já está cadastrada" };

    const ch = cargaHoraria ? parseInt(cargaHoraria, 10) : null;
    const novaDisciplina = {
      id: uid(),
      nome: limpo,
      cargaHoraria: Number.isFinite(ch) && ch > 0 ? ch : null,
    };

    state.disciplinas.push(novaDisciplina);
    notificarMudanca();

    const db = getDb();
    if (db) {
      setStatus("syncing", "Salvando disciplina...");
      const { error } = await db.from("disciplinas").insert({
        id: novaDisciplina.id,
        nome: novaDisciplina.nome,
        carga_horaria: novaDisciplina.cargaHoraria,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setStatus("error", error.message);
        return { ok: false, erro: `Salvo localmente, mas erro no Supabase: ${error.message}` };
      }
      setStatus("synced", "Supabase OK");
    }

    return { ok: true, disciplina: novaDisciplina };
  }

  async function removerDisciplina(id) {
    state.disciplinas = state.disciplinas.filter((d) => d.id !== id);
    notificarMudanca();

    const db = getDb();
    if (db) {
      setStatus("syncing", "Removendo disciplina...");
      const { error } = await db.from("disciplinas").delete().eq("id", id);
      if (error) {
        setStatus("error", error.message);
        return { ok: false, erro: error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  // ==================== GRADE ====================
  async function limparGradeTurma(turmaId) {
    if (!turmaId) return { ok: false };
    state.grade[turmaId] = {};
    notificarMudanca();

    const db = getDb();
    if (db) {
      setStatus("syncing", "Limpando grade...");
      const { error } = await db.from("grade_horarios").delete().eq("turma_id", turmaId);
      if (error) {
        setStatus("error", error.message);
        return { ok: false, erro: error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  async function removerAlocacao(turmaId, key) {
    if (!turmaId || !key || !state.grade[turmaId]?.[key]) return { ok: false };

    const [dia, horario] = key.split("|");
    delete state.grade[turmaId][key];
    notificarMudanca();

    const db = getDb();
    if (db && dia && horario) {
      setStatus("syncing", "Removendo alocação...");
      const { error } = await db
        .from("grade_horarios")
        .delete()
        .eq("turma_id", turmaId)
        .eq("dia", dia)
        .eq("horario", horario);
      if (error) {
        setStatus("error", error.message);
        return { ok: false, erro: error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  async function salvarAlocacao(turmaId, dia, horario, disciplina, professorId) {
    const validacao = validarAlocacao(professorId, dia, horario, turmaId, disciplina);
    if (!validacao.valido) {
      return { ok: false, mensagem: validacao.mensagem };
    }

    const prof = state.professores.find((p) => String(p.id) === String(professorId));
    if (!prof) {
      return { ok: false, mensagem: "Professor não encontrado." };
    }

    if (!state.grade[turmaId]) state.grade[turmaId] = {};
    const key = `${dia}|${horario}`;
    const celula = {
      id: state.grade[turmaId][key]?.id || uid(),
      disciplina,
      professorId: prof.id,
      professorNome: prof.nome,
      cor: prof.cor || "#4f46e5",
    };

    state.grade[turmaId][key] = celula;
    notificarMudanca();

    const db = getDb();
    if (db) {
      setStatus("syncing", "Salvando aula...");
      const { error } = await db.from("grade_horarios").upsert(
        {
          id: celula.id,
          turma_id: turmaId,
          dia,
          horario,
          disciplina: celula.disciplina,
          professor_id: String(celula.professorId),
          professor_nome: celula.professorNome,
          cor: celula.cor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "turma_id,dia,horario" }
      );
      if (error) {
        setStatus("error", error.message);
        return { ok: false, mensagem: `Erro ao salvar no Supabase: ${error.message}` };
      }
      setStatus("synced", "Supabase OK");
    }

    return { ok: true };
  }

  // ==================== HELPERS E ESTATÍSTICAS ====================
  function getHorariosDoTurno(turno) {
    return HORARIOS[turno] || [];
  }

  function getAlocacao(turmaId, dia, horario) {
    const alocacoes = state.grade[turmaId] || {};
    return alocacoes[`${dia}|${horario}`] || null;
  }

  function getProfessorAtual(professorId) {
    return state.professores.find((p) => String(p.id) === String(professorId)) || null;
  }

  function getEstatisticasTurma(turmaId) {
    const turma = state.turmas.find((t) => t.id === turmaId);
    if (!turma) return { alocadas: 0, total: 0, percentual: 0 };
    const horarios = getHorariosDoTurno(turma.turno);
    const total = horarios.length * DIAS.length;
    const alocacoes = state.grade[turmaId] || {};
    let alocadas = 0;
    for (const h of horarios) {
      for (const d of DIAS) {
        if (alocacoes[`${d}|${h}`]) alocadas++;
      }
    }
    const percentual = total > 0 ? Math.round((alocadas / total) * 100) : 0;
    return { alocadas, total, percentual };
  }

  function getAulasDoProfessor(professorId) {
    let totalAulas = 0;
    const turmasSet = new Set();
    for (const turma of state.turmas) {
      const alocacoes = state.grade[turma.id] || {};
      for (const cell of Object.values(alocacoes)) {
        if (String(cell.professorId) === String(professorId)) {
          totalAulas++;
          turmasSet.add(turma.nome);
        }
      }
    }
    return { totalAulas, turmas: Array.from(turmasSet) };
  }

  function init(opts = {}) {
    state.turmas = opts.turmas || [];
    state.disciplinas = opts.disciplinas || [];
    state.grade = opts.grade || {};
    state.professores = opts.professores || [];
    state.onChange = opts.onChange || null;
    state.onStatusChange = opts.onStatusChange || null;
  }

  function setProfessores(lista) {
    state.professores = Array.isArray(lista) ? lista : [];
  }

  function setProfessorDestacado(professorId) {
    state.professorDestacadoId =
      String(state.professorDestacadoId) === String(professorId) ? null : professorId;
    notificarMudanca();
  }

  function setModalCtx(dia, horario, turmaId) {
    state.modalCtx = { dia, horario, turmaId };
  }

  function getModalCtx() {
    return state.modalCtx;
  }

  function getState() {
    return {
      turmas: state.turmas,
      disciplinas: state.disciplinas,
      grade: state.grade,
      professores: state.professores,
      professorDestacadoId: state.professorDestacadoId,
      syncStatus: state.syncStatus,
      lastSyncAt: state.lastSyncAt,
    };
  }

  global.Horario = {
    DIAS,
    DIAS_LABEL,
    TURNO_LABEL,
    HORARIOS,
    escapeHtml,
    init,
    carregarTudoDoSupabase,
    iniciarRealtime,
    setProfessores,
    setProfessorDestacado,
    setModalCtx,
    getModalCtx,
    getState,
    uid,
    professorDisponivel,
    professorEmChoque,
    validarAlocacao,
    addTurma,
    removerTurma,
    addDisciplina,
    removerDisciplina,
    limparGradeTurma,
    removerAlocacao,
    salvarAlocacao,
    getHorariosDoTurno,
    getAlocacao,
    getProfessorAtual,
    getEstatisticasTurma,
    getAulasDoProfessor,
  };
})(typeof window !== "undefined" ? window : globalThis);
