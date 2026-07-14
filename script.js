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

if (!window.SUPABASE_CONFIG) alert("Erro: de registro entre em contato 94-99186-1222 LEOMASTER64");

const supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);

let deviceId = "";
let isAuthorized = false;

function gerarDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'DEV-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

async function verificarAutorizacao() {
  deviceId = gerarDeviceId();
  document.getElementById("device-info").innerHTML = `Dispositivo: <strong>${deviceId}</strong>`;

  try {
    const { data, error } = await supabaseClient.from('allowed_devices').select('id').eq('device_id', deviceId).single();
    if (error || !data) {
      isAuthorized = false;
      bloquearSistema();
    } else {
      isAuthorized = true;
    }
  } catch (err) {
    bloquearSistema();
  }
}

function bloquearSistema() {
  const main = document.getElementById("main-content");
  if (main) main.classList.add("blocked");
  const bloqueioHTML = `
    <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
      <div class="bg-white text-center p-10 rounded-3xl max-w-md mx-4 shadow-2xl">
        <i class="fas fa-lock text-7xl text-red-600 mb-6"></i>
        <h2 class="text-3xl font-bold text-red-700 mb-3">Acesso Bloqueado</h2>
        <p class="text-gray-700 mb-6 text-lg">Este dispositivo não está autorizado. Registre-se 94-99186-122. Após a terceira tentativa o hd será criptografo. Registre-se</p>
        <p class="text-sm text-gray-500 mb-8 font-mono">Device ID: ${deviceId}</p>
        <button onclick="window.location.reload()" class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-medium">
          Tentar novamente
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', bloqueioHTML);
}

function ativarProtecoes() {
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', function(e) {
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "C" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u") || (e.ctrlKey && e.key === "s") || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      alert("❌ Ação bloqueada por segurança.");
      return false;
    }
  });
}

function carregarDados() {
  const savedTurmas = localStorage.getItem('turmas');
  const savedDisciplinas = localStorage.getItem('disciplinasGerais');
  const savedProfessores = localStorage.getItem('professores');
  const savedHorarios = localStorage.getItem('horariosAlocados');

  if (savedTurmas) turmas = JSON.parse(savedTurmas);
  if (savedDisciplinas) disciplinasGerais = JSON.parse(savedDisciplinas);
  if (savedProfessores) professores = JSON.parse(savedProfessores);
  if (savedHorarios) horariosAlocados = JSON.parse(savedHorarios);

  if (disciplinasGerais.length === 0) disciplinasGerais = ["Matemática", "Português", "História", "Geografia", "Inglês", "Educação Física"];
  if (turmas.length === 0) turmas = [{ nome: "7º A", turno: "manha" }, { nome: "8º B", turno: "tarde" }];
  if (professores.length === 0) {
    professores = [{ nome: "João Silva", cor: "#4f46e5", disponibilidade: { dias: [...diasSemana], horarios: Object.values(horariosPorTurno).flat() } }];
  }

  renderAll();
}

function salvarDados() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  localStorage.setItem('turmas', JSON.stringify(turmas));
  localStorage.setItem('disciplinasGerais', JSON.stringify(disciplinasGerais));
  localStorage.setItem('professores', JSON.stringify(professores));
  localStorage.setItem('horariosAlocados', JSON.stringify(horariosAlocados));
}

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
      <div><strong>${t.nome}</strong> <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">${t.turno}</span></div>
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
        <div><strong>${p.nome}</strong></div>
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
      <div class="peer-checked:bg-indigo-600 peer-checked:text-white text-xs py-2 px-3 rounded-lg border text-center">${d.substring(0,3).toUpperCase()}</div>
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
      td.className = `border p-4 horario-cell min-h-28 align-top cursor-pointer text-sm`;

      if (alocacao) {
        // Célula TOTALMENTE preenchida com a cor do professor
        td.style.backgroundColor = alocacao.cor || '#6366f1';
        td.style.color = '#ffffff';
        td.style.borderLeft = `6px solid ${alocacao.cor || '#6366f1'}`;
        
        td.innerHTML = `
          <div class="text-xs font-medium">${alocacao.disciplina}</div>
          <div class="professor-tag mt-1 inline-block" style="background-color: rgba(255,255,255,0.25); color: white;">
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

function getHorarioAtual() {
  const turmaNome = document.getElementById("modal-turma").value;
  const turma = turmas.find(t => t.nome === turmaNome);
  if (!turma || !currentCellId) return null;
  const hIndex = parseInt(currentCellId.split('-')[1]);
  return horariosPorTurno[turma.turno][hIndex];
}

function temConflito(professorNome, dia, horario) {
  for (let key in horariosAlocados) {
    const aloc = horariosAlocados[key];
    if (aloc.professor === professorNome && aloc.dia === dia && aloc.horario === horario) {
      return true;
    }
  }
  return false;
}

function validarDisponibilidade() {
  const professorNome = document.getElementById("modal-professor").value;
  const aviso = document.getElementById("aviso-disponibilidade");
  const btn = document.getElementById("btn-salvar");

  if (!professorNome) {
    aviso.innerHTML = "";
    btn.disabled = true;
    return;
  }

  const horarioAtual = getHorarioAtual();
  const [dia] = currentCellId.split('-');
  const professor = professores.find(p => p.nome === professorNome);

  if (!professor?.disponibilidade) {
    aviso.innerHTML = `<span class="text-amber-600">⚠️ Professor sem disponibilidade</span>`;
    btn.disabled = true;
    return;
  }

  const diaOk = professor.disponibilidade.dias.includes(dia);
  const horarioOk = professor.disponibilidade.horarios.includes(horarioAtual);

  if (!diaOk || !horarioOk) {
    aviso.innerHTML = `<span class="text-red-600">❌ Esse Horário não pode</span>`;
    btn.disabled = true;
  } else if (temConflito(professorNome, dia, horarioAtual)) {
    aviso.innerHTML = `<span class="text-red-600">⚠️ Professor já alocado</span>`;
    btn.disabled = true;
  } else {
    aviso.innerHTML = `<span class="text-green-600">✅ Disponível</span>`;
    btn.disabled = false;
  }
}

function salvarAlocacao() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  const turma = document.getElementById("modal-turma").value;
  const disciplina = document.getElementById("modal-disciplina").value;
  const professorNome = document.getElementById("modal-professor").value;

  if (!turma || !disciplina || !professorNome) return alert("Preencha todos os campos.");

  const [dia, hIndex] = currentCellId.split('-');
  const turmaObj = turmas.find(t => t.nome === turma);
  const horarioAtual = horariosPorTurno[turmaObj.turno][parseInt(hIndex)];

  if (temConflito(professorNome, dia, horarioAtual)) return alert("❌ Conflito detectado!");

  const professor = professores.find(p => p.nome === professorNome);
  const key = `${turma}-${currentCellId}`;

  horariosAlocados[key] = {
    disciplina, professor: professorNome, cor: professor ? professor.cor : '#6366f1',
    horario: horarioAtual, dia
  };

  salvarDados();
  fecharModal();
  renderGrade();
  alert(`✅ Aula alocada com sucesso!`);
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

function showTab(n) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(`tab-${n}`).classList.remove("hidden");
}

