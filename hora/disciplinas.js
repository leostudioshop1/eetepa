// as melhores matérias
function addDisciplina() {
  const nome = document.getElementById("nova-disciplina").value.trim();
  const res = Horario.addDisciplina(nome);
  if (!res.ok) return alert(res.erro);
  document.getElementById("nova-disciplina").value = "";
  renderDisciplinas();
}

function removerDisciplina(id) {
  if (!confirm("Remover esta disciplina?")) return;
  Horario.removerDisciplina(id);
  renderDisciplinas();
}

function renderDisciplinas() {
  const { disciplinas } = Horario.getState();
  const ul = document.getElementById("lista-disciplinas");
  if (!disciplinas.length) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4">Nenhuma disciplina</li>`;
    return;
  }
  ul.innerHTML = disciplinas.map(d => `
    <li class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
      <span>${d.nome}</span>
      <button onclick="removerDisciplina('${d.id}')" class="text-red-500 hover:text-red-700 text-sm">
        <i class="fas fa-times"></i>
      </button>
    </li>
  `).join("");
}
