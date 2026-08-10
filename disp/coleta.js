function coletarDisponibilidade() {
  const disponibilidade = {};
  diasSemana.forEach(dia => {
    disponibilidade[dia] = [];
  });

  document.querySelectorAll('.disponibilidade-check:checked').forEach(cb => {
    const dia = cb.dataset.dia;
    const horario = cb.dataset.horario;
    if (disponibilidade[dia]) {
      disponibilidade[dia].push(horario);
    }
  });

  // Remove dias sem nenhum horário marcado
  Object.keys(disponibilidade).forEach(dia => {
    if (disponibilidade[dia].length === 0) {
      delete disponibilidade[dia];
    }
  });

  return disponibilidade;
}
