// ==================== PROTEÇÃO ANTI-INSPEÇÃO E ANTI-DEVTOOLS ====================
(function () {
  "use strict";

  // 1. Bloqueio de clique direito, seleção e arraste
  document.addEventListener("contextmenu", (e) => e.preventDefault(), true);
  document.addEventListener("selectstart", (e) => {
    if (!["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
      e.preventDefault();
    }
  }, true);
  document.addEventListener("dragstart", (e) => e.preventDefault(), true);

  // 2. Bloqueio de atalhos de teclado (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, etc.)
  document.addEventListener("keydown", function (e) {
    const key = (e.key || "").toUpperCase();
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    // F12
    if (key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / J / C / K (DevTools / Inspetor / Console)
    if (ctrlOrCmd && e.shiftKey && ["I", "J", "C", "K"].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Cmd+Option+I / J / C / U (macOS)
    if (e.metaKey && e.altKey && ["I", "J", "C", "U"].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U (Exibir código-fonte), Ctrl+S (Salvar página), Ctrl+P (Imprimir)
    if (ctrlOrCmd && ["U", "S", "P"].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 3. Tela de bloqueio caso DevTools seja detectado
  let bloqueado = false;
  function acionarBloqueio() {
    if (bloqueado) return;
    bloqueado = true;
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#f8fafc;font-family:sans-serif;text-align:center;padding:24px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <h1 style="font-size:24px;font-weight:bold;margin-bottom:8px;">Acesso Restrito</h1>
        <p style="color:#94a3b8;max-width:420px;line-height:1.5;">
          A inspeção de código e o modo desenvolvedor estão desativados neste sistema.
          Feche o painel de desenvolvedor e recarregue a página para continuar.
        </p>
      </div>
    `;
  }

  // 4. Detecção por diferença de dimensão da janela (DevTools acoplado)
  const LIMITE_DIMENSAO = 160;
  function verificarDimensoes() {
    const larguraDiff = window.outerWidth - window.innerWidth > LIMITE_DIMENSAO;
    const alturaDiff = window.outerHeight - window.innerHeight > LIMITE_DIMENSAO;
    if (larguraDiff || alturaDiff) {
      acionarBloqueio();
    }
  }

  // 5. Detecção por armadilha de tempo (debugger) e limpeza de console
  function verificarDebugger() {
    const inicio = performance.now();
    (function () {}.constructor("debugger")());
    const fim = performance.now();
    if (fim - inicio > 120) {
      acionarBloqueio();
    }
  }

  // 6. Armadilha de inspeção no console
  const armadilhaConsole = new Image();
  Object.defineProperty(armadilhaConsole, "id", {
    get: function () {
      acionarBloqueio();
      return "";
    }
  });

  setInterval(() => {
    verificarDimensoes();
    verificarDebugger();
    try {
      console.clear();
      console.log("%c", armadilhaConsole);
    } catch (_) {}
  }, 1000);

  window.addEventListener("resize", verificarDimensoes);
})();
