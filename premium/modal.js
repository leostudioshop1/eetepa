// ==================== MODAL ====================
function abrirModal(dia, horario, turmaId) {
  Horario.setModalCtx(dia, horario, turmaId);
  var state = Horario.getState();
  var turmas = state.turmas;
  var grade = state.grade;
  var turma = turmas.find(function (t) {
    return t.id === turmaId;
  });
  var alocacaoExistente = (grade[turmaId] && grade[turmaId][dia + "|" + horario]) || null;

  document.getElementById("modal-title").textContent = alocacaoExistente ? "Editar / Remover Aula" : "Alocar Aula";
  document.getElementById("modal-contexto").textContent =
    (Horario.DIAS_LABEL[dia] || dia) + " • " + horario + " • " + ((turma && turma.nome) || "");

  var selTurma = document.getElementById("modal-turma");
  selTurma.innerHTML = turmas
    .map(function (t) {
      return (
        '<option value="' +
        t.id +
        '" ' +
        (t.id === turmaId ? "selected" : "") +
        ">" +
        Horario.escapeHtml(t.nome) +
        " (" +
        Horario.escapeHtml(Horario.TURNO_LABEL[t.turno] || t.turno) +
        ")</option>"
      );
    })
    .join("");

  atualizarDisciplinasModal((alocacaoExistente && alocacaoExistente.disciplina) || "");
  atualizarProfessoresModal((alocacaoExistente && alocacaoExistente.professorId) || "");

  var btnExcluir = document.getElementById("btn-excluir-alocacao");
  if (btnExcluir) {
    btnExcluir.classList.toggle("hidden", !alocacaoExistente);
  }

  document.getElementById("aviso-disponibilidade").classList.add("hidden");
  document.getElementById("modal").classList.remove("hidden");
  validarDisponibilidade();
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

function atualizarDisciplinasModal(selecionada) {
  selecionada = selecionada || "";
  var disciplinas = Horario.getState().disciplinas;
  var sel = document.getElementById("modal-disciplina");
  sel.innerHTML = disciplinas.length
    ? '<option value="">Selecione...</option>' +
      disciplinas
        .map(function (d) {
          return (
            '<option value="' +
            Horario.escapeHtml(d.nome) +
            '" ' +
            (d.nome === selecionada ? "selected" : "") +
            ">" +
            Horario.escapeHtml(d.nome) +
            "</option>"
          );
        })
        .join("")
    : '<option value="">Nenhuma disciplina cadastrada</option>';
}

function atualizarProfessoresModal(selecionadoId) {
  selecionadoId = selecionadoId || "";
  var professores = Horario.getState().professores;
  var sel = document.getElementById("modal-professor");
  if (!professores.length) {
    sel.innerHTML = '<option value="">Nenhum professor carregado</option>';
    validarDisponibilidade();
    return;
  }
  sel.innerHTML =
    '<option value="">Selecione...</option>' +
    professores
      .map(function (p) {
        return (
          '<option value="' +
          p.id +
          '" ' +
          (String(p.id) === String(selecionadoId) ? "selected" : "") +
          ">" +
          Horario.escapeHtml(p.nome) +
          "</option>"
        );
      })
      .join("");
  validarDisponibilidade();
}

function validarDisponibilidade() {
  var aviso = document.getElementById("aviso-disponibilidade");
  var btn = document.getElementById("btn-salvar");
  var profId = document.getElementById("modal-professor").value;
  var disc = document.getElementById("modal-disciplina").value;
  var ctx = Horario.getModalCtx();

  if (!profId || !disc) {
    aviso.classList.add("hidden");
    btn.disabled = true;
    return;
  }

  var turmaId = document.getElementById("modal-turma").value || ctx.turmaId;
  var validacao = Horario.validarAlocacao(profId, ctx.dia, ctx.horario, turmaId, disc);

  aviso.classList.remove("hidden");
  if (validacao.valido) {
    aviso.className = "mt-4 text-sm p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200";
    aviso.innerHTML = '<i class="fas fa-check-circle mr-1"></i> ' + validacao.mensagem;
    btn.disabled = false;
  } else {
    aviso.className = "mt-4 text-sm p-3 rounded-lg bg-red-50 text-red-800 border border-red-200";
    aviso.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> ' + validacao.mensagem;
    btn.disabled = true;
  }
}

async function salvarAlocacao() {
  var ctx = Horario.getModalCtx();
  var turmaId = document.getElementById("modal-turma").value || ctx.turmaId;
  var disciplina = document.getElementById("modal-disciplina").value;
  var profId = document.getElementById("modal-professor").value;

  var btn = document.getElementById("btn-salvar");
  btn.disabled = true;

  var res = await Horario.salvarAlocacao(turmaId, ctx.dia, ctx.horario, disciplina, profId);
  btn.disabled = false;

  if (!res.ok) {
    alert(res.mensagem.replace(/<[^>]+>/g, ""));
    return;
  }

  fecharModal();
  document.getElementById("filtro-turma").value = turmaId;
  renderGrade();
  renderTurmas();
  renderLegenda();
  renderProfessores();
}

async function excluirAlocacaoModal() {
  var ctx = Horario.getModalCtx();
  var turmaId = document.getElementById("modal-turma").value || ctx.turmaId;
  var key = ctx.dia + "|" + ctx.horario;
  if (!confirm("Remover esta aula do horário?")) return;
  await Horario.removerAlocacao(turmaId, key);
  fecharModal();
  renderGrade();
  renderTurmas();
  renderLegenda();
  renderProfessores();
}
