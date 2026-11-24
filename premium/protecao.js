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

    if (key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if (ctrlOrCmd && e.shiftKey && ["I", "J", "C", "K"].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if (e.metaKey && e.altKey && ["I", "J", "C", "U"].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

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

  // 4. Detecção por diferença de dimensão da janela (evitando falsos positivos em telas grandes)
  const LIMITE_DIMENSAO = 200;
  function verificarDimensoes() {
    if (window.outerWidth <= 0 || window.outerHeight <= 0) return;
    const larguraDiff = window.outerWidth - window.innerWidth > LIMITE_DIMENSAO;
    const alturaDiff = window.outerHeight - window.innerHeight > LIMITE_DIMENSAO;
    if (larguraDiff || alturaDiff) {
      acionarBloqueio();
    }
  }

  // 5. Detecção via inspeção de propriedade no console
  const armadilhaConsole = new Image();
  Object.defineProperty(armadilhaConsole, "id", {
    get: function () {
      acionarBloqueio();
      return "";
    }
  });

  setInterval(() => {
    verificarDimensoes();
    try {
      console.log("%c", armadilhaConsole);
    } catch (_) {}
  }, 1500);

  window.addEventListener("resize", verificarDimensoes);
})();