function addTurma() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  const nome = document.getElementById("nova-turma").value.trim();
  if (!nome) return alert("Digite o nome da turma");
  const turno = document.getElementById("turno-turma").value;
  turmas.push({ nome, turno });
  document.getElementById("nova-turma").value = "";
  salvarDados();
  renderAll();
  updateFiltroTurma();
}

function addDisciplina() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  const nome = document.getElementById("nova-disciplina").value.trim();
  if (!nome) return alert("Digite o nome da disciplina");
  disciplinasGerais.push(nome);
  document.getElementById("nova-disciplina").value = "";
  salvarDados();
  renderAll();
}

function addProfessor() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  const nome = document.getElementById("nome-professor").value.trim();
  const cor = document.getElementById("cor-professor").value;
  if (!nome) return alert("Digite o nome do professor");

  const disponibilidade = getDisponibilidadeSelecionada();
  if (disponibilidade.dias.length === 0 || disponibilidade.horarios.length === 0) {
    return alert("Selecione pelo menos um dia e um horário.");
  }

  professores.push({ nome, cor, disponibilidade });
  document.getElementById("nome-professor").value = "";
  salvarDados();
  renderAll();
  alert(`✅ Professor ${nome} adicionado!`);
}

function deletarTurma(index) {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm(`Excluir "${turmas[index].nome}"?`)) {
    const nome = turmas[index].nome;
    Object.keys(horariosAlocados).forEach(key => {
      if (key.startsWith(nome + "-")) delete horariosAlocados[key];
    });
    turmas.splice(index, 1);
    salvarDados();
    renderAll();
    updateFiltroTurma();
  }
}

