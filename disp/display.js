function formatarDisponibilidadeHTML(disponibilidade) {
  if (!disponibilidade || typeof disponibilidade !== 'object') {
    return '<span class="text-gray-400">Não informado</span>';
  }

  // pra formato antigo
  if (Array.isArray(disponibilidade.dias) || Array.isArray(disponibilidade.horarios)) {
    const dias = disponibilidade.dias || [];
    const horarios = disponibilidade.horarios || [];
    return `
      <div class="flex flex-wrap gap-2 mb-2">
        ${dias.map(d => `<span class="tag">${(d || '').substring(0,3).toUpperCase()}</span>`).join('')}
      </div>
      <div class="text-sm text-gray-600">
        <strong>Horários (geral):</strong><br>
        ${horarios.length ? horarios.join(" • ") : 'Não informado'}
      </div>
    `;
  }

  // Agora foi. Novo formato: { segunda: [...], terca: [...] }
  const diasComHorarios = diasSemana.filter(d => disponibilidade[d] && disponibilidade[d].length > 0);
  if (diasComHorarios.length === 0) {
    return '<span class="text-gray-400">Nenhuma disponibilidade cadastrada</span>';
  }

  return diasComHorarios.map(dia => `
    <div class="mb-3 last:mb-0">
      <span class="tag mb-1 inline-block">${diasLabels[dia] || dia}</span>
      <div class="text-sm text-gray-600 mt-1">
        ${disponibilidade[dia].join(" • ")}
      </div>
    </div>
  `).join('');
}

async function carregarProfessores() {
  const container = document.getElementById("lista-professores");
  if (!container) return;

  if (!supabaseClient) {
    container.innerHTML = `<p class="text-amber-600 text-center py-6">⚠️ Configure o arquivo <code>config.js</code> com as credenciais do Supabase para carregar os professores.</p>`;
    return;
  }

  const { data, error } = await supabaseClient.from('professores').select('*').order('nome');

  if (error) {
    container.innerHTML = `<p class="text-red-500">Erro ao carregar professores: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-center py-10">Nenhum professor cadastrado ainda.</p>`;
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="border border-gray-200 rounded-2xl p-6">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-full flex-shrink-0 mt-1" style="background-color: ${p.cor || '#4f46e5'}"></div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-lg">${p.nome}</h3>
          <div class="mt-3">
            ${formatarDisponibilidadeHTML(p.disponibilidade)}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}
