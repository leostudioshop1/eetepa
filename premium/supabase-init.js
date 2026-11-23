// ==================== INICIALIZAÇÃO ROBUSTA DO SUPABASE ====================
var supabaseClient = null;

(function (global) {
  "use strict";

  var DEFAULT_CONFIG = {
    url: "https://osofdmgokrxdzsxozsrf.supabase.co",
    key: "sb_publishable_KTboch_e9KyCmMNZBlTM9w_V_XhY6Xe",
    realtime: true
  };

  function obterConfig() {
    var cfg =
      (typeof global.SUPABASE_CONFIG === "object" && global.SUPABASE_CONFIG) ||
      (typeof SUPABASE_CONFIG === "object" && SUPABASE_CONFIG) ||
      {};

    var url =
      cfg.url ||
      global.SUPABASE_URL ||
      (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "") ||
      DEFAULT_CONFIG.url;

    var key =
      cfg.key ||
      cfg.anonKey ||
      global.SUPABASE_KEY ||
      (typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY : "") ||
      DEFAULT_CONFIG.key;

    var resolved = {
      url: String(url || "").trim().replace(/\/$/, ""),
      key: String(key || "").trim(),
      realtime: cfg.realtime !== undefined ? Boolean(cfg.realtime) : true
    };

    global.SUPABASE_CONFIG = resolved;
    return resolved;
  }

  function inicializarCliente() {
    if (global.supabaseClient) {
      supabaseClient = global.supabaseClient;
      return supabaseClient;
    }

    var cfg = obterConfig();
    var sdk =
      global.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);

    if (!sdk || typeof sdk.createClient !== "function") {
      console.warn("[SupabaseInit] SDK @supabase/supabase-js não disponível no momento.");
      return null;
    }

    if (!cfg.url || !cfg.key) {
      console.warn("[SupabaseInit] URL ou Key do Supabase ausentes.");
      return null;
    }

    try {
      var client = sdk.createClient(cfg.url, cfg.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            apikey: cfg.key
          }
        }
      });

      global.supabaseClient = client;
      supabaseClient = client;
      return client;
    } catch (err) {
      console.warn("[SupabaseInit] Falha ao criar cliente Supabase:", err);
      return null;
    }
  }

  global.getSupabaseClient = inicializarCliente;
  inicializarCliente();
})(typeof window !== "undefined" ? window : globalThis);
