async function carregarProfessores() {
  const ul = document.getElementById("lista-professores");
  if (!supabaseClient) {
    ul.innerHTML = `<li class="text-amber-600 text-sm p-3 bg-amber-50 rounded-lg">Configure o <code>config.js</code> com as credenciais.</li>`;
    return;
  }

  ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando...</li>`;

  const { data, error } = await supabaseClient
    .from("professores")
    .select("*")
    .order("nome");

  if (error) {
    ul.innerHTML = `<li class="text-red-500 text-sm">Erro: ${error.message}</li>`;
    return;
  }

  Horario.setProfessores(data || []);
  renderProfessores();
  renderLegenda();
  renderGrade();
}

function renderProfessores() {
  const { professores } = Horario.getState();
  const ul = document.getElementById("lista-professores");
  if (!professores.length) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4">Nenhum professor cadastrado no Gerenciador de Disponibilidade.</li>`;
    return;
  }

  ul.innerHTML = professores.map(p => {
    const dias = Object.keys(p.disponibilidade || {}).filter(d => (p.disponibilidade[d] || []).length > 0);
    return `
      <li class="bg-gray-50 rounded-xl p-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-full flex-shrink-0" style="background:${p.cor || '#4f46e5'}"></div>
          <div class="font-medium">${p.nome}</div>
        </div>
        <div class="flex flex-wrap gap-1">
          ${dias.map(d => `<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">${Horario.DIAS_LABEL[d] || d}</span>`).join("") || '<span class="text-xs text-gray-400">Sem disponibilidade</span>'}
        </div>
      </li>
    `;
  }).join("");
}

function renderLegenda() {
  const { professores } = Horario.getState();
  const el = document.getElementById("legenda-professores");
  if (!professores.length) {
    el.innerHTML = `<span class="text-gray-400 text-sm">Nenhum professor carregado</span>`;
    return;
  }
  el.innerHTML = professores.map(p => `
    <div class="flex items-center gap-2">
      <div class="w-4 h-4 rounded-full" style="background:${p.cor || '#4f46e5'}"></div>
      <span class="text-sm">${p.nome}</span>
    </div>
  `).join("");
}
