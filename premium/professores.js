// ==================== PROFESSORES (Supabase) ====================
async function carregarProfessores() {
  var ul = document.getElementById("lista-professores");
  var db = typeof getSupabaseClient === "function" ? getSupabaseClient() : supabaseClient;

  if (!db) {
    if (ul) {
      ul.innerHTML =
        '<li class="text-amber-700 text-sm p-3 bg-amber-50 border border-amber-200 rounded-lg">' +
        '<i class="fas fa-exclamation-triangle mr-1"></i> Modo offline / cache local ativo. Verifique a conexão com o Supabase.' +
        '</li>';
    }
    renderProfessores();
    renderLegenda();
    return;
  }

  if (ul && !Horario.getState().professores.length) {
    ul.innerHTML =
      '<li class="text-gray-400 text-sm text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando...</li>';
  }

  try {
    var res = await Promise.race([
      db.from("professores").select("*").order("nome", { ascending: true }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("Tempo esgotado ao buscar professores"));
        }, 7000);
      })
    ]);

    if (res.error) {
      if (ul) {
        ul.innerHTML =
          '<li class="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-lg">Erro ao buscar professores: ' +
          Horario.escapeHtml(res.error.message) +
          '</li>';
      }
      return;
    }

    Horario.setProfessores(res.data || []);
    renderProfessores();
    renderLegenda();
    renderGrade();
  } catch (err) {
    console.warn("[Professores] Falha ao carregar:", err);
    renderProfessores();
    renderLegenda();
  }
}

function renderProfessores() {
  var state = Horario.getState();
  var professores = state.professores;
  var professorDestacadoId = state.professorDestacadoId;
  var ul = document.getElementById("lista-professores");
  if (!ul) return;

  if (!professores.length) {
    ul.innerHTML =
      '<li class="text-gray-400 text-sm text-center py-4">Nenhum professor cadastrado no Gerenciador de Disponibilidade.</li>';
    return;
  }

  ul.innerHTML = professores
    .map(function (p) {
      var disp = p.disponibilidade || {};
      var dias = Object.keys(disp).filter(function (d) {
        return Array.isArray(disp[d]) && disp[d].length > 0;
      });
      var carga = Horario.getAulasDoProfessor(p.id);
      var ativo = String(professorDestacadoId) === String(p.id);

      var badgesDias = dias.length
        ? dias
            .map(function (d) {
              return (
                '<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">' +
                Horario.escapeHtml(Horario.DIAS_LABEL[d] || d) +
                '</span>'
              );
            })
            .join("")
        : '<span class="text-xs text-gray-400">Sem disponibilidade</span>';

      return (
        '<li onclick="toggleDestaqueProfessor(\'' + p.id + '\')"' +
        ' class="cursor-pointer rounded-xl p-4 border transition ' +
        (ativo ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200" : "bg-gray-50 border-gray-200 hover:bg-gray-100") +
        '">' +
        '  <div class="flex items-start justify-between gap-2 mb-2">' +
        '    <div class="flex items-center gap-3 min-w-0">' +
        '      <div class="w-8 h-8 rounded-full flex-shrink-0" style="background:' + Horario.escapeHtml(p.cor || "#4f46e5") + '"></div>' +
        '      <div class="font-medium text-gray-800 break-words leading-snug">' + Horario.escapeHtml(p.nome) + '</div>' +
        '    </div>' +
        '    <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white border text-gray-700 flex-shrink-0">' +
        carga.totalAulas + ' aula(s)' +
        '    </span>' +
        '  </div>' +
        '  <div class="flex flex-wrap gap-1">' + badgesDias + '</div>' +
        '</li>'
      );
    })
    .join("");
}

function toggleDestaqueProfessor(profId) {
  Horario.setProfessorDestacado(profId);
  renderProfessores();
  renderLegenda();
  renderGrade();
}

function renderLegenda() {
  var state = Horario.getState();
  var professores = state.professores;
  var professorDestacadoId = state.professorDestacadoId;
  var el = document.getElementById("legenda-professores");
  if (!el) return;

  if (!professores.length) {
    el.innerHTML = '<span class="text-gray-400 text-sm">Nenhum professor carregado</span>';
    return;
  }

  el.innerHTML = professores
    .map(function (p) {
      var carga = Horario.getAulasDoProfessor(p.id);
      var ativo = String(professorDestacadoId) === String(p.id);
      return (
        '<button type="button" onclick="toggleDestaqueProfessor(\'' + p.id + '\')"' +
        ' class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ' +
        (ativo ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-gray-50 text-gray-800 hover:bg-gray-100") +
        '">' +
        '  <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/60" style="background:' + Horario.escapeHtml(p.cor || "#4f46e5") + '"></span>' +
        '  <span>' + Horario.escapeHtml(p.nome) + '</span>' +
        '  <span class="text-xs opacity-80">(' + carga.totalAulas + ')</span>' +
        '</button>'
      );
    })
    .join("");
}
