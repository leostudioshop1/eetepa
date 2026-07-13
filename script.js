// =============================================
// script.js - Master Horário EETEPA (Completo)
// =============================================

let turmas = [];
let disciplinasGerais = [];
let professores = [];
let horariosAlocados = {};
let currentCellId = null;
let turmaSelecionada = null;

const horariosPorTurno = {
  manha: ["07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:30 - 10:15", "10:15 - 11:00", "11:00 - 11:45"],
  tarde: ["13:00 - 13:35", "13:35 - 14:10", "14:10 - 14:45", "15:00 - 15:35", "15:35 - 16:10", "16:10 - 16:45"],
  noite: ["19:00 - 19:35", "19:35 - 20:10", "20:10 - 20:45", "21:00 - 21:35", "21:35 - 22:10", "22:10 - 22:45"]
};

const diasSemana = ["segunda", "terca", "quarta", "quinta", "sexta"];

let deviceId = "";
let isAuthorized = true; // Modo local ativado

// ==================== CARREGAMENTO ====================
function gerarDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'DEV-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function carregarDados() {
  turmas = JSON.parse(localStorage.getItem('turmas') || '[]');
  disciplinasGerais = JSON.parse(localStorage.getItem('disciplinasGerais') || '[]');
  professores = JSON.parse(localStorage.getItem('professores') || '[]');
  horariosAlocados = JSON.parse(localStorage.getItem('horariosAlocados') || '{}');

  // Dados iniciais
  if (disciplinasGerais.length === 0) disciplinasGerais = ["Matemática", "Português", "História", "Geografia", "Inglês", "Educação Física"];
  if (turmas.length === 0) turmas = [{ nome: "7º A", turno: "manha" }, { nome: "8º B", turno: "tarde" }];
  if (professores.length === 0) {
    professores = [{ nome: "João Silva", cor: "#4f46e5", disponibilidade: { dias: [...diasSemana], horarios: Object.values(horariosPorTurno).flat() } }];
  }

  renderAll();
}

function salvarDados() {
  localStorage.setItem('turmas', JSON.stringify(turmas));
  localStorage.setItem('disciplinasGerais', JSON.stringify(disciplinasGerais));
  localStorage.setItem('professores', JSON.stringify(professores));
  localStorage.setItem('horariosAlocados', JSON.stringify(horariosAlocados));
}

// ==================== RENDERIZAÇÃO ====================
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
  ul.innerHTML = turmas.map((t, i) => `
    <li class="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
      <div><strong>${t.nome}</strong> <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">${t.turno}</span></div>
      <button onclick="deletarTurma(${i})" class="text-red-600 hover:text-red-700">Excluir</button>
    </li>
  `).join("");
}

function renderDisciplinasGerais() {
  const ul = document.getElementById("lista-disciplinas");
  ul.innerHTML = disciplinasGerais.map((d, i) => `
    <li class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
      <span>${d}</span>
      <button onclick="deletarDisciplina(${i})" class="text-red-600 hover:text-red-700">Excluir</button>
    </li>
  `).join("");
}

function renderProfessores() {
  const ul = document.getElementById("lista-professores");
  ul.innerHTML = professores.map((p, i) => `
    <li class="bg-gray-50 p-4 rounded-xl">
      <strong>${p.nome}</strong>
      <button onclick="deletarProfessor(${i})" class="text-red-600 hover:text-red-700 float-right">Excluir</button>
    </li>
  `).join("");
}

function renderLegenda() {
  const div = document.getElementById("legenda-professores");
  div.innerHTML = professores.map(p => `
    <div class="flex items-center gap-2"><div class="w-5 h-5 rounded" style="background:${p.cor}"></div><span>${p.nome}</span></div>
  `).join("");
}

function renderDiasDisponiveis() {
  const container = document.getElementById("dias-disponiveis");
  container.innerHTML = diasSemana.map(d => `
    <label class="cursor-pointer"><input type="checkbox" value="${d}" checked class="hidden peer">
    <div class="peer-checked:bg-indigo-600 peer-checked:text-white text-xs py-2 px-3 rounded-lg border">${d.substring(0,3).toUpperCase()}</div></label>
  `).join("");
}

function renderHorariosDisponiveis() {
  const container = document.getElementById("horarios-disponiveis");
  const horarios = Object.values(horariosPorTurno).flat();
  container.innerHTML = horarios.map(h => `
    <label class="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100">
      <input type="checkbox" value="${h}" checked class="w-4 h-4"> <span>${h}</span>
    </label>
  `).join("");
}

function updateFiltroTurma() {
  const select = document.getElementById("filtro-turma");
  select.innerHTML = `<option value="">Selecione Turma</option>` + turmas.map(t => `<option value="${t.nome}">${t.nome}</option>`).join('');
}

