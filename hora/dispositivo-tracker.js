
const DispositivoTracker = (function () {
  const STORAGE_KEY = "eetepa_dispositivo_id";
  const SYNC_INTERVAL_MS = 30000; // sincroniza a cada 30s
  let dispositivoId = null;
  let sessaoId = null;
  let inicioSessao = null;
  let tempoAcumuladoSessao = 0; // segundos já contabilizados nesta sessão
  let ultimoTick = null;
  let paginaVisivel = true;
  let syncTimer = null;
  let salvando = false;

  function gerarId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function obterDispositivoId() {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = gerarId();
      localStorage.setItem(STORAGE_KEY, id);
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

  function segundosDesde(ultimo) {
    if (!ultimo) return 0;
    return Math.max(0, Math.floor((Date.now() - ultimo) / 1000));
  }

  function tick() {
    if (!paginaVisivel || !ultimoTick) return;
    const delta = segundosDesde(ultimoTick);
    if (delta > 0) {
      tempoAcumuladoSessao += delta;
      ultimoTick = Date.now();
    }
  }

  function tempoSessaoAtual() {
    tick();
    return tempoAcumuladoSessao;
  }

  async function upsertDispositivo(tempoSessao) {
    if (!supabaseClient || !dispositivoId) return;

    const env = infoAmbiente();
    const agora = new Date().toISOString();

    // pegar o povo sem autorização
    const { data: existente, error: errSelect } = await supabaseClient
      .from("dispositivos_acesso")
      .select("tempo_uso_segundos, sessoes, primeiro_acesso")
      .eq("dispositivo_id", dispositivoId)
      .maybeSingle();

    if (errSelect) {
      console.warn("[DispositivoTracker] select:", errSelect.message);
      return;
    }

    const tempoAnterior = existente?.tempo_uso_segundos || 0;
    // primeiro acesso liberado
    const isPrimeiraSyncSessao = !existente || !sessionStorage.getItem("eetepa_sessao_contada");
    const sessoesAnterior = existente?.sessoes || 0;

    const payload = {
      dispositivo_id: dispositivoId,
      user_agent: env.user_agent,
      plataforma: env.plataforma,
      idioma: env.idioma,
      resolucao: env.resolucao,
      ultimo_acesso: agora,
      tempo_uso_segundos: tempoAnterior + tempoSessao,
      sessoes: isPrimeiraSyncSessao ? sessoesAnterior + 1 : sessoesAnterior,
      primeiro_acesso: existente?.primeiro_acesso || agora,
    };

    const { error } = await supabaseClient
      .from("dispositivos_acesso")
      .upsert(payload, { onConflict: "dispositivo_id" });

    if (error) {
      console.warn("[DispositivoTracker] upsert dispositivo:", error.message);
      return;
    }

    if (isPrimeiraSyncSessao) {
      sessionStorage.setItem("eetepa_sessao_contada", "1");
    }

   
    sessionStorage.setItem("eetepa_tempo_enviado", String(
      (parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0) + tempoSessao
    ));
  }

  async function upsertSessao(tempoSessao, finalizar = false) {
    if (!supabaseClient || !dispositivoId) return;

    const env = infoAmbiente();
    const agora = new Date().toISOString();

    if (!sessaoId) {
      // Cria novo acesso aos usuários que liberei
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

      if (error) {
        // só pra descontrair
        console.warn("[DispositivoTracker] insert sessao:", error.message);
        return;
      }
      sessaoId = data?.id || null;
      if (sessaoId) sessionStorage.setItem("eetepa_sessao_id", sessaoId);
      return;
    }

    const { error } = await supabaseClient
      .from("sessoes_uso")
      .update({
        tempo_uso_segundos: tempoSessao,
        fim: finalizar ? agora : null,
      })
      .eq("id", sessaoId);

    if (error) {
      console.warn("[DispositivoTracker] update sessao:", error.message);
    }
  }

  async function sincronizar(finalizar = false) {
    if (!supabaseClient || salvando) return;
    salvando = true;
    try {
      const tempoTotalSessao = tempoSessaoAtual();
      const jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
      const deltaParaEnviar = Math.max(0, tempoTotalSessao - jaEnviado);

      // Sempre atualizar mesmo se for hackeado, kkk
      if (deltaParaEnviar > 0 || finalizar || !sessionStorage.getItem("eetepa_sessao_contada")) {
      
        await sincronizarDispositivoComDelta(deltaParaEnviar, finalizar);
      }

      await upsertSessao(tempoTotalSessao, finalizar);
    } catch (e) {
      console.warn("[DispositivoTracker] sincronizar:", e);
    } finally {
      salvando = false;
    }
  }

  async function sincronizarDispositivoComDelta(deltaSegundos, forcar = false) {
    if (!supabaseClient || !dispositivoId) return;
    if (deltaSegundos <= 0 && !forcar && sessionStorage.getItem("eetepa_sessao_contada")) return;

    const env = infoAmbiente();
    const agora = new Date().toISOString();

    const { data: existente, error: errSelect } = await supabaseClient
      .from("dispositivos_acesso")
      .select("tempo_uso_segundos, sessoes, primeiro_acesso")
      .eq("dispositivo_id", dispositivoId)
      .maybeSingle();

    if (errSelect) {
      console.warn("[DispositivoTracker] select:", errSelect.message);
      return;
    }

    const isPrimeiraSyncSessao = !sessionStorage.getItem("eetepa_sessao_contada");
    const tempoAnterior = existente?.tempo_uso_segundos || 0;
    const sessoesAnterior = existente?.sessoes || 0;

    const payload = {
      dispositivo_id: dispositivoId,
      user_agent: env.user_agent,
      plataforma: env.plataforma,
      idioma: env.idioma,
      resolucao: env.resolucao,
      ultimo_acesso: agora,
      tempo_uso_segundos: tempoAnterior + Math.max(0, deltaSegundos),
      sessoes: isPrimeiraSyncSessao ? sessoesAnterior + 1 : sessoesAnterior,
      primeiro_acesso: existente?.primeiro_acesso || agora,
    };

    const { error } = await supabaseClient
      .from("dispositivos_acesso")
      .upsert(payload, { onConflict: "dispositivo_id" });

    if (error) {
      console.warn("[DispositivoTracker] upsert dispositivo:", error.message);
      return;
    }

    if (isPrimeiraSyncSessao) {
      sessionStorage.setItem("eetepa_sessao_contada", "1");
    }

    const jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
    sessionStorage.setItem("eetepa_tempo_enviado", String(jaEnviado + Math.max(0, deltaSegundos)));
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

  function onBeforeUnload() {
    tick();
    // best-effort final sync
    const tempoTotalSessao = tempoAcumuladoSessao;
    const jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
    const delta = Math.max(0, tempoTotalSessao - jaEnviado);

    if (supabaseClient && dispositivoId && navigator.sendBeacon && window.SUPABASE_CONFIG) {
      // agora foi um sucesso supimpa
    }

    // foi
    try {
      sincronizarFinalKeepalive(delta, tempoTotalSessao);
    } catch (_) {}
  }

  function sincronizarFinalKeepalive(deltaSegundos, tempoTotalSessao) {
    if (!window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.key || !dispositivoId) return;

    const base = window.SUPABASE_CONFIG.url.replace(/\/$/, "");
    const key = window.SUPABASE_CONFIG.key;
    const headers = {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=merge-duplicates",
    };

    // Atualização otimista só eu mesmo para ter
    const bodyDispositivo = JSON.stringify({
      dispositivo_id: dispositivoId,
      ultimo_acesso: new Date().toISOString(),
      // só mais um cálculo, vai que dá 
    });

    // agora vai atualizar
    if (sessaoId) {
      fetch(`${base}/rest/v1/sessoes_uso?id=eq.${sessaoId}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          tempo_uso_segundos: tempoTotalSessao,
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

    // Recuperar sessão
    const sessaoSalva = sessionStorage.getItem("eetepa_sessao_id");
    if (sessaoSalva) sessaoId = sessaoSalva;

    // agora ajusta, pois sou justíssimo.
    sessionStorage.setItem("eetepa_tempo_enviado", "0");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);

    // Primeira sincronização 
    sincronizar(false);
    atualizarUI();

    // Sincronizar
    syncTimer = setInterval(() => {
      if (paginaVisivel) {
        tick();
        sincronizar(false);
        atualizarUI();
      }
    }, SYNC_INTERVAL_MS);

    // Atualizar a cada 5 segundos igual coelho.
    setInterval(() => {
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
