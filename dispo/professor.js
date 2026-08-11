async function cadastrarProfessor() {
  if (!supabaseClient) {
    return alert("❌ Configuração. Não é possível cadastrar.");
  }

  const nome = document.getElementById("nome").value.trim();
  const cor = document.getElementById("cor").value;

  if (!nome) return alert("❌ Digite o nome do professor");

  const disponibilidade = coletarDisponibilidade();
  const totalSelecionados = Object.values(disponibilidade).reduce((acc, arr) => acc + arr.length, 0);

  if (totalSelecionados === 0) {
    return alert("❌ Selecione pelo menos um horário em algum dia da semana");
  }

  const professor = {
    nome,
    cor,
    disponibilidade,
    criado_em: new Date().toISOString()
  };

  const { error } = await supabaseClient.from('professores').insert([professor]);

  if (error) {
    alert("Erro ao cadastrar: " + error.message);
  } else {
    alert(`✅ Professor ${nome} cadastrado com sucesso!`);
    document.getElementById("nome").value = "";
    carregarProfessores();
  }
}