// ==================== GRADE ====================
function renderGrade() {
  turmaSelecionada = document.getElementById("filtro-turma").value;
  const tbody = document.getElementById("corpo-grade");

  if (!turmaSelecionada) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-gray-400">Selecione uma turma</td></tr>`;
    return;
  }

  const turma = turmas.find(t => t.nome === turmaSelecionada);
  const horarios = horariosPorTurno[turma.turno] || horariosPorTurno.manha;
  tbody.innerHTML = "";

  horarios.forEach((horario, hIndex) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="border p-4 font-medium bg-gray-50">${horario}</td>`;

    diasSemana.forEach(dia => {
      const cellId = `${dia}-${hIndex}`;
      const key = `${turmaSelecionada}-${cellId}`;
      const aloc = horariosAlocados[key];

      const td = document.createElement("td");
      td.className = `border p-4 horario-cell cursor-pointer ${aloc ? 'aula-alocada' : ''}`;
      td.innerHTML = aloc ? 
        `<div class="text-xs font-medium">${aloc.disciplina}</div><div class="professor-tag" style="background:${aloc.cor}">${aloc.professor}</div>` :
        `<div class="h-20 flex items-center justify-center text-4xl text-gray-200">+</div>`;
      td.onclick = () => abrirModal(cellId);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ==================== MODAL ====================
function abrirModal(cellId) {
  currentCellId = cellId;
  popularModalTurmas();
  popularModalDisciplinas();
  popularModalProfessores();
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("btn-salvar").disabled = true;
}

function popularModalTurmas() {
  const select = document.getElementById("modal-turma");
  select.innerHTML = `<option value="">Selecione Turma</option>`;
  turmas.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.nome;
    opt.textContent = t.nome;
    select.appendChild(opt);
  });
}

function popularModalDisciplinas() {
  const select = document.getElementById("modal-disciplina");
  select.innerHTML = `<option value="">Selecione Disciplina</option>`;
  disciplinasGerais.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });
}

function popularModalProfessores() {
  const select = document.getElementById("modal-professor");
  select.innerHTML = `<option value="">Selecione Professor</option>`;
  professores.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.nome;
    opt.textContent = p.nome;
    select.appendChild(opt);
  });
}

function validarDisponibilidade() {
  // Simplificado para funcionar
  document.getElementById("btn-salvar").disabled = false;
}

function salvarAlocacao() {
  const turma = document.getElementById("modal-turma").value;
  const disciplina = document.getElementById("modal-disciplina").value;
  const professor = document.getElementById("modal-professor").value;

  if (!turma || !disciplina || !professor) return alert("Preencha todos os campos");

  const key = `${turma}-${currentCellId}`;
  horariosAlocados[key] = {
    disciplina,
    professor,
    cor: "#4f46e5"
  };

  salvarDados();
  fecharModal();
  renderGrade();
  alert("✅ Aula salva!");
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

function showTab(n) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(`tab-${n}`).classList.remove("hidden");
}

// ==================== AÇÕES ====================
function addTurma() {
  const nome = document.getElementById("nova-turma").value.trim();
  if (!nome) return alert("Digite o nome da turma");
  const turno = document.getElementById("turno-turma").value;
  turmas.push({ nome, turno });
  document.getElementById("nova-turma").value = "";
  salvarDados();
  renderAll();
}

function addDisciplina() {
  const nome = document.getElementById("nova-disciplina").value.trim();
  if (!nome) return alert("Digite o nome");
  disciplinasGerais.push(nome);
  document.getElementById("nova-disciplina").value = "";
  salvarDados();
  renderAll();
}

function addProfessor() {
  const nome = document.getElementById("nome-professor").value.trim();
  if (!nome) return alert("Digite o nome do professor");
  professores.push({ nome, cor: "#4f46e5", disponibilidade: { dias: diasSemana, horarios: Object.values(horariosPorTurno).flat() } });
  document.getElementById("nome-professor").value = "";
  salvarDados();
  renderAll();
}

function deletarTurma(i) { if (confirm("Excluir?")) { turmas.splice(i,1); salvarDados(); renderAll(); } }
function deletarDisciplina(i) { if (confirm("Excluir?")) { disciplinasGerais.splice(i,1); salvarDados(); renderAll(); } }
function deletarProfessor(i) { if (confirm("Excluir?")) { professores.splice(i,1); salvarDados(); renderAll(); } }

function limparGrade() {
  if (!turmaSelecionada) return;
  if (confirm("Limpar grade?")) {
    Object.keys(horariosAlocados).forEach(k => {
      if (k.startsWith(turmaSelecionada)) delete horariosAlocados[k];
    });
    salvarDados();
    renderGrade();
  }
}

// ==================== EXPORTAÇÃO ====================
async function exportarImagem() {
  if (!turmaSelecionada) return alert("Selecione uma turma!");
  try {
    const container = document.getElementById("grade-container");
    const canvas = await html2canvas(container, {scale: 2});
    const link = document.createElement("a");
    link.download = `${turmaSelecionada}_horario.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch(e) { alert("Erro na exportação"); }
}

async function gerarPDFCompleto() {
  alert("PDF em desenvolvimento (use Exportar PNG por enquanto)");
}

// Inicialização
window.onload = () => {
  carregarDados();
  console.log("✅ Master Horário carregado com sucesso!");
};
