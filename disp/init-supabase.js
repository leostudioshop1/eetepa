let supabaseClient = null;
try {
  if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.key) {
    supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
  } else {
    console.warn("config.js ou SUPABASE_CONFIG não encontrado. Cadastro/lista não funcionarão até configurar.");
  }
} catch (e) {
  console.warn("Erro ao inicializar Supabase:", e);
}
