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
    aviso.innerHTML = `<span class="text-red-600">❌ Esse Horário a flor do campo não pode</span>`;
    btn.disabled = true;
  } else if (temConflito(professorNome, dia, horarioAtual)) {
    aviso.innerHTML = `<span class="text-red-600">⚠️ Professor já alocado neste dia/horário</span>`;
    btn.disabled = true;
  } else {
    aviso.innerHTML = `<span class="text-green-600">✅ Disponível para alocação</span>`;
    btn.disabled = false;
  }
}

function salvarAlocacao() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  const turma = document.getElementById("modal-turma").value;
  const disciplina = document.getElementById("modal-disciplina").value;
  const professorNome = document.getElementById("modal-professor").value;

  if (!turma || !disciplina || !professorNome) {
    alert("Preencha todos os campos.");
    return;
  }

  const [dia, hIndex] = currentCellId.split('-');
  const turmaObj = turmas.find(t => t.nome === turma);
  const horarioAtual = horariosPorTurno[turmaObj.turno][parseInt(hIndex)];

  if (temConflito(professorNome, dia, horarioAtual)) {
    alert("❌ Conflito detectado!");
    return;
  }

  const professor = professores.find(p => p.nome === professorNome);
  const key = `${turma}-${currentCellId}`;

  horariosAlocados[key] = {
    disciplina: disciplina,
    professor: professorNome,
    cor: professor ? professor.cor : '#6366f1',
    horario: horarioAtual,
    dia: dia
  };

  salvarDados();
  fecharModal();
  renderGrade();
  alert(`✅ Aula alocada com sucesso!`);
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
    return alert("Selecione pelo menos um dia e um horário de disponibilidade.");
  }

  professores.push({ nome, cor, disponibilidade });
  document.getElementById("nome-professor").value = "";
  salvarDados();
  renderAll();
  alert(`✅ Professor ${nome} adicionado com sucesso!`);
}

function deletarTurma(index) {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm(`Excluir a turma "${turmas[index].nome}"?`)) {
    const turmaNome = turmas[index].nome;
    Object.keys(horariosAlocados).forEach(key => {
      if (key.startsWith(turmaNome + "-")) delete horariosAlocados[key];
    });
    turmas.splice(index, 1);
    salvarDados();
    renderAll();
    updateFiltroTurma();
  }
}

function deletarDisciplina(index) {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm(`Excluir a disciplina "${disciplinasGerais[index]}"?`)) {
    disciplinasGerais.splice(index, 1);
    salvarDados();
    renderAll();
  }
}

function deletarProfessor(index) {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  if (confirm(`Excluir o professor "${professores[index].nome}"?`)) {
    const profNome = professores[index].nome;
    Object.keys(horariosAlocados).forEach(key => {
      if (horariosAlocados[key].professor === profNome) delete horariosAlocados[key];
    });
    professores.splice(index, 1);
    salvarDados();
    renderAll();
  }
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
