// ==================== HORÁRIO.JS ====================
// Gerenciamento de horários, alocações e detecção de choques
// - Respeita disponibilidade cadastrada do professor (dias + horários)
// - Impede lotação do mesmo professor no mesmo dia/horário em turmas diferentes

(function (global) {
  "use strict";

  // Constantes compartilhadas
  const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const DIAS_LABEL = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
  };

  // Horários compatíveis com o Gerenciador de Disponibilidade
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

  // Estado interno (referências externas injetadas via init)
  let state = {
    turmas: [],
    disciplinas: [],
    grade: {}, // { turmaId: { "segunda|07:00 - 07:45": { disciplina, professorId, professorNome, cor } } }
    professores: [],
    modalCtx: { dia: null, horario: null, turmaId: null },
    onSave: null, // callback para persistir no localStorage
  };

  // ==================== UTILITÁRIOS ====================
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function salvar() {
    if (typeof state.onSave === "function") {
      state.onSave({
        turmas: state.turmas,
        disciplinas: state.disciplinas,
        grade: state.grade,
      });
    }
  }

  // ==================== DISPONIBILIDADE DO PROFESSOR ====================
  /**
   * Verifica se o professor está disponível no dia e horário informados,
   * conforme o cadastro no Gerenciador de Disponibilidade.
   * Suporta formato novo { segunda: ["13:00 - 13:35", ...] }
   * e formato antigo { dias: [...], horarios: [...] }.
   */
  function professorDisponivel(prof, dia, horario) {
    if (!prof || !prof.disponibilidade) return false;
    const disp = prof.disponibilidade;

    // Formato novo: { segunda: ["13:00 - 13:35", ...], ... }
    if (disp[dia] && Array.isArray(disp[dia])) {
      return disp[dia].includes(horario);
    }

    // Formato antigo (compatibilidade)
    if (Array.isArray(disp.dias) && Array.isArray(disp.horarios)) {
      return disp.dias.includes(dia) && disp.horarios.includes(horario);
    }

    return false;
  }

  // ==================== CHOQUE DE HORÁRIOS ====================
  /**
   * Verifica se o professor já está alocado em OUTRA turma
   * no mesmo dia e no mesmo horário.
   * Retorna { conflito: boolean, turmaNome?: string, disciplina?: string }
   */
  function professorEmChoque(professorId, dia, horario, turmaIdAtual) {
    if (!professorId) return { conflito: false };

    for (const turma of state.turmas) {
      // Ignora a própria turma (permite editar a mesma célula)
      if (turma.id === turmaIdAtual) continue;

      const alocacoes = state.grade[turma.id] || {};
      const key = `${dia}|${horario}`;
      const cell = alocacoes[key];

      if (cell && cell.professorId === professorId) {
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

  /**
   * Validação completa antes de salvar:
   * 1. Professor deve estar disponível (dias + horários cadastrados)
   * 2. Professor não pode estar lotado no mesmo dia/horário em outra turma
   */
  function validarAlocacao(professorId, dia, horario, turmaId, disciplinaNome) {
    const resultado = {
      valido: false,
      mensagem: "",
      tipo: "erro", // "ok" | "erro" | "aviso"
    };

    if (!professorId || !disciplinaNome) {
      resultado.mensagem = "Selecione disciplina e professor.";
      return resultado;
    }

    const prof = state.professores.find((p) => p.id === professorId);
    if (!prof) {
      resultado.mensagem = "Professor não encontrado.";
      return resultado;
    }

    // 1. Disponibilidade cadastrada
    if (!professorDisponivel(prof, dia, horario)) {
      resultado.mensagem =
        "Professor <strong>não</strong> está disponível neste dia/horário (conforme cadastro de disponibilidade).";
      resultado.tipo = "erro";
      return resultado;
    }

    // 2. Choque entre turmas
    const choque = professorEmChoque(professorId, dia, horario, turmaId);
    if (choque.conflito) {
      resultado.mensagem = `Choque de horário: <strong>${prof.nome}</strong> já está lotado em <strong>${choque.turmaNome}</strong> (${choque.disciplina}) neste mesmo dia e horário.`;
      resultado.tipo = "erro";
      return resultado;
    }

    resultado.valido = true;
    resultado.tipo = "ok";
    resultado.mensagem = "Professor disponível neste horário e sem choque com outras turmas.";
    return resultado;
  }

  // ==================== TURMAS ====================
  function addTurma(nome, turno) {
    if (!nome) return { ok: false, erro: "Digite o nome da turma" };
    state.turmas.push({ id: uid(), nome, turno });
    salvar();
    return { ok: true };
  }

  function removerTurma(id) {
    state.turmas = state.turmas.filter((t) => t.id !== id);
    delete state.grade[id];
    salvar();
  }

  // ==================== DISCIPLINAS ====================
  function addDisciplina(nome) {
    if (!nome) return { ok: false, erro: "Digite o nome da disciplina" };
    state.disciplinas.push({ id: uid(), nome });
    salvar();
    return { ok: true };
  }

  function removerDisciplina(id) {
    state.disciplinas = state.disciplinas.filter((d) => d.id !== id);
    salvar();
  }

  // ==================== GRADE ====================
  function limparGradeTurma(turmaId) {
    if (!turmaId) return;
    state.grade[turmaId] = {};
    salvar();
  }

  function removerAlocacao(turmaId, key) {
    if (state.grade[turmaId]) {
      delete state.grade[turmaId][key];
      salvar();
    }
  }

  /**
   * Salva a alocação após validação completa (disponibilidade + choque).
   * Retorna { ok: boolean, mensagem?: string }
   */
  function salvarAlocacao(turmaId, dia, horario, disciplina, professorId) {
    const validacao = validarAlocacao(
      professorId,
      dia,
      horario,
      turmaId,
      disciplina
    );

    if (!validacao.valido) {
      return { ok: false, mensagem: validacao.mensagem };
    }

    const prof = state.professores.find((p) => p.id === professorId);
    if (!prof) {
      return { ok: false, mensagem: "Professor não encontrado." };
    }

    if (!state.grade[turmaId]) state.grade[turmaId] = {};
    const key = `${dia}|${horario}`;
    state.grade[turmaId][key] = {
      disciplina,
      professorId: prof.id,
      professorNome: prof.nome,
      cor: prof.cor || "#4f46e5",
    };

    salvar();
    return { ok: true };
  }

  // ==================== RENDERIZAÇÃO DA GRADE ====================
  function getHorariosDoTurno(turno) {
    return HORARIOS[turno] || [];
  }

  function getAlocacao(turmaId, dia, horario) {
    const alocacoes = state.grade[turmaId] || {};
    return alocacoes[`${dia}|${horario}`] || null;
  }

  // ==================== INIT / API PÚBLICA ====================
  /**
   * Inicializa o módulo com o estado e callback de persistência.
   * @param {Object} opts
   * @param {Array} opts.turmas
   * @param {Array} opts.disciplinas
   * @param {Object} opts.grade
   * @param {Array} opts.professores
   * @param {Function} opts.onSave - chamado com { turmas, disciplinas, grade }
   */
  function init(opts = {}) {
    state.turmas = opts.turmas || [];
    state.disciplinas = opts.disciplinas || [];
    state.grade = opts.grade || {};
    state.professores = opts.professores || [];
    state.onSave = opts.onSave || null;
  }

  function setProfessores(lista) {
    state.professores = lista || [];
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
    };
  }

  // Expor API
  const Horario = {
    DIAS,
    DIAS_LABEL,
    HORARIOS,
    init,
    setProfessores,
    setModalCtx,
    getModalCtx,
    getState,
    uid,
    // Disponibilidade e choque
    professorDisponivel,
    professorEmChoque,
    validarAlocacao,
    // CRUD
    addTurma,
    removerTurma,
    addDisciplina,
    removerDisciplina,
    limparGradeTurma,
    removerAlocacao,
    salvarAlocacao,
    // Grade helpers
    getHorariosDoTurno,
    getAlocacao,
  };

  global.Horario = Horario;
})(typeof window !== "undefined" ? window : globalThis);
