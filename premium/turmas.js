// ==================== TURMAS ====================
function showTab(index) {
  for (let i = 0; i < 3; i++) {
    const tab = document.getElementById(`tab-${i}`);
    const btn = document.getElementById(`btn-tab-${i}`);
    if (tab) tab.classList.toggle("hidden", i !== index);
    if (btn) btn.classList.toggle("tab-active", i === index);
  }
}

async function addTurma() {
  const input = document.getElementById("nova-turma");
  const select = document.getElementById("turno-turma");
  const nome = input.value.trim();
  const turno = select.value;

  const res = await Horario.addTurma(nome, turno);
  if (!res.ok) return alert(res.erro);

  input.value = "";
  renderTurmas();
  atualizarFiltroTurma();
  if (res.turma) {
    document.getElementById("filtro-turma").value = res.turma.id;
    renderGrade();
  }
}

async function removerTurma(id) {
  if (!confirm("Remover esta turma e todas as aulas alocadas nela?")) return;
  const res = await Horario.removerTurma(id);
  if (res && !res.ok && res.erro) alert(res.erro);
  renderTurmas();
  atualizarFiltroTurma();
  renderLegenda();
  renderProfessores();
}

function renderTurmas() {
  const { turmas } = Horario.getState();
  const ul = document.getElementById("lista-turmas");
  if (!ul) return;

  if (!turmas.length) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4">Nenhuma turma cadastrada</li>`;
    return;
  }

  ul.innerHTML = turmas
    .map((t) => {
      const stats = Horario.getEstatisticasTurma(t.id);
      const turnoTexto = Horario.TURNO_LABEL[t.turno] || t.turno;
      return `
        <li class="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3">
          <div class="min-w-0 pr-2">
            <div class="font-medium text-gray-800 break-words">${Horario.escapeHtml(t.nome)}</div>
            <div class="text-xs text-gray-500 flex items-center flex-wrap gap-2 mt-1">
              <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">${Horario.escapeHtml(turnoTexto)}</span>
              <span>${stats.alocadas}/${stats.total} aulas (${stats.percentual}%)</span>
            </div>
          </div>
          <button onclick="removerTurma('${t.id}')" title="Remover turma" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
            <i class="fas fa-trash-alt"></i>
          </button>
        </li>
      `;
    })
    .join("");
}
