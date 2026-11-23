// ==================== PROFESSORES (Supabase) ====================
async function carregarProfessores() {
  const ul = document.getElementById("lista-professores");
  if (!supabaseClient) {
    if (ul) {
      ul.innerHTML = `<li class="text-amber-600 text-sm p-3 bg-amber-50 rounded-lg">Configure o <code>config.js</code> com as credenciais do Supabase.</li>`;
    }
    return;
  }

  if (ul) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando...</li>`;
  }

  const { data, error } = await supabaseClient
    .from("professores")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    if (ul) ul.innerHTML = `<li class="text-red-500 text-sm">Erro: ${Horario.escapeHtml(error.message)}</li>`;
    return;
  }

  Horario.setProfessores(data || []);
  renderProfessores();
  renderLegenda();
  renderGrade();
}

function renderProfessores() {
  const { professores, professorDestacadoId } = Horario.getState();
  const ul = document.getElementById("lista-professores");
  if (!ul) return;

  if (!professores.length) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4">Nenhum professor cadastrado no Gerenciador de Disponibilidade.</li>`;
    return;
  }

  ul.innerHTML = professores
    .map((p) => {
      const disp = p.disponibilidade || {};
      const dias = Object.keys(disp).filter((d) => Array.isArray(disp[d]) && disp[d].length > 0);
      const carga = Horario.getAulasDoProfessor(p.id);
      const ativo = String(professorDestacadoId) === String(p.id);

      return `
        <li onclick="toggleDestaqueProfessor('${p.id}')"
            class="cursor-pointer rounded-xl p-4 border transition ${ativo ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full flex-shrink-0" style="background:${Horario.escapeHtml(p.cor || "#4f46e5")}"></div>
              <div class="font-medium text-gray-800 break-words leading-snug">${Horario.escapeHtml(p.nome)}</div>
            </div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white border text-gray-700 flex-shrink-0">
              ${carga.totalAulas} aula(s)
            </span>
          </div>
          <div class="flex flex-wrap gap-1">
            ${
              dias.length
                ? dias
                    .map(
                      (d) =>
                        `<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">${Horario.escapeHtml(Horario.DIAS_LABEL[d] || d)}</span>`
                    )
                    .join("")
                : '<span class="text-xs text-gray-400">Sem disponibilidade</span>'
            }
          </div>
        </li>
      `;
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
  const { professores, professorDestacadoId } = Horario.getState();
  const el = document.getElementById("legenda-professores");
  if (!el) return;

  if (!professores.length) {
    el.innerHTML = `<span class="text-gray-400 text-sm">Nenhum professor carregado</span>`;
    return;
  }

  el.innerHTML = professores
    .map((p) => {
      const carga = Horario.getAulasDoProfessor(p.id);
      const ativo = String(professorDestacadoId) === String(p.id);
      return `
        <button type="button" onclick="toggleDestaqueProfessor('${p.id}')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
            ativo ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-gray-50 text-gray-800 hover:bg-gray-100"
          }">
          <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/60" style="background:${Horario.escapeHtml(p.cor || "#4f46e5")}"></span>
          <span>${Horario.escapeHtml(p.nome)}</span>
          <span class="text-xs opacity-80">(${carga.totalAulas})</span>
        </button>
      `;
    })
    .join("");
}
