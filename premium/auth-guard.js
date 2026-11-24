let deviceId = "";
let isAuthorized = false;

function gerarDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'DEV-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

async function verificarAutorizacao() {
  deviceId = gerarDeviceId();
  const infoEl = document.getElementById("device-info");
  if (infoEl) infoEl.innerHTML = `Dispositivo: <strong>${deviceId}</strong>`;

  try {
    const { data, error } = await supabaseClient
      .from('allowed_devices')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (error || !data) {
      isAuthorized = false;
      bloquearSistema();
    } else {
      isAuthorized = true;
    }
  } catch (err) {
    isAuthorized = false;
    bloquearSistema();
  }
}

function bloquearSistema() {
  const main = document.getElementById("main-content");
  if (main) main.classList.add("blocked");
  const bloqueioHTML = `
    <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
      <div class="bg-white text-center p-10 rounded-3xl max-w-md mx-4 shadow-2xl">
        <i class="fas fa-lock text-7xl text-red-600 mb-6"></i>
        <h2 class="text-3xl font-bold text-red-700 mb-3">Acesso Bloqueado</h2>
        <p class="text-gray-700 mb-6 text-lg">Este dispositivo não está autorizado.</p>
        <p class="text-sm text-gray-500 mb-8 font-mono">Device ID: ${deviceId}</p>
        <button onclick="window.location.reload()" class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-medium">
          Tentar novamente
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', bloqueioHTML);
}
