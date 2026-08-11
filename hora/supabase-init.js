
let supabaseClient = null;
try {
  if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.key) {
    supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
  }
} catch (e) {
  console.warn("Erro ao inicializar Supabase:", e);
}



function persistirLocal(data) {
  localStorage.setItem("eetepa_turmas", JSON.stringify(data.turmas));
  localStorage.setItem("eetepa_disciplinas", JSON.stringify(data.disciplinas));
  localStorage.setItem("eetepa_grade", JSON.stringify(data.grade));
}


Horario.init({
  turmas: JSON.parse(localStorage.getItem("eetepa_turmas") || "[]"),
  disciplinas: JSON.parse(localStorage.getItem("eetepa_disciplinas") || "[]"),
  grade: JSON.parse(localStorage.getItem("eetepa_grade") || "{}"),
  professores: [],
  onSave: persistirLocal,
});
