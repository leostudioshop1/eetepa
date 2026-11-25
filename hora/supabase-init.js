// ==================== INICIALIZAÇÃO DO SUPABASE ====================
(function () {
  "use strict";

  const STORAGE_ESTADO_KEY = "eetepa_master_horario_estado_v1";

  function carregarEstadoLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_ESTADO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          turmas: Array.isArray(parsed.turmas) ? parsed.turmas : [],
          disciplinas: Array.isArray(parsed.disciplinas) ? parsed.disciplinas : [],
          grade: parsed.grade && typeof parsed.grade === "object" ? parsed.grade : {},
        };
      }
    } catch (e) {
      console.warn("[SupabaseInit] Erro ao ler localStorage:", e);
    }
    return { turmas: [], disciplinas: [], grade: {} };
  }

  function salvarEstadoLocal(estado) {
    try {
      localStorage.setItem(STORAGE_ESTADO_KEY, JSON.stringify(estado));
    } catch (e) {
      console.warn("[SupabaseInit] Erro ao salvar localStorage:", e);
    }
  }

  // Cria cliente Supabase globalmente acessível como supabaseClient
  if (typeof window.supabase !== "undefined" && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.key) {
    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.key
    );
  } else {
    window.supabaseClient = null;
    console.warn("[SupabaseInit] SDK do Supabase ou SUPABASE_CONFIG não disponível.");
  }

  // Inicializa o módulo Horario com estado local persistente
  const estadoInicial = carregarEstadoLocal();
  if (typeof Horario !== "undefined") {
    Horario.init({
      turmas: estadoInicial.turmas,
      disciplinas: estadoInicial.disciplinas,
      grade: estadoInicial.grade,
      professores: [],
      onSave: function (novoEstado) {
        salvarEstadoLocal(novoEstado);
      },
    });
  }
})();