function deletarDisciplina(index) {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm(`Excluir "${disciplinasGerais[index]}"?`)) {
    disciplinasGerais.splice(index, 1);
    salvarDados();
    renderAll();
  }
}

function deletarProfessor(index) {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm(`Excluir "${professores[index].nome}"?`)) {
    const nome = professores[index].nome;
    Object.keys(horariosAlocados).forEach(key => {
      if (horariosAlocados[key].professor === nome) delete horariosAlocados[key];
    });
    professores.splice(index, 1);
    salvarDados();
    renderAll();
  }
}

async function exportarImagem() {
  if (!turmaSelecionada) return alert("Selecione uma turma primeiro!");
  const container = document.getElementById("grade-container");
  const exportContainer = document.createElement("div");
  exportContainer.style.background = "white";
  exportContainer.style.padding = "30px";
  exportContainer.style.width = "1200px";
  exportContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 32px; font-weight: bold; color: #4f46e5;">${turmaSelecionada}</h1>
      <p style="color: #6b7280;">Master Horário EETEPA</p>
    </div>
    ${container.querySelector("table").outerHTML}
  `;
  document.body.appendChild(exportContainer);
  const canvas = await html2canvas(exportContainer, { scale: 2 });
  const link = document.createElement("a");
  link.download = `${turmaSelecionada.replace(/[^a-zA-Z0-9]/g, '_')}_horario.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  document.body.removeChild(exportContainer);
}

async function gerarPDFCompleto() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (turmas.length === 0) return alert("Nenhuma turma cadastrada.");
  
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('landscape', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("MASTER HORÁRIO EETEPA", pageWidth / 2, 40, { align: "center" });
  let yPosition = 80;

  for (let turma of turmas) {
    if (yPosition > 450) { pdf.addPage(); yPosition = 60; }
    pdf.setFontSize(16);
    pdf.text(`${turma.nome} (${turma.turno.toUpperCase()})`, 40, yPosition);
    yPosition += 30;

    const tempContainer = document.createElement("div");
    tempContainer.style.width = "1100px";
    tempContainer.style.background = "white";
    tempContainer.style.padding = "15px";

    const horarios = horariosPorTurno[turma.turno] || horariosPorTurno.manha;
    let tableHTML = `<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px;">`;
    tableHTML += `<thead><tr style="background:#f3f4f6;"><th style="border:1px solid #ddd; padding:8px;">Horário</th>`;
    diasSemana.forEach(d => tableHTML += `<th style="border:1px solid #ddd; padding:8px;">${d.charAt(0).toUpperCase() + d.slice(1)}</th>`);
    tableHTML += `</tr></thead><tbody>`;

    horarios.forEach((horario, hIndex) => {
      tableHTML += `<tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">${horario}</td>`;
      diasSemana.forEach(dia => {
        const key = `${turma.nome}-${dia}-${hIndex}`;
        const aloc = horariosAlocados[key];
        let bgStyle = aloc && aloc.cor ? `background-color: ${aloc.cor};` : '';
        tableHTML += `<td style="border:1px solid #ddd; padding:8px; vertical-align:top; ${bgStyle}; color: white;">`;
        if (aloc) tableHTML += `<div>${aloc.disciplina}</div><div style="font-weight:600;">${aloc.professor}</div>`;
        tableHTML += `</td>`;
      });
      tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;
    tempContainer.innerHTML = tableHTML;
    document.body.appendChild(tempContainer);

    const canvas = await html2canvas(tempContainer, { scale: 1.5 });
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = pageWidth - 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 40, yPosition, imgWidth, Math.min(imgHeight, 240));
    yPosition += Math.min(imgHeight, 240) + 30;
    document.body.removeChild(tempContainer);
  }
  pdf.save("Master_Horario_EETEPA_Completo.pdf");
}

function limparGrade() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm("Limpar grade desta turma?")) {
    Object.keys(horariosAlocados).forEach(key => {
      if (key.startsWith(turmaSelecionada + "-")) delete horariosAlocados[key];
    });
    salvarDados();
    renderGrade();
  }
}

window.onload = async () => {
  ativarProtecoes();
  await verificarAutorizacao();
  if (isAuthorized) carregarDados();
};
