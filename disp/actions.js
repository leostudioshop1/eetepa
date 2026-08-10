function toggleDia(dia, checked) {
  document.querySelectorAll(`.disponibilidade-check[data-dia="${dia}"]`).forEach(cb => {
    cb.checked = checked;
  });
}

function selecionarTodos() {
  document.querySelectorAll('.disponibilidade-check').forEach(cb => cb.checked = true);
  document.querySelectorAll('#disponibilidade-matrix input[type="checkbox"]').forEach(cb => {
    if (!cb.classList.contains('disponibilidade-check')) cb.checked = true;
  });
}

function limparTodos() {
  document.querySelectorAll('.disponibilidade-check').forEach(cb => cb.checked = false);
  document.querySelectorAll('#disponibilidade-matrix input[type="checkbox"]').forEach(cb => {
    if (!cb.classList.contains('disponibilidade-check')) cb.checked = false;
  });
}
