// ==================== EXPORTAÇÃO ====================
function prepararTabelaParaExportacao(ativar) {
  const tabela = document.getElementById("grade-horarios");
  if (!tabela) return;

  const textos = tabela.querySelectorAll(".texto-celula");
  const celulas = tabela.querySelectorAll(".horario-cell");

  if (ativar) {
    tabela.style.width = "1120px";
    tabela.style.tableLayout = "fixed";
    textos.forEach((el) => {
      el.classList.remove("truncate");
      el.style.whiteSpace = "normal";
      el.style.overflow = "visible";
      el.style.textOverflow = "clip";
      el.style.wordBreak = "break-word";
      el.style.lineHeight = "1.35";
      el.style.paddingBottom = "2px";
    });
    celulas.forEach((td) => {
      td.style.height = "auto";
      td.style.verticalAlign = "middle";
    });
  } else {
    tabela.style.width = "";
    tabela.style.tableLayout = "";
    textos.forEach((el) => {
      el.classList.add("truncate");
      el.style.whiteSpace = "";
      el.style.overflow = "";
      el.style.textOverflow = "";
      el.style.wordBreak = "";
      el.style.lineHeight = "";
      el.style.paddingBottom = "";
    });
    celulas.forEach((td) => {
      td.style.height = "";
      td.style.verticalAlign = "";
    });
  }
}

async function exportarImagem() {
  const el = document.getElementById("grade-horarios");
  prepararTabelaParaExportacao(true);
  await new Promise((r) => setTimeout(r, 80));

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `horario_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    prepararTabelaParaExportacao(false);
  }
}

async function gerarPDFCompleto() {
  const { turmas } = Horario.getState();
  if (!turmas.length) return alert("Nenhuma turma cadastrada.");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "pt", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const selTurma = document.getElementById("filtro-turma");
  const turmaOriginal = selTurma.value;

  try {
    for (let i = 0; i < turmas.length; i++) {
      if (i > 0) pdf.addPage();
      const t = turmas[i];
      selTurma.value = t.id;
      renderGrade();
      prepararTabelaParaExportacao(true);

      // Aguarda fontes e layout estabilizarem antes de capturar
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => setTimeout(r, 150));

      const tabela = document.getElementById("grade-horarios");
      const canvas = await html2canvas(tabela, {
        scale: 2,
        backgroundColor: "#ffffff",
        width: tabela.scrollWidth,
        height: tabela.scrollHeight,
        windowWidth: tabela.scrollWidth + 80,
      });

      const img = canvas.toDataURL("image/png");
      const marginX = 24;
      const topY = 48;
      const maxW = pageW - marginX * 2;
      const maxH = pageH - topY - 24;

      let imgW = maxW;
      let imgH = (canvas.height * imgW) / canvas.width;

      // Ajusta proporcionalmente se a altura ultrapassar a página
      if (imgH > maxH) {
        imgH = maxH;
        imgW = (canvas.width * imgH) / canvas.height;
      }

      const posX = marginX + (maxW - imgW) / 2;

      pdf.setFontSize(15);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${t.nome} — Turno: ${t.turno.toUpperCase()}`, marginX, 30);
      pdf.addImage(img, "PNG", posX, topY, imgW, imgH);
    }
  } finally {
    prepararTabelaParaExportacao(false);
    selTurma.value = turmaOriginal;
    renderGrade();
  }

  pdf.save(`Horarios_Completos_EETEPA.pdf`);
}

// ==================== INIT ====================
function init() {
  document.getElementById("device-info").textContent =
    `${navigator.platform || ""} • ${new Date().toLocaleDateString("pt-BR")}`;

  // Registra dispositivo + tempo de uso no Supabase
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
