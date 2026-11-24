async function exportarImagem() {
  if (!turmaSelecionada) return alert("Selecione uma turma primeiro!");
  const container = document.getElementById("grade-container");
  const exportContainer = document.createElement("div");
  exportContainer.style.background = "white";
  exportContainer.style.padding = "30px";
  exportContainer.style.width = "1280px";
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
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 36;
  const usableWidth = pageWidth - marginX * 2;
  const maxContentHeight = pageHeight - 90;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("MASTER HORÁRIO EETEPA", pageWidth / 2, 34, { align: "center" });

  let yPosition = 58;

  for (let i = 0; i < turmas.length; i++) {
    const turma = turmas[i];
    const horarios = horariosPorTurno[turma.turno] || horariosPorTurno.manha;

    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-99999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = "1280px";
    tempContainer.style.background = "#ffffff";
    tempContainer.style.padding = "18px 22px";
    tempContainer.style.boxSizing = "border-box";

    let tableHTML = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">
        ${turma.nome} (${turma.turno.toUpperCase()})
      </div>
      <table style="width:100%; table-layout: fixed; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="width:140px; border:1px solid #cbd5e1; padding:8px; text-align:left;">Horário</th>
            ${diasSemana.map(d => `<th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">${d.charAt(0).toUpperCase() + d.slice(1)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    horarios.forEach((horario, hIndex) => {
      tableHTML += `<tr style="break-inside: avoid; page-break-inside: avoid;">`;
      tableHTML += `<td style="border:1px solid #cbd5e1; padding:8px 10px; font-weight:bold; background:#f8fafc; vertical-align:top; word-break:break-word; white-space:normal; line-height:1.35;">${horario}</td>`;

      diasSemana.forEach(dia => {
        const key = `${turma.nome}-${dia}-${hIndex}`;
        const aloc = horariosAlocados[key];
        const bgStyle = aloc ? "background:#f3e8ff;" : "";
        tableHTML += `<td style="border:1px solid #cbd5e1; padding:8px 10px; vertical-align:top; word-break:break-word; overflow-wrap:anywhere; white-space:normal; line-height:1.35; ${bgStyle}">`;
        if (aloc) {
          tableHTML += `<div style="font-weight:600; color:#0f172a; margin-bottom:3px;">${aloc.disciplina}</div>`;
          tableHTML += `<div style="color:#4338ca; font-size:11px; font-weight:500;">${aloc.professor}</div>`;
        }
        tableHTML += `</td>`;
      });

      tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    tempContainer.innerHTML = tableHTML;
    document.body.appendChild(tempContainer);

    const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true });
    document.body.removeChild(tempContainer);

    let imgWidth = usableWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > maxContentHeight) {
      imgHeight = maxContentHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    if (i > 0 && yPosition + imgHeight > pageHeight - 24) {
      pdf.addPage();
      yPosition = 36;
    }

    const xOffset = marginX + (usableWidth - imgWidth) / 2;
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, 'PNG', xOffset, yPosition, imgWidth, imgHeight);

    yPosition += imgHeight + 18;
  }

  pdf.save("Master_Horario_EETEPA_Completo.pdf");
}
