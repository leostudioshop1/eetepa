let turmas = [];
let disciplinasGerais = [];
let professores = [];
let horariosAlocados = {};
let currentCellId = null;
let turmaSelecionada = null;

const horariosPorTurno = {
  manha: ["07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:30 - 10:15", "10:15 - 11:00", "11:00 - 11:45"],
  tarde: ["13:00 - 13:35", "13:35 - 14:10", "14:10 - 14:45", "15:00 - 15:35", "15:35 - 16:10", "16:10 - 16:45"],
  noite: ["19:00 - 19:35", "19:35 - 20:10", "20:10 - 20:45", "21:00 - 21:35", "21:35 - 22:10", "22:10 - 22:45"]
};

const diasSemana = ["segunda", "terca", "quarta", "quinta", "sexta"];

if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.key) {
  alert("Erro: de registro entre em contato 94-99186-1222 LEOMASTER64");
}

const supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);

function carregarDados() {
  const savedTurmas = localStorage.getItem('turmas');
  const savedDisciplinas = localStorage.getItem('disciplinasGerais');
  const savedProfessores = localStorage.getItem('professores');
  const savedHorarios = localStorage.getItem('horariosAlocados');

  if (savedTurmas) turmas = JSON.parse(savedTurmas);
  if (savedDisciplinas) disciplinasGerais = JSON.parse(savedDisciplinas);
  if (savedProfessores) professores = JSON.parse(savedProfessores);
  if (savedHorarios) horariosAlocados = JSON.parse(savedHorarios);

  if (disciplinasGerais.length === 0) disciplinasGerais = ["Matemática", "Português", "História", "Geografia", "Inglês", "Educação Física"];
  if (turmas.length === 0) turmas = [{ nome: "7º A", turno: "manha" }, { nome: "8º B", turno: "tarde" }];
  if (professores.length === 0) {
    professores = [{
      nome: "João Silva",
      cor: "#4f46e5",
      disponibilidade: { dias: [...diasSemana], horarios: Object.values(horariosPorTurno).flat() }
    }];
  }

  renderAll();
}

function salvarDados() {
  if (!isAuthorized) return alert("❌ Dispositivo não autorizado.");
  localStorage.setItem('turmas', JSON.stringify(turmas));
  localStorage.setItem('disciplinasGerais', JSON.stringify(disciplinasGerais));
  localStorage.setItem('professores', JSON.stringify(professores));
  localStorage.setItem('horariosAlocados', JSON.stringify(horariosAlocados));
}
