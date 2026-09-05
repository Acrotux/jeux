(function () {
  const GAME_LABELS = {
    sudoku: "🔢 Sudoku",
    pendu: "🪢 Pendu",
    memory: "🧠 Memory",
    mastermind: "🎯 Mastermind",
    musique: "🎵 Musique",
    vitesse: "⚡ Vitesse",
    precision: "🎯 Précision",
  };
  const GAME_PATHS = {
    sudoku: "../sudoku/index.html",
    pendu: "../pendu/index.html",
    memory: "../memory/index.html",
    mastermind: "../mastermind/index.html",
    musique: "../musique/index.html",
    vitesse: "../vitesse/index.html",
    precision: "../precision/index.html",
  };

  const loggedOutEl = document.getElementById("defis-logged-out");
  const notConfiguredEl = document.getElementById("defis-not-configured");
  const contentEl = document.getElementById("defis-content");

  const searchInput = document.getElementById("defis-search-input");
  const searchResultsEl = document.getElementById("defis-search-results");
  const gameSelect = document.getElementById("defis-game-select");
  const sendBtn = document.getElementById("defis-send-btn");
  const formMessageEl = document.getElementById("defis-form-message");

  const receivedEl = document.getElementById("defis-received");
  const activeEl = document.getElementById("defis-active");
  const historyEl = document.getElementById("defis-history");

  let selectedOpponent = null;
  let searchTimer = null;

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
        .map((r) => `<div class="result" data-id="${r.id}" data-pseudo="${r.pseudo}">${r.pseudo}</div>`)
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
    if (!e.target.closest(".defis-search")) searchResultsEl.classList.remove("open");
  });

  sendBtn.addEventListener("click", async () => {
    if (!selectedOpponent) return;
    formMessageEl.textContent = "";
    try {
      await window.JeuxAuth.createChallenge(selectedOpponent.id, gameSelect.value);
      formMessageEl.textContent = `Défi envoyé à ${selectedOpponent.pseudo} !`;
      searchInput.value = "";
      selectedOpponent = null;
      sendBtn.disabled = true;
      loadChallenges();
    } catch (err) {
      formMessageEl.textContent = "Impossible d'envoyer ce défi.";
    }
  });

  function scorePairHtml(c) {
    const challengerWins = c.challenger_score > c.opponent_score;
    const opponentWins = c.opponent_score > c.challenger_score;
    return `
      <div class="defis-score-pair">
        <span class="${challengerWins ? "winner" : ""}">${c.challenger_pseudo} ${c.challenger_score ?? 0}</span>
        <span class="vs">vs</span>
        <span class="${opponentWins ? "winner" : ""}">${c.opponent_score ?? 0} ${c.opponent_pseudo}</span>
      </div>`;
  }

  function deleteBtnHtml(id) {
    return `<button class="btn-secondary btn defis-delete" data-delete="${id}" title="Supprimer" aria-label="Supprimer">🗑️</button>`;
  }

  function renderReceived(list) {
    if (list.length === 0) {
      receivedEl.innerHTML = `<p class="defis-empty">Aucun défi en attente de ta réponse.</p>`;
      return;
    }
    receivedEl.innerHTML = list
      .map(
        (c) => `
        <div class="defis-card">
          <div class="defis-info">
            <div class="defis-game-label">${GAME_LABELS[c.game]}</div>
            <div class="defis-sub">${c.challenger_pseudo} te défie · ${fmtDate(c.created_at)}</div>
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
      activeEl.innerHTML = `<p class="defis-empty">Aucun défi en cours.</p>`;
      return;
    }
    activeEl.innerHTML = list
      .map(
        (c) => `
        <div class="defis-card">
          <div class="defis-info">
            <div class="defis-game-label">${GAME_LABELS[c.game]}</div>
            <div class="defis-sub">${c.challenger_pseudo} vs ${c.opponent_pseudo} · ${hoursLeft(c.expires_at)}h restantes</div>
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
      historyEl.innerHTML = `<p class="defis-empty">Pas encore de défi terminé.</p>`;
      return;
    }
    historyEl.innerHTML = list
      .map((c) => {
        let resultLabel;
        if (c.status === "pending") resultLabel = "En attente de réponse";
        else if (c.status === "declined") resultLabel = "Refusé";
        else if (c.status === "cancelled") resultLabel = "Annulé";
        else {
          const cs = c.challenger_score ?? 0;
          const os = c.opponent_score ?? 0;
          resultLabel = cs === os ? "Égalité" : `${cs > os ? c.challenger_pseudo : c.opponent_pseudo} a gagné`;
        }
        return `
          <div class="defis-card">
            <div class="defis-info">
              <div class="defis-game-label">${GAME_LABELS[c.game]}</div>
              <div class="defis-sub">${c.challenger_pseudo} vs ${c.opponent_pseudo} · ${resultLabel}</div>
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

  document.getElementById("defis-login-btn").addEventListener("click", () => {
    if (window.AuthWidget) window.AuthWidget.open();
  });

  document.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-delete]");
    if (!delBtn) return;
    if (!confirm("Supprimer définitivement ce défi ?")) return;
    await window.JeuxAuth.deleteChallenge(delBtn.dataset.delete);
    loadChallenges();
  });

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.JeuxAuth) return;
    await window.JeuxAuth.ready();
    render();
    window.JeuxAuth.onChange(render);
  });
})();
