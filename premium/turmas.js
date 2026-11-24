// ==================== TURMAS ====================
function addTurma() {
  const nome = document.getElementById("nova-turma").value.trim();
  const turno = document.getElementById("turno-turma").value;
  const res = Horario.addTurma(nome, turno);
  if (!res.ok) return alert(res.erro);
  document.getElementById("nova-turma").value = "";
  renderTurmas();
  atualizarFiltroTurma();
}

function removerTurma(id) {
  if (!confirm("Remover esta turma?")) return;
  Horario.removerTurma(id);
  renderTurmas();
  atualizarFiltroTurma();
}

function renderTurmas() {
  const { turmas } = Horario.getState();
  const ul = document.getElementById("lista-turmas");
  if (!ul) return;
  if (!turmas.length) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4">Nenhuma turma cadastrada</li>`;
    return;
  }
  ul.innerHTML = turmas.map(t => `
    <li class="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3">
      <div>
        <div class="font-medium text-gray-800">${t.nome}</div>
        <div class="text-xs text-gray-500 uppercase">${t.turno}</div>
      </div>
      <button onclick="removerTurma('${t.id}')" class="text-red-500 hover:text-red-700 text-sm">
        <i class="fas fa-trash"></i>
      </button>
    </li>
  `).join("");
}
