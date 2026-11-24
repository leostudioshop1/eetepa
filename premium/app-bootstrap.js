window.onload = async () => {
  ativarProtecoes();
  await verificarAutorizacao();
  if (isAuthorized) carregarDados();
};
