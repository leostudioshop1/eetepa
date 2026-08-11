async function exportarImagem() {
  const el = document.getElementById("grade-horarios");
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = `horario_${new Date().toISOString().slice(0,10)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function gerarPDFCompleto() {
  const { turmas } = Horario.getState();
  if (!turmas.length) return alert("Nenhuma turma cadastrada.");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "pt", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < turmas.length; i++) {
    if (i > 0) pdf.addPage();
    const t = turmas[i];
    document.getElementById("filtro-turma").value = t.id;
    renderGrade();
    await new Promise(r => setTimeout(r, 100));

    const canvas = await html2canvas(document.getElementById("grade-horarios"), {
      scale: 1.5, backgroundColor: "#ffffff"
    });
    const img = canvas.toDataURL("image/png");
    const imgW = pageW - 40;
    const imgH = (canvas.height * imgW) / canvas.width;

    pdf.setFontSize(16);
    pdf.text(`${t.nome} — ${t.turno.toUpperCase()}`, 20, 30);
    pdf.addImage(img, "PNG", 20, 45, imgW, Math.min(imgH, pageH - 70));
  }

  renderGrade();
  pdf.save(`Horarios_Completos_EETEPA.pdf`);
}
// agora vai iniciar, tenhamos fé
function init() {
  document.getElementById("device-info").textContent =
    `${navigator.platform || ""} • ${new Date().toLocaleDateString("pt-BR")}`;

  // Registrar o tempo de uso
  DispositivoTracker.iniciar();

  renderTurmas();
  renderDisciplinas();
  atualizarFiltroTurma();
  carregarProfessores();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
