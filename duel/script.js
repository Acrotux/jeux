(function () {
  const GAME_LABELS = {};
  const GAME_PATHS = {};
  (window.SCORE_GAMES || []).forEach((s) => {
    GAME_LABELS[s.id] = s.label;
    GAME_PATHS[s.id] = `../${s.path}`;
  });

  const loggedOutEl = document.getElementById("duel-logged-out");
  const notConfiguredEl = document.getElementById("duel-not-configured");
  const contentEl = document.getElementById("duel-content");

  const searchInput = document.getElementById("duel-search-input");
  const searchResultsEl = document.getElementById("duel-search-results");
  const gameSelect = document.getElementById("duel-game-select");
  const sendBtn = document.getElementById("duel-send-btn");
  const formMessageEl = document.getElementById("duel-form-message");

  const receivedEl = document.getElementById("duel-received");
  const activeEl = document.getElementById("duel-active");
  const historyEl = document.getElementById("duel-history");

  let selectedOpponent = null;
  let searchTimer = null;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }

  function hoursLeft(expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 3600000));
  }

  searchInput.addEventListener("input", () => {
    selectedOpponent = null;
    sendBtn.disabled = true;
    clearTimeout(searchTimer);
    const query = searchInput.value;
    if (query.trim().length < 2) {
      searchResultsEl.classList.remove("open");
      return;
    }
    searchTimer = setTimeout(async () => {
      const results = await window.JeuxAuth.searchProfiles(query);
      searchResultsEl.innerHTML = results
        .map(
          (r) =>
            `<div class="result" data-id="${escapeHtml(r.id)}" data-pseudo="${escapeHtml(r.pseudo)}">${escapeHtml(r.pseudo)}</div>`
        )
        .join("");
      searchResultsEl.classList.toggle("open", results.length > 0);
    }, 250);
  });

  searchResultsEl.addEventListener("click", (e) => {
    const item = e.target.closest(".result");
    if (!item) return;
    selectedOpponent = { id: item.dataset.id, pseudo: item.dataset.pseudo };
    searchInput.value = item.dataset.pseudo;
    searchResultsEl.classList.remove("open");
    sendBtn.disabled = false;
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".duel-search")) searchResultsEl.classList.remove("open");
  });

  sendBtn.addEventListener("click", async () => {
    if (!selectedOpponent) return;
    formMessageEl.textContent = "";
    try {
      await window.JeuxAuth.createChallenge(selectedOpponent.id, gameSelect.value);
      formMessageEl.textContent = `Duel envoyé à ${selectedOpponent.pseudo} !`;
      searchInput.value = "";
      selectedOpponent = null;
      sendBtn.disabled = true;
      loadChallenges();
    } catch (err) {
      formMessageEl.textContent = "Impossible d'envoyer ce duel.";
    }
  });

  function scorePairHtml(c) {
    const challengerWins = c.challenger_score > c.opponent_score;
    const opponentWins = c.opponent_score > c.challenger_score;
    return `
      <div class="duel-score-pair">
        <span class="${challengerWins ? "winner" : ""}">${escapeHtml(c.challenger_pseudo)} ${c.challenger_score ?? 0}</span>
        <span class="vs">vs</span>
        <span class="${opponentWins ? "winner" : ""}">${c.opponent_score ?? 0} ${escapeHtml(c.opponent_pseudo)}</span>
      </div>`;
  }

  function deleteBtnHtml(id) {
    return `<button class="btn-secondary btn duel-delete" data-delete="${id}" title="Supprimer" aria-label="Supprimer">🗑️</button>`;
  }

  function renderReceived(list) {
    if (list.length === 0) {
      receivedEl.innerHTML = `<p class="duel-empty">Aucun duel en attente de ta réponse.</p>`;
      return;
    }
    receivedEl.innerHTML = list
      .map(
        (c) => `
        <div class="duel-card">
          <div class="duel-info">
            <div class="duel-game-label">${GAME_LABELS[c.game]}</div>
            <div class="duel-sub">${escapeHtml(c.challenger_pseudo)} te défie en duel · ${fmtDate(c.created_at)}</div>
          </div>
          <button class="btn" data-accept="${c.id}">Accepter</button>
          <button class="btn-secondary btn" data-decline="${c.id}">Refuser</button>
          ${deleteBtnHtml(c.id)}
        </div>`
      )
      .join("");
  }

  function renderActive(list) {
    if (list.length === 0) {
      activeEl.innerHTML = `<p class="duel-empty">Aucun duel en cours.</p>`;
      return;
    }
    activeEl.innerHTML = list
      .map(
        (c) => `
        <div class="duel-card">
          <div class="duel-info">
            <div class="duel-game-label">${GAME_LABELS[c.game]}</div>
            <div class="duel-sub">${escapeHtml(c.challenger_pseudo)} vs ${escapeHtml(c.opponent_pseudo)} · ${hoursLeft(c.expires_at)}h restantes</div>
          </div>
          ${scorePairHtml(c)}
          <a class="btn" href="${GAME_PATHS[c.game]}">Jouer</a>
          ${deleteBtnHtml(c.id)}
        </div>`
      )
      .join("");
  }

  function renderHistory(list) {
    if (list.length === 0) {
      historyEl.innerHTML = `<p class="duel-empty">Pas encore de duel terminé.</p>`;
      return;
    }
    historyEl.innerHTML = list
      .map((c) => {
        let resultLabel;
        if (c.status === "pending" && c.invited_email) resultLabel = "En attente d'inscription";
        else if (c.status === "pending") resultLabel = "En attente de réponse";
        else if (c.status === "declined") resultLabel = "Refusé";
        else if (c.status === "cancelled") resultLabel = "Annulé";
        else {
          const cs = c.challenger_score ?? 0;
          const os = c.opponent_score ?? 0;
          resultLabel =
            cs === os ? "Égalité" : `${escapeHtml(cs > os ? c.challenger_pseudo : c.opponent_pseudo)} a gagné`;
        }
        return `
          <div class="duel-card">
            <div class="duel-info">
              <div class="duel-game-label">${GAME_LABELS[c.game]}</div>
              <div class="duel-sub">${escapeHtml(c.challenger_pseudo)} vs ${escapeHtml(c.opponent_pseudo)} · ${resultLabel}</div>
            </div>
            ${c.status === "accepted" ? scorePairHtml(c) : ""}
            ${deleteBtnHtml(c.id)}
          </div>`;
      })
      .join("");
  }

  async function loadChallenges() {
    const uid = window.JeuxAuth.getSession().user.id;
    const all = await window.JeuxAuth.listChallenges();
    const now = Date.now();

    const received = all.filter((c) => c.status === "pending" && c.opponent_id === uid);
    const active = all.filter((c) => c.status === "accepted" && new Date(c.expires_at).getTime() > now);
    const history = all.filter(
      (c) =>
        c.status === "declined" ||
        c.status === "cancelled" ||
        (c.status === "accepted" && new Date(c.expires_at).getTime() <= now) ||
        (c.status === "pending" && c.challenger_id === uid)
    );

    renderReceived(received);
    renderActive(active);
    renderHistory(history);

    receivedEl.querySelectorAll("[data-accept]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await window.JeuxAuth.respondChallenge(btn.dataset.accept, true);
        loadChallenges();
      })
    );
    receivedEl.querySelectorAll("[data-decline]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await window.JeuxAuth.respondChallenge(btn.dataset.decline, false);
        loadChallenges();
      })
    );
  }

  async function render() {
    if (!window.JeuxAuth || !window.JeuxAuth.isConfigured()) {
      notConfiguredEl.style.display = "block";
      return;
    }
    const session = window.JeuxAuth.getSession();
    if (!session) {
      loggedOutEl.style.display = "block";
      contentEl.style.display = "none";
      return;
    }
    loggedOutEl.style.display = "none";
    notConfiguredEl.style.display = "none";
    contentEl.style.display = "block";
    loadChallenges();
  }

  document.getElementById("duel-login-btn").addEventListener("click", () => {
    if (window.AuthWidget) window.AuthWidget.open();
  });

  // ===== Bascule pseudo / email =====
  const modeButtons = document.querySelectorAll(".duel-mode-btn");
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.mode;
      document.getElementById("duel-mode-pseudo").style.display = mode === "pseudo" ? "flex" : "none";
      document.getElementById("duel-mode-email").style.display = mode === "email" ? "flex" : "none";
      formMessageEl.textContent = "";
    });
  });

  // ===== Envoi par email =====
  const emailInput = document.getElementById("duel-email-input");
  const emailGameSelect = document.getElementById("duel-email-game-select");
  const emailSendBtn = document.getElementById("duel-email-send-btn");

  emailSendBtn.addEventListener("click", async () => {
    const emails = emailInput.value
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;

    formMessageEl.textContent = "Envoi en cours…";
    emailSendBtn.disabled = true;

    const results = await Promise.allSettled(
      emails.map((email) => window.JeuxAuth.inviteDuel(email, emailGameSelect.value))
    );

    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - okCount;
    formMessageEl.textContent =
      failCount === 0
        ? `Duel envoyé à ${okCount} personne${okCount > 1 ? "s" : ""} !`
        : `${okCount} duel(s) envoyé(s), ${failCount} échec(s) (email invalide ou déjà défié ?).`;

    emailSendBtn.disabled = false;
    if (okCount > 0) {
      emailInput.value = "";
      loadChallenges();
    }
  });

  document.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-delete]");
    if (!delBtn) return;
    if (!confirm("Supprimer définitivement ce duel ?")) return;
    await window.JeuxAuth.deleteChallenge(delBtn.dataset.delete);
    loadChallenges();
  });

  function populateGameSelects() {
    const optionsHtml = (window.SCORE_GAMES || [])
      .map((s) => `<option value="${s.id}">${s.label}</option>`)
      .join("");
    gameSelect.innerHTML = optionsHtml;
    document.getElementById("duel-email-game-select").innerHTML = optionsHtml;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    populateGameSelects();
    if (!window.JeuxAuth) return;
    await window.JeuxAuth.ready();
    render();
    window.JeuxAuth.onChange(render);
  });
})();
