// ==================== RASTREAMENTO DE DISPOSITIVO E TEMPO DE USO ====================
var DispositivoTracker = (function () {
  var DEVICE_KEY = "eetepa_dispositivo_id";
  var SESSION_KEY = "eetepa_sessao_id";
  var SYNC_INTERVAL_MS = 30000;

  var dispositivoId = null;
  var sessaoId = null;
  var inicioSessao = null;
  var tempoAcumuladoSessao = 0;
  var ultimoTick = null;
  var paginaVisivel = true;
  var syncTimer = null;
  var uiTimer = null;
  var salvando = false;
  var sessaoRegistradaNoBanco = false;

  function gerarId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function obterDispositivoId() {
    var id = localStorage.getItem(DEVICE_KEY);
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
      resolucao: ((window.screen && window.screen.width) || 0) + "x" + ((window.screen && window.screen.height) || 0)
    };
  }

  function getDb() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.getSupabaseClient === "function") return window.getSupabaseClient();
    return null;
  }

  function tick() {
    if (!paginaVisivel || !ultimoTick) return;
    var agora = Date.now();
    var delta = Math.max(0, Math.floor((agora - ultimoTick) / 1000));
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
    var db = getDb();
    if (!db || !dispositivoId) return;
    var env = infoAmbiente();
    var delta = Math.max(0, Math.floor(deltaSegundos || 0));

    var rpcRes = await db.rpc("registrar_uso_dispositivo", {
      p_dispositivo_id: dispositivoId,
      p_delta_segundos: delta,
      p_nova_sessao: Boolean(isNovaSessao),
      p_user_agent: env.user_agent,
      p_plataforma: env.plataforma,
      p_idioma: env.idioma,
      p_resolucao: env.resolucao
    });

    if (!rpcRes.error) return;

    var agora = new Date().toISOString();
    var selRes = await db
      .from("dispositivos_acesso")
      .select("tempo_uso_segundos, sessoes, primeiro_acesso")
      .eq("dispositivo_id", dispositivoId)
      .maybeSingle();

    var existente = selRes.data;

    await db.from("dispositivos_acesso").upsert(
      {
        dispositivo_id: dispositivoId,
        user_agent: env.user_agent,
        plataforma: env.plataforma,
        idioma: env.idioma,
        resolucao: env.resolucao,
        primeiro_acesso: (existente && existente.primeiro_acesso) || agora,
        ultimo_acesso: agora,
        tempo_uso_segundos: ((existente && existente.tempo_uso_segundos) || 0) + delta,
        sessoes: ((existente && existente.sessoes) || 0) + (isNovaSessao ? 1 : 0)
      },
      { onConflict: "dispositivo_id" }
    );
  }

  async function upsertSessao(tempoSessao, finalizar) {
    var db = getDb();
    if (!db || !dispositivoId) return;
    var env = infoAmbiente();
    var agora = new Date().toISOString();

    if (!sessaoId) {
      var insRes = await db
        .from("sessoes_uso")
        .insert({
          dispositivo_id: dispositivoId,
          inicio: inicioSessao ? new Date(inicioSessao).toISOString() : agora,
          tempo_uso_segundos: tempoSessao,
          fim: finalizar ? agora : null,
          user_agent: env.user_agent,
          plataforma: env.plataforma
        })
        .select("id")
        .single();

      if (!insRes.error && insRes.data && insRes.data.id) {
        sessaoId = insRes.data.id;
        sessionStorage.setItem(SESSION_KEY, sessaoId);
      }
      return;
    }

    await db
      .from("sessoes_uso")
      .update({
        tempo_uso_segundos: tempoSessao,
        fim: finalizar ? agora : null
      })
      .eq("id", sessaoId);
  }

  async function sincronizar(finalizar) {
    var db = getDb();
    if (!db || salvando) return;
    salvando = true;
    try {
      var totalSessao = tempoSessaoAtual();
      var jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
      var delta = Math.max(0, totalSessao - jaEnviado);
      var novaSessao = !sessaoRegistradaNoBanco;

      if (delta > 0 || novaSessao || finalizar) {
        await sincronizarDispositivo(delta, novaSessao);
        sessaoRegistradaNoBanco = true;
        sessionStorage.setItem("eetepa_tempo_enviado", String(jaEnviado + delta));
      }

      await upsertSessao(totalSessao, Boolean(finalizar));
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
    var totalSessao = tempoAcumuladoSessao;
    var jaEnviado = parseInt(sessionStorage.getItem("eetepa_tempo_enviado") || "0", 10) || 0;
    var delta = Math.max(0, totalSessao - jaEnviado);
    var cfg = window.SUPABASE_CONFIG || {};

    if (!cfg.url || !cfg.key || !dispositivoId) return;
    var base = cfg.url.replace(/\/$/, "");
    var key = cfg.key;
    var headers = {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: "Bearer " + key,
      Prefer: "return=minimal"
    };

    if (delta > 0) {
      fetch(base + "/rest/v1/rpc/registrar_uso_dispositivo", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          p_dispositivo_id: dispositivoId,
          p_delta_segundos: delta,
          p_nova_sessao: !sessaoRegistradaNoBanco
        }),
        keepalive: true
      }).catch(function () {});
    }

    if (sessaoId) {
      fetch(base + "/rest/v1/sessoes_uso?id=eq." + sessaoId, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({
          tempo_uso_segundos: totalSessao,
          fim: new Date().toISOString()
        }),
        keepalive: true
      }).catch(function () {});
    }
  }

  function formatarTempo(segundos) {
    var h = Math.floor(segundos / 3600);
    var m = Math.floor((segundos % 3600) / 60);
    var s = segundos % 60;
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }

  function atualizarUI() {
    var el = document.getElementById("device-info");
    if (!el) return;
    var idCurto = dispositivoId ? dispositivoId.slice(0, 8) : "—";
    var tempo = formatarTempo(tempoSessaoAtual());
    el.textContent =
      (navigator.platform || "") +
      " • " +
      new Date().toLocaleDateString("pt-BR") +
      " • ID: " +
      idCurto +
      "… • Uso: " +
      tempo;
  }

  function iniciar() {
    dispositivoId = obterDispositivoId();
    inicioSessao = Date.now();
    ultimoTick = Date.now();
    paginaVisivel = !document.hidden;
    tempoAcumuladoSessao = 0;
    sessaoRegistradaNoBanco = false;

    var sessaoSalva = sessionStorage.getItem(SESSION_KEY);
    if (sessaoSalva) sessaoId = sessaoSalva;
    sessionStorage.setItem("eetepa_tempo_enviado", "0");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    atualizarUI();
    setTimeout(function () {
      sincronizar(false);
    }, 500);

    clearInterval(syncTimer);
    clearInterval(uiTimer);

    syncTimer = setInterval(function () {
      if (paginaVisivel) {
        tick();
        sincronizar(false);
        atualizarUI();
      }
    }, SYNC_INTERVAL_MS);

    uiTimer = setInterval(function () {
      if (paginaVisivel) {
        tick();
        atualizarUI();
      }
    }, 5000);
  }

  return {
    iniciar: iniciar,
    getId: function () {
      return dispositivoId;
    },
    getTempoSessao: function () {
      return tempoSessaoAtual();
    },
    sincronizar: sincronizar
  };
})();
