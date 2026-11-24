function ativarProtecoes() {
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart', e => e.preventDefault());

  document.addEventListener('keydown', function (e) {
    const key = e.key ? e.key.toLowerCase() : "";
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    if (
      e.key === "F12" ||
      (ctrlOrCmd && e.shiftKey && ["i", "c", "j"].includes(key)) ||
      (ctrlOrCmd && ["u", "s", "p"].includes(key))
    ) {
      e.preventDefault();
      alert("❌ Ação bloqueada por segurança.");
      return false;
    }
  });

  let alertaExibido = false;
  window.addEventListener("resize", () => {
    const diffW = window.outerWidth - window.innerWidth;
    const diffH = window.outerHeight - window.innerHeight;
    if ((diffW > 220 || diffH > 220) && !alertaExibido) {
      alertaExibido = true;
      console.clear();
    }
  });
}
