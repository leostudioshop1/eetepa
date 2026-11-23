// ==================== INICIALIZAÇÃO DO SUPABASE ====================
(function (global) {
  "use strict";

  const cfg = global.SUPABASE_CONFIG || {};
  let client = null;

  if (global.supabase && cfg.url && cfg.key) {
    client = global.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } else {
    console.warn("[SupabaseInit] Configuração ausente ou SDK do Supabase não carregado.");
  }

  global.supabaseClient = client;
})(typeof window !== "undefined" ? window : globalThis);
