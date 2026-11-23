// ==================== EXPORTAÇÃO E INICIALIZAÇÃO ====================
async function capturarGradeCompletaSemCorte(turmaId) {
  var state = Horario.getState();
  var turmas = state.turmas;
  var grade = state.grade;
  var turma = turmas.find(function (t) {
    return t.id === turmaId;
  });
  if (!turma) return null;

  var horarios = Horario.getHorariosDoTurno(turma.turno);
  var alocacoes = grade[turmaId] || {};

  var wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "1360px";
  wrapper.style.background = "#ffffff";
  wrapper.style.padding = "16px";
  wrapper.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
  wrapper.style.zIndex = "-1";

  var linhasHtml = horarios
    .map(function (h) {
      var colunasDias = Horario.DIAS.map(function (dia) {
        var key = dia + "|" + h;
        var cell = alocacoes[key];
        if (!cell) {
          return '<td style="border:1px solid #cbd5e1; padding:10px; text-align:center; color:#cbd5e1; font-size:12px;">—</td>';
        }
        var profAtual = Horario.getProfessorAtual(cell.professorId);
        var nomeProf = (profAtual && profAtual.nome) || cell.professorNome || "";
        var corProf = (profAtual && profAtual.cor) || cell.cor || "#4f46e5";

        return (
          '<td style="border:1px solid #cbd5e1; border-left:5px solid ' +
          Horario.escapeHtml(corProf) +
          "; background:" +
          Horario.escapeHtml(corProf) +
          '1F; padding:10px 10px; vertical-align:middle; text-align:center;">' +
          '  <div style="font-weight:700; font-size:13.5px; color:#0f172a; line-height:1.3; white-space:normal; word-break:break-word; overflow-wrap:anywhere;">' +
          Horario.escapeHtml(cell.disciplina) +
          "  </div>" +
          '  <div style="font-weight:600; font-size:12px; color:#334155; margin-top:4px; line-height:1.25; white-space:normal; word-break:break-word; overflow-wrap:anywhere;">' +
          Horario.escapeHtml(nomeProf) +
          "  </div>" +
          "</td>"
        );
      }).join("");

      return (
        "<tr>" +
        '  <td style="border:1px solid #cbd5e1; background:#f8fafc; padding:10px 8px; font-weight:700; font-size:13px; color:#1e293b; text-align:center; white-space:nowrap;">' +
        Horario.escapeHtml(h) +
        "  </td>" +
        colunasDias +
        "</tr>"
      );
    })
    .join("");

  wrapper.innerHTML =
    '<table style="width:100%; border-collapse:collapse; table-layout:fixed; background:#ffffff;">' +
    "  <colgroup>" +
    '    <col style="width: 130px;">' +
    '    <col style="width: 240px;">' +
    '    <col style="width: 240px;">' +
    '    <col style="width: 240px;">' +
    '    <col style="width: 240px;">' +
    '    <col style="width: 240px;">' +
    "  </colgroup>" +
    "  <thead>" +
    '    <tr style="background:#e2e8f0; color:#0f172a;">' +
    '      <th style="border:1px solid #94a3b8; padding:12px 8px; font-size:13.5px; font-weight:700; text-align:center;">Horário</th>' +
    '      <th style="border:1px solid #94a3b8; padding:12px 8px; font-size:13.5px; font-weight:700; text-align:center;">Segunda</th>' +
    '      <th style="border:1px solid #94a3b8; padding:12px 8px; font-size:13.5px; font-weight:700; text-align:center;">Terça</th>' +
    '      <th style="border:1px solid #94a3b8; padding:12px 8px; font-size:13.5px; font-weight:700; text-align:center;">Quarta</th>' +
    '      <th style="border:1px solid #94a3b8; padding:12px 8px; font-size:13.5px; font-weight:700; text-align:center;">Quinta</th>' +
    '      <th style="border:1px solid #94a3b8; padding:12px 8px; font-size:13.5px; font-weight:700; text-align:center;">Sexta</th>' +
    "    </tr>" +
    "  </thead>" +
    "  <tbody>" +
    linhasHtml +
    "  </tbody>" +
    "</table>";

  document.body.appendChild(wrapper);
  try {
    await new Promise(function (r) {
      setTimeout(r, 40);
    });
    var canvas = await html2canvas(wrapper, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: wrapper.scrollWidth,
      height: wrapper.scrollHeight
    });
    return canvas;
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function exportarImagem() {
  var sel = document.getElementById("filtro-turma");
  var turmaId = sel ? sel.value : "";
  if (!turmaId) return alert("Selecione uma turma.");
  var turma = Horario.getState().turmas.find(function (t) {
    return t.id === turmaId;
  });

  var canvas = await capturarGradeCompletaSemCorte(turmaId);
  if (!canvas) return;

  var link = document.createElement("a");
  var slug = ((turma && turma.nome) || "grade").toLowerCase().replace(/[^a-z0-9]+/gi, "_");
  link.download = "horario_" + slug + "_" + new Date().toISOString().slice(0, 10) + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function gerarPDFCompleto() {
  var turmas = Horario.getState().turmas;
  if (!turmas.length) return alert("Nenhuma turma cadastrada.");

  var jsPDF = window.jspdf.jsPDF;
  var pdf = new jsPDF("landscape", "pt", "a4");
  var pageW = pdf.internal.pageSize.getWidth();
  var pageH = pdf.internal.pageSize.getHeight();

  for (var i = 0; i < turmas.length; i++) {
    if (i > 0) pdf.addPage();
    var t = turmas[i];
    var stats = Horario.getEstatisticasTurma(t.id);
    var turnoLabel = Horario.TURNO_LABEL[t.turno] || t.turno;

    var canvas = await capturarGradeCompletaSemCorte(t.id);
    if (!canvas) continue;

    var img = canvas.toDataURL("image/png");
    var maxW = pageW - 44;
    var maxH = pageH - 86;

    var renderW = maxW;
    var renderH = (canvas.height * renderW) / canvas.width;

    if (renderH > maxH) {
      renderH = maxH;
      renderW = (canvas.width * renderH) / canvas.height;
    }

    var offsetX = (pageW - renderW) / 2;

    pdf.setFontSize(15);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Master Horário EETEPA — " + t.nome + " (" + turnoLabel.toUpperCase() + ")", 22, 28);

    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      "Aulas alocadas: " +
        stats.alocadas +
        "/" +
        stats.total +
        " (" +
        stats.percentual +
        "%) • Emitido em: " +
        new Date().toLocaleString("pt-BR"),
      22,
      43
    );

    pdf.addImage(img, "PNG", offsetX, 52, renderW, renderH);

    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Página " + (i + 1) + " de " + turmas.length + " • Desenvolvido por Léo Cruz", 22, pageH - 12);
  }

  pdf.save("Horarios_Completos_EETEPA_" + new Date().toISOString().slice(0, 10) + ".pdf");
}

function atualizarBadgeSync(info) {
  var status = info.status;
  var detalhe = info.detalhe;
  var el = document.getElementById("sync-status");
  if (!el) return;

  var mapa = {
    syncing: { cls: "bg-amber-400/20 text-amber-100 border-amber-300/40", icon: "fa-sync fa-spin", text: detalhe || "Sincronizando..." },
    synced: { cls: "bg-emerald-400/20 text-emerald-100 border-emerald-300/40", icon: "fa-check-circle", text: detalhe || "Supabase OK" },
    offline: { cls: "bg-slate-400/20 text-slate-100 border-slate-300/40", icon: "fa-database", text: detalhe || "Cache Local" },
    error: { cls: "bg-red-500/30 text-red-100 border-red-300/40", icon: "fa-exclamation-circle", text: detalhe || "Erro Supabase" },
    idle: { cls: "bg-white/10 text-indigo-100 border-white/20", icon: "fa-circle", text: "Iniciando" }
  };

  var atual = mapa[status] || mapa.idle;
  el.className = "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border " + atual.cls;
  el.innerHTML = '<i class="fas ' + atual.icon + '"></i><span>' + Horario.escapeHtml(atual.text) + "</span>";
}

async function init() {
  var devEl = document.getElementById("device-info");
  if (devEl) {
    devEl.textContent = (navigator.platform || "") + " • " + new Date().toLocaleDateString("pt-BR");
  }

  if (typeof getSupabaseClient === "function") {
    getSupabaseClient();
  }

  Horario.init({
    onChange: function () {
      renderTurmas();
      renderDisciplinas();
      atualizarFiltroTurma();
      renderProfessores();
      renderLegenda();
    },
    onStatusChange: atualizarBadgeSync
  });

  renderTurmas();
  renderDisciplinas();
  atualizarFiltroTurma();
  renderLegenda();

  DispositivoTracker.iniciar();

  await Horario.carregarTudoDoSupabase();
  await carregarProfessores();
  Horario.iniciarRealtime();

  renderTurmas();
  renderDisciplinas();
  atualizarFiltroTurma();
  renderProfessores();
  renderLegenda();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
