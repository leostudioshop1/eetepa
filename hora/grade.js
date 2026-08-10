// ==================== GRADE ====================
function atualizarFiltroTurma() {
  const { turmas } = Horario.getState();
  const sel = document.getElementById("filtro-turma");
  const atual = sel.value;
  sel.innerHTML = turmas.length
    ? turmas.map(t => `<option value="${t.id}">${t.nome} (${t.turno})</option>`).join("")
    : `<option value="">Nenhuma turma</option>`;
  if (atual && turmas.find(t => t.id === atual)) sel.value = atual;
  renderGrade();
}

function renderGrade() {
  const { turmas, grade } = Horario.getState();
  const turmaId = document.getElementById("filtro-turma").value;
  const tbody = document.getElementById("corpo-grade");
  if (!turmaId) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-400 py-12">Selecione ou cadastre uma turma</td></tr>`;
    return;
  }

  const turma = turmas.find(t => t.id === turmaId);
  if (!turma) return;

  const horarios = Horario.getHorariosDoTurno(turma.turno);
  const alocacoes = grade[turmaId] || {};

  tbody.innerHTML = horarios.map(h => `
    <tr>
      <td class="border p-2 text-sm font-medium bg-gray-50 whitespace-nowrap">${h}</td>
      ${Horario.DIAS.map(dia => {
        const key = `${dia}|${h}`;
        const cell = alocacoes[key];
        if (cell) {
          return `
            <td class="border p-1 horario-cell cell-ocupada" style="background:${cell.cor || '#4f46e5'}20"
                onclick="abrirModal('${dia}', '${h}', '${turmaId}')"
                oncontextmenu="event.preventDefault(); removerAlocacao('${turmaId}', '${key}')">
              <div class="p-2 rounded-lg text-center">
                <div class="font-semibold text-sm truncate">${cell.disciplina}</div>
                <div class="text-xs mt-1 opacity-80 truncate">${cell.professorNome}</div>
              </div>
            </td>
          `;
        }
        return `
          <td class="border p-1 horario-cell cell-livre"
              onclick="abrirModal('${dia}', '${h}', '${turmaId}')">
            <div class="h-14 flex items-center justify-center text-gray-300 text-xs">+</div>
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");
}

function limparGrade() {
  const turmaId = document.getElementById("filtro-turma").value;
  if (!turmaId) return;
  if (!confirm("Limpar todas as alocações desta turma?")) return;
  Horario.limparGradeTurma(turmaId);
  renderGrade();
}

function removerAlocacao(turmaId, key) {
  if (!confirm("Remover esta alocação?")) return;
  Horario.removerAlocacao(turmaId, key);
  renderGrade();
}
