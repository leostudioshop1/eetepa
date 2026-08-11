async function gerarRelatorioPDF() {
  if (!supabaseClient) {
    return alert("❌ Configuração não encontrada.");
  }

  const { data: professores, error } = await supabaseClient.from('professores').select('*').order('nome');
  if (error || !professores || professores.length === 0) {
    return alert("Nenhum professor encontrado para gerar o relatório.");
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("RELATÓRIO DE DISPONIBILIDADE", pageWidth / 2, 50, { align: "center" });
  pdf.setFontSize(12);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 75, { align: "center" });

  let y = 110;

  professores.forEach((prof) => {
    if (y > 680) {
      pdf.addPage();
      y = 60;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(prof.nome, 50, y);
    y += 22;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    const disp = prof.disponibilidade || {};

    if (Array.isArray(disp.dias) || Array.isArray(disp.horarios)) {
      pdf.text("Dias disponíveis: " + (disp.dias?.join(", ") || "Nenhum"), 50, y);
      y += 18;
      const horarios = disp.horarios || [];
      if (horarios.length) {
        pdf.text("Horários (geral):", 50, y);
        y += 16;
        for (let i = 0; i < horarios.length; i += 3) {
          const linha = horarios.slice(i, i + 3).join("  •  ");
          pdf.text(linha, 70, y);
          y += 16;
        }
      }
    } else {
      const diasComHorarios = diasSemana.filter(d => disp[d] && disp[d].length > 0);
      if (diasComHorarios.length === 0) {
        pdf.text("Nenhuma disponibilidade cadastrada", 50, y);
        y += 18;
      } else {
        diasComHorarios.forEach(dia => {
          if (y > 720) {
            pdf.addPage();
            y = 60;
          }
          pdf.setFont("helvetica", "bold");
          pdf.text((diasLabels[dia] || dia) + ":", 50, y);
          y += 16;
          pdf.setFont("helvetica", "normal");
          const horarios = disp[dia];
          for (let i = 0; i < horarios.length; i += 3) {
            const linha = horarios.slice(i, i + 3).join("  •  ");
            pdf.text(linha, 70, y);
            y += 15;
          }
          y += 8;
        });
      }
    }

    y += 20;
  });

  pdf.save("Relatorio_Disponibilidade_Professores.pdf");
}


function init() {
  renderDisponibilidadeMatrix();
  carregarProfessores();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
