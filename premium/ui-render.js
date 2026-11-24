function renderAll() {
  renderTurmas();
  renderDisciplinasGerais();
  renderProfessores();
  renderLegenda();
  renderDiasDisponiveis();
  renderHorariosDisponiveis();
  updateFiltroTurma();
  showTab(0);
}

function renderTurmas() {
  const ul = document.getElementById("lista-turmas");
  ul.innerHTML = turmas.map((t, index) => `
    <li class="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
      <div>
        <strong>${t.nome}</strong>
        <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">${t.turno}</span>
      </div>
      <button onclick="deletarTurma(${index})" class="text-red-600 hover:text-red-700 px-3 py-1 text-sm font-medium rounded hover:bg-red-50">Excluir</button>
    </li>
  `).join("");
}

function renderDisciplinasGerais() {
  const ul = document.getElementById("lista-disciplinas");
  ul.innerHTML = disciplinasGerais.map((d, index) => `
    <li class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
      <span>${d}</span>
      <button onclick="deletarDisciplina(${index})" class="text-red-600 hover:text-red-700 px-3 py-1 text-sm font-medium rounded hover:bg-red-50">Excluir</button>
    </li>
  `).join("");
}

function renderProfessores() {
  const ul = document.getElementById("lista-professores");
  ul.innerHTML = professores.map((p, index) => `
    <li class="bg-gray-50 p-4 rounded-xl">
      <div class="flex justify-between items-start">
        <div>
          <strong>${p.nome}</strong>
          <div class="flex flex-wrap gap-1 mt-2">
            ${p.disponibilidade ? p.disponibilidade.dias.map(d => `<span class="disponibilidade-tag bg-indigo-100 text-indigo-700">${d.substring(0, 3).toUpperCase()}</span>`).join('') : ''}
          </div>
        </div>
        <button onclick="deletarProfessor(${index})" class="text-red-600 hover:text-red-700 px-3 py-1 text-sm font-medium rounded hover:bg-red-50">Excluir</button>
      </div>
    </li>
  `).join("");
}

function renderLegenda() {
  const div = document.getElementById("legenda-professores");
  div.innerHTML = professores.map(p => `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded" style="background-color:${p.cor || '#4f46e5'}"></div><span>${p.nome}</span></div>`).join("");
}

function renderDiasDisponiveis() {
  const container = document.getElementById("dias-disponiveis");
  container.innerHTML = diasSemana.map(d => `
    <label class="cursor-pointer">
      <input type="checkbox" value="${d}" checked class="hidden peer">
      <div class="peer-checked:bg-indigo-600 peer-checked:text-white text-xs py-2 px-3 rounded-lg border text-center">${d.substring(0, 3).toUpperCase()}</div>
    </label>
  `).join("");
}

function renderHorariosDisponiveis() {
  const container = document.getElementById("horarios-disponiveis");
  const horariosFixos = Object.values(horariosPorTurno).flat();
  container.innerHTML = horariosFixos.map(h => `
    <label class="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100">
      <input type="checkbox" value="${h}" checked class="w-4 h-4">
      <span class="text-sm">${h}</span>
    </label>
  `).join("");
}

function getDisponibilidadeSelecionada() {
  const dias = Array.from(document.querySelectorAll('#dias-disponiveis input:checked')).map(cb => cb.value);
  const horarios = Array.from(document.querySelectorAll('#horarios-disponiveis input:checked')).map(cb => cb.value);
  return { dias, horarios };
}

function updateFiltroTurma() {
  const select = document.getElementById("filtro-turma");
  select.innerHTML = `<option value="">Selecione Turma</option>` + turmas.map(t => `<option value="${t.nome}">${t.nome} (${t.turno})</option>`).join('');
}

function renderGrade() {
  turmaSelecionada = document.getElementById("filtro-turma").value;
  const tbody = document.getElementById("corpo-grade");

  if (!turmaSelecionada) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-gray-400">Selecione uma turma para ver a grade</td></tr>`;
    return;
  }

  const turma = turmas.find(t => t.nome === turmaSelecionada);
  if (!turma) return;

  const horariosDoTurno = horariosPorTurno[turma.turno] || horariosPorTurno.manha;
  tbody.innerHTML = "";

  horariosDoTurno.forEach((horario, hIndex) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="border p-4 font-medium bg-gray-50">${horario}</td>`;

    diasSemana.forEach(dia => {
      const cellId = `${dia}-${hIndex}`;
      const key = `${turmaSelecionada}-${cellId}`;
      const alocacao = horariosAlocados[key];

      const td = document.createElement("td");
      td.className = `border p-4 horario-cell min-h-28 align-top cursor-pointer text-sm ${alocacao ? 'aula-alocada' : ''}`;

      if (alocacao) {
        td.innerHTML = `
          <div class="text-xs font-medium break-words">${alocacao.disciplina}</div>
          <div class="professor-tag mt-1 inline-block" style="background-color: ${alocacao.cor || '#6366f1'}; color: white;">
            ${alocacao.professor}
          </div>
        `;
      } else {
        td.innerHTML = `<div class="h-20 flex items-center justify-center text-4xl text-gray-200 hover:text-gray-400">+</div>`;
      }

      td.onclick = () => abrirModal(cellId);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function abrirModal(cellId) {
  if (!isAuthorized) return;
  currentCellId = cellId;
  popularModalTurmas();
  popularModalDisciplinas();
  popularModalProfessores();
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("btn-salvar").disabled = true;
  document.getElementById("aviso-disponibilidade").innerHTML = "";
}

function popularModalTurmas() {
  const select = document.getElementById("modal-turma");
  select.innerHTML = `<option value="">Selecione uma Turma</option>`;
  turmas.forEach(turma => {
    const opt = document.createElement("option");
    opt.value = turma.nome;
    opt.textContent = `${turma.nome} (${turma.turno})`;
    select.appendChild(opt);
  });
  if (turmaSelecionada) select.value = turmaSelecionada;
}

function popularModalDisciplinas() {
  const select = document.getElementById("modal-disciplina");
  select.innerHTML = `<option value="">Selecione uma Disciplina</option>`;
  disciplinasGerais.forEach(disc => {
    const opt = document.createElement("option");
    opt.value = disc;
    opt.textContent = disc;
    select.appendChild(opt);
  });
}

function popularModalProfessores() {
  const select = document.getElementById("modal-professor");
  select.innerHTML = `<option value="">Selecione um Professor</option>`;
  professores.forEach(prof => {
    const opt = document.createElement("option");
    opt.value = prof.nome;
    opt.textContent = prof.nome;
    select.appendChild(opt);
  });
}

function atualizarDisciplinasModal() { popularModalDisciplinas(); }
function atualizarProfessoresModal() { popularModalProfessores(); }

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

function showTab(n) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(`tab-${n}`).classList.remove("hidden");
}
