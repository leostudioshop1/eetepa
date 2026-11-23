// ==================== RASTREAMENTO DE DISPOSITIVO E TEMPO DE USO ====================
const DispositivoTracker = (function () {
  const DEVICE_KEY = "eetepa_dispositivo_id";
  const SESSION_KEY = "eetepa_sessao_id";
  const SYNC_INTERVAL_MS = 30000;

  let dispositivoId = null;
  let sessaoId = null;
  let inicioSessao = null;
  let tempoAcumuladoSessao = 0;
  let ultimoTick = null;
  let paginaVisivel = true;
  let syncTimer = null;
  let uiTimer = null;
  let salvando = false;
  let sessaoRegistradaNoBanco = false;

  function gerarId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function obterDispositivoId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = gerarId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function infoAmbiente() {
    return {
      user_agent: navigator.userAgent || "",
      plataforma: navigator.platform || "",
      idioma: navigator.language || "",
      resolucao: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    };
  }

  function tick() {
    if (!paginaVisivel || !ultimoTick) return;
    const agora = Date.now();
    const delta = Math.max(0, Math.floor((agora - ultimoTick) / 1000));
    if (delta > 0) {
      tempoAcumuladoSessao += delta;
      ultimoTick = agora;
    }
  }

  function tempoSessaoAtual() {
    tick();
    return tempoAcumuladoSessao;
  }

  async function sincronizarDispositivo(deltaSegundos, isNovaSessao) {
    if (!supabaseClient || !dispositivoId) return;
    const env = infoAmbiente();
    const delta = Math.max(0, Math.floor(deltaSegundos || 0));

    const { error: rpcError } = await supabaseClient.rpc("registrar_uso_dispositivo", {
      p_dispositivo_id: dispositivoId,
      p_delta_segundos: delta,
      p_nova_sessao: Boolean(isNovaSessao),
      p_user_agent: env.user_agent,
      p_plataforma: env.plataforma,
      p_idioma: env.idioma,
      p_resolucao: env.resolucao,
    });

    if (!rpcError) return;

    const agora = new Date().toISOString();
    const { data: existente } = await supabaseClient
      .from("dispositivos_acesso")
      .select("tempo_uso_segundos, sessoes, primeiro_acesso")
      .eq("dispositivo_id", dispositivoId)
      .maybeSingle();

    await supabaseClient
      .from("dispositivos_acesso")
      .upsert(
        {
          dispositivo_id: dispositivoId,
          user_agent: env.user_agent,
          plataforma: env.plataforma,
          idioma: env.idioma,
          resolucao: env.resolucao,
          primeiro_acesso: existente?.primeiro_acesso || agora,
          ultimo_acesso: agora,
          tempo_uso_segundos: (existente?.tempo_uso_segundos || 0) + delta,
          sessoes: (existente?.sessoes || 0) + (isNovaSessao ? 1 : 0),
        },
        { onConflict: "dispositivo_id" }
      );
  }

  async function upsertSessao(tempoSessao, finalizar = false) {
    if (!supabaseClient || !dispositivoId) return;
    const env = infoAmbiente();
    const agora = new Date().toISOString();

    if (!sessaoId) {
      const { data, error } = await supabaseClient
        .from("sessoes_uso")
        .insert({
          dispositivo_id: dispositivoId,
          inicio: inicioSessao ? new Date(inicioSessao).toISOString() : agora,
          tempo_uso_segundos: tempoSessao,
          fim: finalizar ? agora : null,
          user_agent: env.user_agent,
          plataforma: env.plataforma,
        })
        .select("id")
        .single();

      if (!error && data?.id) {
        sessaoId = data.id;
        sessionStorage.setItem(SESSION_KEY, sessaoId);
      }
      return;
    }

    await supabaseClient
      .from("sessoes_uso")
      .update({
        tempo_uso_segundos: tempoSessao,
        fim: finalizar ? agora : null,
      })
      .eq("id", sessaoId);
  }

  async function sincronizar(finalizar = false) {
    if (!supabaseClient || salvando) return;
    salvando = true;
    try {
      const totalSessao = tempoSessaoAtual();
      const jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
      const delta = Math.max(0, totalSessao - jaEnviado);
      const novaSessao = !sessaoRegistradaNoBanco;

      if (delta > 0 || novaSessao || finalizar) {
        await sincronizarDispositivo(delta, novaSessao);
        sessaoRegistradaNoBanco = true;
        sessionStorage.setItem("eetepa_tempo_enviado", String(jaEnviado + delta));
      }

      await upsertSessao(totalSessao, finalizar);
    } catch (e) {
      console.warn("[DispositivoTracker] sync:", e);
    } finally {
      salvando = false;
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      tick();
      paginaVisivel = false;
      ultimoTick = null;
      sincronizar(false);
    } else {
      paginaVisivel = true;
      ultimoTick = Date.now();
    }
  }

  function onPageHide() {
    tick();
    const totalSessao = tempoAcumuladoSessao;
    const jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
    const delta = Math.max(0, totalSessao - jaEnviado);

    if (!window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.key || !dispositivoId) return;
    const base = window.SUPABASE_CONFIG.url.replace(/\/$/, "");
    const key = window.SUPABASE_CONFIG.key;
    const headers = {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    };

    if (delta > 0) {
      fetch(`${base}/rest/v1/rpc/registrar_uso_dispositivo`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_dispositivo_id: dispositivoId,
          p_delta_segundos: delta,
          p_nova_sessao: !sessaoRegistradaNoBanco,
        }),
        keepalive: true,
      }).catch(() => {});
    }

    if (sessaoId) {
      fetch(`${base}/rest/v1/sessoes_uso?id=eq.${sessaoId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          tempo_uso_segundos: totalSessao,
          fim: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  function formatarTempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function atualizarUI() {
    const el = document.getElementById("device-info");
    if (!el) return;
    const idCurto = dispositivoId ? dispositivoId.slice(0, 8) : "—";
    const tempo = formatarTempo(tempoSessaoAtual());
    el.textContent = `${navigator.platform || ""} • ${new Date().toLocaleDateString("pt-BR")} • ID: ${idCurto}… • Uso: ${tempo}`;
  }

  function iniciar() {
    dispositivoId = obterDispositivoId();
    inicioSessao = Date.now();
    ultimoTick = Date.now();
    paginaVisivel = !document.hidden;
    tempoAcumuladoSessao = 0;
    sessaoRegistradaNoBanco = false;

    const sessaoSalva = sessionStorage.getItem(SESSION_KEY);
    if (sessaoSalva) sessaoId = sessaoSalva;
    sessionStorage.setItem("eetepa_tempo_enviado", "0");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    sincronizar(false);
    atualizarUI();

    clearInterval(syncTimer);
    clearInterval(uiTimer);

    syncTimer = setInterval(() => {
      if (paginaVisivel) {
        tick();
        sincronizar(false);
        atualizarUI();
      }
    }, SYNC_INTERVAL_MS);

    uiTimer = setInterval(() => {
      if (paginaVisivel) {
        tick();
        atualizarUI();
      }
    }, 5000);
  }

  return {
    iniciar,
    getId: () => dispositivoId,
    getTempoSessao: () => tempoSessaoAtual(),
    sincronizar,
  };
})();
