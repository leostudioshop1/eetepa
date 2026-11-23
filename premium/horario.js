// ==================== HORÁRIO.JS ====================
(function (global) {
  "use strict";

  var CACHE_KEY = "eetepa_master_horario_cache_v1";

  var DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
  var DIAS_LABEL = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta"
  };

  var TURNO_LABEL = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite"
  };

  var HORARIOS = {
    manha: [
      "07:00 - 07:45",
      "07:45 - 08:30",
      "08:30 - 09:15",
      "09:30 - 10:15",
      "10:15 - 11:00",
      "11:00 - 11:45"
    ],
    tarde: [
      "13:00 - 13:35",
      "13:35 - 14:10",
      "14:10 - 14:45",
      "15:00 - 15:35",
      "15:35 - 16:10",
      "16:10 - 16:45"
    ],
    noite: [
      "19:00 - 19:35",
      "19:35 - 20:10",
      "20:10 - 20:40",
      "21:00 - 21:35",
      "21:35 - 22:10"
    ]
  };

  var state = {
    turmas: [],
    disciplinas: [],
    grade: {},
    professores: [],
    modalCtx: { dia: null, horario: null, turmaId: null },
    professorDestacadoId: null,
    syncStatus: "idle",
    lastSyncAt: null,
    onChange: null,
    onStatusChange: null
  };

  var realtimeChannel = null;
  var isLoadingFromDb = false;

  function uid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(status, detalhe) {
    state.syncStatus = status;
    if (status === "synced") state.lastSyncAt = new Date();
    if (typeof state.onStatusChange === "function") {
      try {
        state.onStatusChange({ status: status, detalhe: detalhe || "", lastSyncAt: state.lastSyncAt });
      } catch (e) {
        console.warn("[Horario] onStatusChange erro:", e);
      }
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
          savedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.warn("[Horario] Falha ao salvar cache local:", e);
    }
  }

  function carregarCacheLocal() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
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
      try {
        state.onChange(getState());
      } catch (e) {
        console.warn("[Horario] onChange erro:", e);
      }
    }
  }

  function getDb() {
    if (global.supabaseClient) return global.supabaseClient;
    if (typeof global.getSupabaseClient === "function") {
      return global.getSupabaseClient();
    }
    return null;
  }

  function comTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error("Tempo esgotado (" + (label || "rede") + ")"));
      }, ms);
      Promise.resolve(promise).then(
        function (val) {
          clearTimeout(timer);
          resolve(val);
        },
        function (err) {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  // ==================== CARREGAMENTO DO SUPABASE ====================
  async function carregarTudoDoSupabase() {
    if (isLoadingFromDb) return { ok: false, busy: true };
    isLoadingFromDb = true;

    var cache = carregarCacheLocal();
    if (cache) {
      state.turmas = Array.isArray(cache.turmas) ? cache.turmas : [];
      state.disciplinas = Array.isArray(cache.disciplinas) ? cache.disciplinas : [];
      state.grade = cache.grade && typeof cache.grade === "object" ? cache.grade : {};
    }

    var db = getDb();
    if (!db) {
      setStatus("offline", cache ? "Cache Local" : "Offline");
      notificarMudanca();
      isLoadingFromDb = false;
      return { ok: false, offline: true };
    }

    setStatus("syncing", "Sincronizando...");

    try {
      var results = await comTimeout(
        Promise.allSettled([
          db.from("turmas").select("*").order("ordem", { ascending: true }).order("nome", { ascending: true }),
          db.from("disciplinas").select("*").order("nome", { ascending: true }),
          db.from("grade_horarios").select("*"),
          db.from("professores").select("*").order("nome", { ascending: true })
        ]),
        8000,
        "Supabase"
      );

      var rTurmas = results[0].status === "fulfilled" ? results[0].value : { error: results[0].reason };
      var rDisc = results[1].status === "fulfilled" ? results[1].value : { error: results[1].reason };
      var rGrade = results[2].status === "fulfilled" ? results[2].value : { error: results[2].reason };
      var rProfs = results[3].status === "fulfilled" ? results[3].value : { error: results[3].reason };

      var algumErro = false;

      if (!rTurmas.error && Array.isArray(rTurmas.data)) {
        state.turmas = rTurmas.data.map(function (t, idx) {
          return {
            id: t.id,
            nome: t.nome,
            turno: t.turno,
            ordem: t.ordem != null ? t.ordem : idx
          };
        });
      } else {
        algumErro = true;
      }

      if (!rDisc.error && Array.isArray(rDisc.data)) {
        state.disciplinas = rDisc.data.map(function (d) {
          return {
            id: d.id,
            nome: d.nome,
            cargaHoraria: d.carga_horaria != null ? d.carga_horaria : null
          };
        });
      } else {
        algumErro = true;
      }

      if (!rGrade.error && Array.isArray(rGrade.data)) {
        var novaGrade = {};
        for (var i = 0; i < rGrade.data.length; i++) {
          var row = rGrade.data[i];
          if (!novaGrade[row.turma_id]) novaGrade[row.turma_id] = {};
          var key = row.dia + "|" + row.horario;
          novaGrade[row.turma_id][key] = {
            id: row.id,
            disciplina: row.disciplina,
            professorId: row.professor_id,
            professorNome: row.professor_nome,
            cor: row.cor || "#4f46e5"
          };
        }
        state.grade = novaGrade;
      } else {
        algumErro = true;
      }

      if (!rProfs.error && Array.isArray(rProfs.data)) {
        state.professores = rProfs.data;
      }

      salvarCacheLocal();

      if (algumErro && !cache) {
        setStatus("error", "Erro ao ler tabelas");
      } else if (algumErro && cache) {
        setStatus("offline", "Cache Local");
      } else {
        setStatus("synced", "Supabase OK");
      }

      notificarMudanca();
      isLoadingFromDb = false;
      return { ok: !algumErro };
    } catch (err) {
      console.warn("[Horario] Falha ao sincronizar:", err);
      setStatus(cache ? "offline" : "error", cache ? "Cache Local" : "Sem conexão");
      notificarMudanca();
      isLoadingFromDb = false;
      return { ok: false, erro: err && err.message };
    }
  }

  function iniciarRealtime() {
    var db = getDb();
    if (!db || !global.SUPABASE_CONFIG || !global.SUPABASE_CONFIG.realtime || realtimeChannel) return;

    try {
      realtimeChannel = db
        .channel("master-horario-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "turmas" }, function () {
          carregarTudoDoSupabase();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "disciplinas" }, function () {
          carregarTudoDoSupabase();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "grade_horarios" }, function () {
          carregarTudoDoSupabase();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "professores" }, function () {
          carregarTudoDoSupabase();
        })
        .subscribe();
    } catch (e) {
      console.warn("[Horario] Realtime indisponível:", e);
    }
  }

  // ==================== DISPONIBILIDADE E CHOQUE ====================
  function professorDisponivel(prof, dia, horario) {
    if (!prof || !prof.disponibilidade) return false;
    var disp = prof.disponibilidade;

    if (disp[dia] && Array.isArray(disp[dia])) {
      return disp[dia].indexOf(horario) !== -1;
    }

    if (Array.isArray(disp.dias) && Array.isArray(disp.horarios)) {
      return disp.dias.indexOf(dia) !== -1 && disp.horarios.indexOf(horario) !== -1;
    }

    return false;
  }

  function professorEmChoque(professorId, dia, horario, turmaIdAtual) {
    if (!professorId) return { conflito: false };

    for (var i = 0; i < state.turmas.length; i++) {
      var turma = state.turmas[i];
      if (turma.id === turmaIdAtual) continue;

      var alocacoes = state.grade[turma.id] || {};
      var key = dia + "|" + horario;
      var cell = alocacoes[key];

      if (cell && String(cell.professorId) === String(professorId)) {
        return {
          conflito: true,
          turmaNome: turma.nome,
          disciplina: cell.disciplina,
          turno: turma.turno
        };
      }
    }

    return { conflito: false };
  }

  function validarAlocacao(professorId, dia, horario, turmaId, disciplinaNome) {
    var resultado = {
      valido: false,
      mensagem: "",
      tipo: "erro"
    };

    if (!professorId || !disciplinaNome) {
      resultado.mensagem = "Selecione disciplina e professor.";
      return resultado;
    }

    var prof = state.professores.find(function (p) {
      return String(p.id) === String(professorId);
    });
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

    var choque = professorEmChoque(prof.id, dia, horario, turmaId);
    if (choque.conflito) {
      resultado.mensagem =
        "Choque de horário: <strong>" +
        escapeHtml(prof.nome) +
        "</strong> já está lotado em <strong>" +
        escapeHtml(choque.turmaNome) +
        "</strong> (" +
        escapeHtml(choque.disciplina) +
        ") neste mesmo dia e horário.";
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
    var limpo = (nome || "").trim();
    if (!limpo) return { ok: false, erro: "Digite o nome da turma" };
    if (["manha", "tarde", "noite"].indexOf(turno) === -1) {
      return { ok: false, erro: "Turno inválido" };
    }

    var novaTurma = {
      id: uid(),
      nome: limpo,
      turno: turno,
      ordem: state.turmas.length
    };

    state.turmas.push(novaTurma);
    notificarMudanca();

    var db = getDb();
    if (db) {
      setStatus("syncing", "Salvando turma...");
      var res = await db.from("turmas").insert({
        id: novaTurma.id,
        nome: novaTurma.nome,
        turno: novaTurma.turno,
        ordem: novaTurma.ordem,
        updated_at: new Date().toISOString()
      });
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, erro: "Salvo localmente, mas erro no Supabase: " + res.error.message };
      }
      setStatus("synced", "Supabase OK");
    }

    return { ok: true, turma: novaTurma };
  }

  async function removerTurma(id) {
    state.turmas = state.turmas.filter(function (t) {
      return t.id !== id;
    });
    delete state.grade[id];
    notificarMudanca();

    var db = getDb();
    if (db) {
      setStatus("syncing", "Removendo turma...");
      await db.from("grade_horarios").delete().eq("turma_id", id);
      var res = await db.from("turmas").delete().eq("id", id);
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, erro: res.error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  // ==================== CRUD DISCIPLINAS ====================
  async function addDisciplina(nome, cargaHoraria) {
    var limpo = (nome || "").trim();
    if (!limpo) return { ok: false, erro: "Digite o nome da disciplina" };

    var duplicada = state.disciplinas.some(function (d) {
      return d.nome.toLowerCase() === limpo.toLowerCase();
    });
    if (duplicada) return { ok: false, erro: "Esta disciplina já está cadastrada" };

    var ch = cargaHoraria ? parseInt(cargaHoraria, 10) : null;
    var novaDisciplina = {
      id: uid(),
      nome: limpo,
      cargaHoraria: Number.isFinite(ch) && ch > 0 ? ch : null
    };

    state.disciplinas.push(novaDisciplina);
    notificarMudanca();

    var db = getDb();
    if (db) {
      setStatus("syncing", "Salvando disciplina...");
      var res = await db.from("disciplinas").insert({
        id: novaDisciplina.id,
        nome: novaDisciplina.nome,
        carga_horaria: novaDisciplina.cargaHoraria,
        updated_at: new Date().toISOString()
      });
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, erro: "Salvo localmente, mas erro no Supabase: " + res.error.message };
      }
      setStatus("synced", "Supabase OK");
    }

    return { ok: true, disciplina: novaDisciplina };
  }

  async function removerDisciplina(id) {
    state.disciplinas = state.disciplinas.filter(function (d) {
      return d.id !== id;
    });
    notificarMudanca();

    var db = getDb();
    if (db) {
      setStatus("syncing", "Removendo disciplina...");
      var res = await db.from("disciplinas").delete().eq("id", id);
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, erro: res.error.message };
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

    var db = getDb();
    if (db) {
      setStatus("syncing", "Limpando grade...");
      var res = await db.from("grade_horarios").delete().eq("turma_id", turmaId);
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, erro: res.error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  async function removerAlocacao(turmaId, key) {
    if (!turmaId || !key || !state.grade[turmaId] || !state.grade[turmaId][key]) return { ok: false };

    var partes = key.split("|");
    var dia = partes[0];
    var horario = partes[1];
    delete state.grade[turmaId][key];
    notificarMudanca();

    var db = getDb();
    if (db && dia && horario) {
      setStatus("syncing", "Removendo alocação...");
      var res = await db
        .from("grade_horarios")
        .delete()
        .eq("turma_id", turmaId)
        .eq("dia", dia)
        .eq("horario", horario);
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, erro: res.error.message };
      }
      setStatus("synced", "Supabase OK");
    }
    return { ok: true };
  }

  async function salvarAlocacao(turmaId, dia, horario, disciplina, professorId) {
    var validacao = validarAlocacao(professorId, dia, horario, turmaId, disciplina);
    if (!validacao.valido) {
      return { ok: false, mensagem: validacao.mensagem };
    }

    var prof = state.professores.find(function (p) {
      return String(p.id) === String(professorId);
    });
    if (!prof) {
      return { ok: false, mensagem: "Professor não encontrado." };
    }

    if (!state.grade[turmaId]) state.grade[turmaId] = {};
    var key = dia + "|" + horario;
    var celula = {
      id: (state.grade[turmaId][key] && state.grade[turmaId][key].id) || uid(),
      disciplina: disciplina,
      professorId: prof.id,
      professorNome: prof.nome,
      cor: prof.cor || "#4f46e5"
    };

    state.grade[turmaId][key] = celula;
    notificarMudanca();

    var db = getDb();
    if (db) {
      setStatus("syncing", "Salvando aula...");
      var res = await db.from("grade_horarios").upsert(
        {
          id: celula.id,
          turma_id: turmaId,
          dia: dia,
          horario: horario,
          disciplina: celula.disciplina,
          professor_id: String(celula.professorId),
          professor_nome: celula.professorNome,
          cor: celula.cor,
          updated_at: new Date().toISOString()
        },
        { onConflict: "turma_id,dia,horario" }
      );
      if (res.error) {
        setStatus("error", res.error.message);
        return { ok: false, mensagem: "Erro ao salvar no Supabase: " + res.error.message };
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
    var alocacoes = state.grade[turmaId] || {};
    return alocacoes[dia + "|" + horario] || null;
  }

  function getProfessorAtual(professorId) {
    return (
      state.professores.find(function (p) {
        return String(p.id) === String(professorId);
      }) || null
    );
  }

  function getEstatisticasTurma(turmaId) {
    var turma = state.turmas.find(function (t) {
      return t.id === turmaId;
    });
    if (!turma) return { alocadas: 0, total: 0, percentual: 0 };
    var horarios = getHorariosDoTurno(turma.turno);
    var total = horarios.length * DIAS.length;
    var alocacoes = state.grade[turmaId] || {};
    var alocadas = 0;
    for (var i = 0; i < horarios.length; i++) {
      for (var j = 0; j < DIAS.length; j++) {
        if (alocacoes[DIAS[j] + "|" + horarios[i]]) alocadas++;
      }
    }
    var percentual = total > 0 ? Math.round((alocadas / total) * 100) : 0;
    return { alocadas: alocadas, total: total, percentual: percentual };
  }

  function getAulasDoProfessor(professorId) {
    var totalAulas = 0;
    var turmasSet = {};
    for (var i = 0; i < state.turmas.length; i++) {
      var turma = state.turmas[i];
      var alocacoes = state.grade[turma.id] || {};
      var keys = Object.keys(alocacoes);
      for (var j = 0; j < keys.length; j++) {
        var cell = alocacoes[keys[j]];
        if (cell && String(cell.professorId) === String(professorId)) {
          totalAulas++;
          turmasSet[turma.nome] = true;
        }
      }
    }
    return { totalAulas: totalAulas, turmas: Object.keys(turmasSet) };
  }

  function init(opts) {
    opts = opts || {};
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
    state.modalCtx = { dia: dia, horario: horario, turmaId: turmaId };
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
      lastSyncAt: state.lastSyncAt
    };
  }

  global.Horario = {
    DIAS: DIAS,
    DIAS_LABEL: DIAS_LABEL,
    TURNO_LABEL: TURNO_LABEL,
    HORARIOS: HORARIOS,
    escapeHtml: escapeHtml,
    init: init,
    carregarTudoDoSupabase: carregarTudoDoSupabase,
    iniciarRealtime: iniciarRealtime,
    setProfessores: setProfessores,
    setProfessorDestacado: setProfessorDestacado,
    setModalCtx: setModalCtx,
    getModalCtx: getModalCtx,
    getState: getState,
    uid: uid,
    professorDisponivel: professorDisponivel,
    professorEmChoque: professorEmChoque,
    validarAlocacao: validarAlocacao,
    addTurma: addTurma,
    removerTurma: removerTurma,
    addDisciplina: addDisciplina,
    removerDisciplina: removerDisciplina,
    limparGradeTurma: limparGradeTurma,
    removerAlocacao: removerAlocacao,
    salvarAlocacao: salvarAlocacao,
    getHorariosDoTurno: getHorariosDoTurno,
    getAlocacao: getAlocacao,
    getProfessorAtual: getProfessorAtual,
    getEstatisticasTurma: getEstatisticasTurma,
    getAulasDoProfessor: getAulasDoProfessor
  };
})(typeof window !== "undefined" ? window : globalThis);
