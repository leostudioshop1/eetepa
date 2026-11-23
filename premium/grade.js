// ==================== GRADE ====================
function atualizarFiltroTurma() {
  const { turmas } = Horario.getState();
  const sel = document.getElementById("filtro-turma");
  if (!sel) return;

  const atual = sel.value;
  sel.innerHTML = turmas.length
    ? turmas
        .map(
          (t) =>
            `<option value="${t.id}">${Horario.escapeHtml(t.nome)} (${Horario.escapeHtml(Horario.TURNO_LABEL[t.turno] || t.turno)})</option>`
        )
        .join("")
    : `<option value="">Nenhuma turma</option>`;

  if (atual && turmas.some((t) => t.id === atual)) {
    sel.value = atual;
  } else if (turmas.length) {
    sel.value = turmas[0].id;
  }

  atualizarResumoTurma();
  renderGrade();
}

function atualizarResumoTurma() {
  const el = document.getElementById("resumo-turma");
  const turmaId = document.getElementById("filtro-turma")?.value;
  if (!el) return;

  if (!turmaId) {
    el.textContent = "";
    return;
  }

  const stats = Horario.getEstatisticasTurma(turmaId);
  el.textContent = `Preenchimento: ${stats.alocadas}/${stats.total} aulas (${stats.percentual}%)`;
}

function renderGrade() {
  const { turmas, grade, professorDestacadoId } = Horario.getState();
  const turmaId = document.getElementById("filtro-turma")?.value;
  const tbody = document.getElementById("corpo-grade");
  if (!tbody) return;

  atualizarResumoTurma();

  if (!turmaId) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-400 py-12">Selecione ou cadastre uma turma</td></tr>`;
    return;
  }

  const turma = turmas.find((t) => t.id === turmaId);
  if (!turma) return;

  const horarios = Horario.getHorariosDoTurno(turma.turno);
  const alocacoes = grade[turmaId] || {};

  tbody.innerHTML = horarios
    .map(
      (h) => `
      <tr>
        <td class="border p-2.5 text-sm font-semibold bg-gray-50 text-gray-700 whitespace-nowrap text-center">${Horario.escapeHtml(h)}</td>
        ${Horario.DIAS.map((dia) => {
          const key = `${dia}|${h}`;
          const cell = alocacoes[key];
          if (cell) {
            const profAtual = Horario.getProfessorAtual(cell.professorId);
            const nomeProf = profAtual?.nome || cell.professorNome;
            const corProf = profAtual?.cor || cell.cor || "#4f46e5";
            const destacado = professorDestacadoId && String(cell.professorId) === String(professorDestacadoId);
            const apagado = professorDestacadoId && !destacado;

            return `
              <td class="border p-1 horario-cell cell-ocupada transition ${destacado ? "ring-2 ring-indigo-600" : ""} ${apagado ? "opacity-35" : ""}"
                  style="background:${Horario.escapeHtml(corProf)}22; border-left: 4px solid ${Horario.escapeHtml(corProf)}"
                  onclick="abrirModal('${dia}', '${h}', '${turmaId}')"
                  oncontextmenu="event.preventDefault(); removerAlocacao('${turmaId}', '${key}')">
                <div class="cell-content">
                  <div class="cell-disciplina">${Horario.escapeHtml(cell.disciplina)}</div>
                  <div class="cell-professor">${Horario.escapeHtml(nomeProf)}</div>
                </div>
              </td>
            `;
          }
          return `
            <td class="border p-1 horario-cell cell-livre"
                onclick="abrirModal('${dia}', '${h}', '${turmaId}')">
              <div class="h-14 flex items-center justify-center text-gray-300 hover:text-indigo-500 text-sm font-medium">+</div>
            </td>
          `;
        }).join("")}
      </tr>
    `
    )
    .join("");
}

async function limparGrade() {
  const turmaId = document.getElementById("filtro-turma")?.value;
  if (!turmaId) return;
  if (!confirm("Limpar todas as alocações desta turma no banco de dados?")) return;
  await Horario.limparGradeTurma(turmaId);
  renderGrade();
  renderTurmas();
  renderLegenda();
  renderProfessores();
}

async function removerAlocacao(turmaId, key) {
  if (!confirm("Remover esta alocação?")) return;
  await Horario.removerAlocacao(turmaId, key);
  renderGrade();
  renderTurmas();
  renderLegenda();
  renderProfessores();
}
