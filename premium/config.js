// ==================== CONFIGURAÇÃO SUPABASE ====================
// Compatível com todas as formas de acesso global (window.SUPABASE_CONFIG, SUPABASE_CONFIG, SUPABASE_URL, SUPABASE_KEY)
var SUPABASE_URL = "https://osofdmgokrxdzsxozsrf.supabase.co";
var SUPABASE_KEY = "sb_publishable_KTboch_e9KyCmMNZBlTM9w_V_XhY6Xe";

var SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  key: SUPABASE_KEY,
  anonKey: SUPABASE_KEY,
  realtime: true
};

if (typeof window !== "undefined") {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_KEY = SUPABASE_KEY;
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
if (typeof globalThis !== "undefined") {
  globalThis.SUPABASE_URL = SUPABASE_URL;
  globalThis.SUPABASE_KEY = SUPABASE_KEY;
  globalThis.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
