(function (global) {
  "use strict";

  // Constantes compartilhadas para economizar energia
  const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const DIAS_LABEL = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
  };

  // Horários compatíveis com a Disponibilidade de cada alecrim dourado
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

  // esse agora foi dentro
  let state = {
    turmas: [],
    disciplinas: [],
    grade: {}, // { turmaId: { "segunda|07:00 - 07:45": { disciplina, professorId, professorNome, cor } } }
    professores: [],
    modalCtx: { dia: null, horario: null, turmaId: null },
    onSave: null, // persistencia é o nome
  };

  // utilidades
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

  // agora a galeria dos alecrim dourados
 
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
      // permite editar a mesma célula
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

    //  Disponibilidade cadastrada
    if (!professorDisponivel(prof, dia, horario)) {
      resultado.mensagem =
        "Professor <strong>não</strong> está disponível neste dia/horário (conforme cadastro de disponibilidade).";
      resultado.tipo = "erro";
      return resultado;
    }

    //  Choque entre turmas
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

  //turmas
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

  // disciplinas do povo
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

  // grade
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

  // ajustes na grade
  function getHorariosDoTurno(turno) {
    return HORARIOS[turno] || [];
  }

  function getAlocacao(turmaId, dia, horario) {
    const alocacoes = state.grade[turmaId] || {};
    return alocacoes[`${dia}|${horario}`] || null;
  }

 
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

  // Expor dados, sensível aqui
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
