// ==================== DISCIPLINAS ====================
async function addDisciplina() {
  var input = document.getElementById("nova-disciplina");
  var chInput = document.getElementById("ch-disciplina");
  var nome = input.value.trim();
  var ch = chInput ? chInput.value : null;

  var res = await Horario.addDisciplina(nome, ch);
  if (!res.ok) return alert(res.erro);

  input.value = "";
  if (chInput) chInput.value = "";
  renderDisciplinas();
}

async function removerDisciplina(id) {
  if (!confirm("Remover esta disciplina?")) return;
  var res = await Horario.removerDisciplina(id);
  if (res && !res.ok && res.erro) alert(res.erro);
  renderDisciplinas();
}

function renderDisciplinas() {
  var disciplinas = Horario.getState().disciplinas;
  var ul = document.getElementById("lista-disciplinas");
  if (!ul) return;

  if (!disciplinas.length) {
    ul.innerHTML = '<li class="text-gray-400 text-sm text-center py-4">Nenhuma disciplina</li>';
    return;
  }

  ul.innerHTML = disciplinas
    .map(function (d) {
      return (
        '<li class="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-2.5 gap-2">' +
        '  <div class="min-w-0">' +
        '    <span class="font-medium text-gray-800 break-words">' + Horario.escapeHtml(d.nome) + '</span>' +
        (d.cargaHoraria ? '<span class="ml-2 text-xs text-gray-500">(' + d.cargaHoraria + 'h)</span>' : '') +
        '  </div>' +
        '  <button onclick="removerDisciplina(\'' + d.id + '\')" title="Remover disciplina" class="text-red-500 hover:text-red-700 p-1.5 flex-shrink-0">' +
        '    <i class="fas fa-times"></i>' +
        '  </button>' +
        '</li>'
      );
    })
    .join("");
}
