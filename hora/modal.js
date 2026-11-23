// ==================== MODAL ====================
function abrirModal(dia, horario, turmaId) {
  Horario.setModalCtx(dia, horario, turmaId);
  const { turmas } = Horario.getState();
  const turma = turmas.find(t => t.id === turmaId);
  document.getElementById("modal-contexto").textContent =
    `${Horario.DIAS_LABEL[dia] || dia} • ${horario} • ${turma?.nome || ""}`;

  const selTurma = document.getElementById("modal-turma");
  selTurma.innerHTML = turmas.map(t =>
    `<option value="${t.id}" ${t.id === turmaId ? "selected" : ""}>${t.nome} (${t.turno})</option>`
  ).join("");

  atualizarDisciplinasModal();
  document.getElementById("aviso-disponibilidade").classList.add("hidden");
  document.getElementById("btn-salvar").disabled = true;
  document.getElementById("modal").classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

function atualizarDisciplinasModal() {
  const { disciplinas } = Horario.getState();
  const sel = document.getElementById("modal-disciplina");
  sel.innerHTML = disciplinas.length
    ? `<option value="">Selecione...</option>` + disciplinas.map(d =>
        `<option value="${d.nome}">${d.nome}</option>`
      ).join("")
    : `<option value="">Nenhuma disciplina cadastrada</option>`;
  atualizarProfessoresModal();
}

function atualizarProfessoresModal() {
  const { professores } = Horario.getState();
  const sel = document.getElementById("modal-professor");
  if (!professores.length) {
    sel.innerHTML = `<option value="">Nenhum professor carregado</option>`;
    validarDisponibilidade();
    return;
  }
  sel.innerHTML = `<option value="">Selecione...</option>` +
    professores.map(p => `<option value="${p.id}">${p.nome}</option>`).join("");
  validarDisponibilidade();
}

/**
 * Validação em tempo real no modal:
 * - Disponibilidade cadastrada (dias + horários)
 * - Choque: mesmo professor no mesmo dia/horário em outra turma
 */
function validarDisponibilidade() {
  const aviso = document.getElementById("aviso-disponibilidade");
  const btn = document.getElementById("btn-salvar");
  const profId = document.getElementById("modal-professor").value;
  const disc = document.getElementById("modal-disciplina").value;
  const ctx = Horario.getModalCtx();

  if (!profId || !disc) {
    aviso.classList.add("hidden");
    btn.disabled = true;
    return;
  }

  const turmaId = document.getElementById("modal-turma").value || ctx.turmaId;
  const validacao = Horario.validarAlocacao(profId, ctx.dia, ctx.horario, turmaId, disc);

  aviso.classList.remove("hidden");
  if (validacao.valido) {
    aviso.className = "mt-4 text-sm p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200";
    aviso.innerHTML = `<i class="fas fa-check-circle mr-1"></i> ${validacao.mensagem}`;
    btn.disabled = false;
  } else {
    aviso.className = "mt-4 text-sm p-3 rounded-lg bg-red-50 text-red-800 border border-red-200";
    aviso.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${validacao.mensagem}`;
    btn.disabled = true;
  }
}

function salvarAlocacao() {
  const ctx = Horario.getModalCtx();
  const turmaId = document.getElementById("modal-turma").value;
  const disciplina = document.getElementById("modal-disciplina").value;
  const profId = document.getElementById("modal-professor").value;

  const res = Horario.salvarAlocacao(turmaId, ctx.dia, ctx.horario, disciplina, profId);
  if (!res.ok) {
    alert(res.mensagem.replace(/<[^>]+>/g, ""));
    return;
  }

  fecharModal();
  document.getElementById("filtro-turma").value = turmaId;
  renderGrade();
}
