// ==================== PROFESSORES (SUPABASE) ====================
async function carregarProfessores() {
  const ul = document.getElementById("lista-professores");
  const legenda = document.getElementById("legenda-professores");

  if (ul) {
    ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4"><i class="fas fa-spinner fa-spin mr-1"></i> Carregando professores...</li>`;
  }

  if (!window.supabaseClient) {
    if (ul) {
      ul.innerHTML = `<li class="text-amber-600 text-sm text-center py-4">Cliente Supabase não inicializado.</li>`;
    }
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("professores")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      throw error;
    }

    const lista = Array.isArray(data) ? data : [];
    if (typeof Horario !== "undefined") {
      Horario.setProfessores(lista);
    }

    if (ul) {
      if (!lista.length) {
        ul.innerHTML = `<li class="text-gray-400 text-sm text-center py-4">Nenhum professor encontrado no Supabase.</li>`;
      } else {
        ul.innerHTML = lista.map((p) => {
          const cor = p.cor || "#4f46e5";
          return `
            <li class="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-4 h-4 rounded-full flex-shrink-0" style="background:${cor}"></span>
                <span class="font-medium text-gray-800 truncate">${p.nome || "Sem nome"}</span>
              </div>
            </li>
          `;
        }).join("");
      }
    }

    if (legenda) {
      if (!lista.length) {
        legenda.innerHTML = `<span class="text-xs text-gray-400">Nenhum professor carregado</span>`;
      } else {
        legenda.innerHTML = lista.map((p) => {
          const cor = p.cor || "#4f46e5";
          return `
            <div class="flex items-center gap-2 text-xs bg-gray-50 border rounded-lg px-3 py-1.5">
              <span class="w-3 h-3 rounded-full inline-block" style="background:${cor}"></span>
              <span>${p.nome || "Sem nome"}</span>
            </div>
          `;
        }).join("");
      }
    }
  } catch (err) {
    console.warn("[Professores] Erro ao buscar no Supabase:", err);
    if (ul) {
      ul.innerHTML = `<li class="text-red-500 text-sm text-center py-4">Erro ao carregar professores: ${err.message || err}</li>`;
    }
  }
}
