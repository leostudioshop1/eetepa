function renderDisponibilidadeMatrix() {
  const container = document.getElementById("disponibilidade-matrix");
  if (!container) return;

  container.innerHTML = diasSemana.map(dia => `
    <div class="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <div class="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <h3 class="font-semibold text-indigo-800">${diasLabels[dia]}</h3>
        <label class="flex items-center gap-2 text-sm text-indigo-700 cursor-pointer select-none">
          <input type="checkbox" class="w-4 h-4 accent-indigo-600" 
                 onchange="toggleDia('${dia}', this.checked)" checked>
          <span>Todos</span>
        </label>
      </div>
      <div class="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        ${horariosFixos.map(h => `
          <label class="flex items-center gap-2 cursor-pointer bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg px-3 py-2 text-sm transition">
            <input type="checkbox" 
                   data-dia="${dia}" 
                   data-horario="${h}" 
                   class="w-4 h-4 accent-indigo-600 disponibilidade-check flex-shrink-0"
                   checked>
            <span class="text-gray-700">${h}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}
