// ==================== TURMAS ====================
function showTab(index) {
  for (var i = 0; i < 3; i++) {
    var tab = document.getElementById("tab-" + i);
    var btn = document.getElementById("btn-tab-" + i);
    if (tab) tab.classList.toggle("hidden", i !== index);
    if (btn) btn.classList.toggle("tab-active", i === index);
  }
}

async function addTurma() {
  var input = document.getElementById("nova-turma");
  var select = document.getElementById("turno-turma");
  var nome = input.value.trim();
  var turno = select.value;

  var res = await Horario.addTurma(nome, turno);
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
  var res = await Horario.removerTurma(id);
  if (res && !res.ok && res.erro) alert(res.erro);
  renderTurmas();
  atualizarFiltroTurma();
  renderLegenda();
  renderProfessores();
}

function renderTurmas() {
  var turmas = Horario.getState().turmas;
  var ul = document.getElementById("lista-turmas");
  if (!ul) return;

  if (!turmas.length) {
    ul.innerHTML = '<li class="text-gray-400 text-sm text-center py-4">Nenhuma turma cadastrada</li>';
    return;
  }

  ul.innerHTML = turmas
    .map(function (t) {
      var stats = Horario.getEstatisticasTurma(t.id);
      var turnoTexto = Horario.TURNO_LABEL[t.turno] || t.turno;
      return (
        '<li class="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3">' +
        '  <div class="min-w-0 pr-2">' +
        '    <div class="font-medium text-gray-800 break-words">' + Horario.escapeHtml(t.nome) + '</div>' +
        '    <div class="text-xs text-gray-500 flex items-center flex-wrap gap-2 mt-1">' +
        '      <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">' + Horario.escapeHtml(turnoTexto) + '</span>' +
        '      <span>' + stats.alocadas + '/' + stats.total + ' aulas (' + stats.percentual + '%)</span>' +
        '    </div>' +
        '  </div>' +
        '  <button onclick="removerTurma(\'' + t.id + '\')" title="Remover turma" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">' +
        '    <i class="fas fa-trash-alt"></i>' +
        '  </button>' +
        '</li>'
      );
    })
    .join("");
}
