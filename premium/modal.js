// ==================== MODAL ====================
function abrirModal(dia, horario, turmaId) {
  Horario.setModalCtx(dia, horario, turmaId);
  const { turmas, grade } = Horario.getState();
  const turma = turmas.find((t) => t.id === turmaId);
  const alocacaoExistente = grade[turmaId]?.[`${dia}|${horario}`] || null;

  document.getElementById("modal-title").textContent = alocacaoExistente ? "Editar / Remover Aula" : "Alocar Aula";
  document.getElementById("modal-contexto").textContent =
    `${Horario.DIAS_LABEL[dia] || dia} • ${horario} • ${turma?.nome || ""}`;

  const selTurma = document.getElementById("modal-turma");
  selTurma.innerHTML = turmas
    .map(
      (t) =>
        `<option value="${t.id}" ${t.id === turmaId ? "selected" : ""}>${Horario.escapeHtml(t.nome)} (${Horario.escapeHtml(Horario.TURNO_LABEL[t.turno] || t.turno)})</option>`
    )
    .join("");

  atualizarDisciplinasModal(alocacaoExistente?.disciplina || "");
  atualizarProfessoresModal(alocacaoExistente?.professorId || "");

  const btnExcluir = document.getElementById("btn-excluir-alocacao");
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

function atualizarDisciplinasModal(selecionada = "") {
  const { disciplinas } = Horario.getState();
  const sel = document.getElementById("modal-disciplina");
  sel.innerHTML = disciplinas.length
    ? `<option value="">Selecione...</option>` +
      disciplinas
        .map(
          (d) =>
            `<option value="${Horario.escapeHtml(d.nome)}" ${d.nome === selecionada ? "selected" : ""}>${Horario.escapeHtml(d.nome)}</option>`
        )
        .join("")
    : `<option value="">Nenhuma disciplina cadastrada</option>`;
}

function atualizarProfessoresModal(selecionadoId = "") {
  const { professores } = Horario.getState();
  const sel = document.getElementById("modal-professor");
  if (!professores.length) {
    sel.innerHTML = `<option value="">Nenhum professor carregado</option>`;
    validarDisponibilidade();
    return;
  }
  sel.innerHTML =
    `<option value="">Selecione...</option>` +
    professores
      .map(
        (p) =>
          `<option value="${p.id}" ${String(p.id) === String(selecionadoId) ? "selected" : ""}>${Horario.escapeHtml(p.nome)}</option>`
      )
      .join("");
  validarDisponibilidade();
}

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

async function salvarAlocacao() {
  const ctx = Horario.getModalCtx();
  const turmaId = document.getElementById("modal-turma").value || ctx.turmaId;
  const disciplina = document.getElementById("modal-disciplina").value;
  const profId = document.getElementById("modal-professor").value;

  const btn = document.getElementById("btn-salvar");
  btn.disabled = true;

  const res = await Horario.salvarAlocacao(turmaId, ctx.dia, ctx.horario, disciplina, profId);
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
  const ctx = Horario.getModalCtx();
  const turmaId = document.getElementById("modal-turma").value || ctx.turmaId;
  const key = `${ctx.dia}|${ctx.horario}`;
  if (!confirm("Remover esta aula do horário?")) return;
  await Horario.removerAlocacao(turmaId, key);
  fecharModal();
  renderGrade();
  renderTurmas();
  renderLegenda();
  renderProfessores();
}
