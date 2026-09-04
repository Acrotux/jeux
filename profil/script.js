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

  const loggedOutEl = document.getElementById("profil-logged-out");
  const notConfiguredEl = document.getElementById("profil-not-configured");
  const loggedInEl = document.getElementById("profil-logged-in");
  const avatarEl = document.getElementById("profil-avatar");
  const pseudoEl = document.getElementById("profil-pseudo");
  const emailEl = document.getElementById("profil-email");
  const statsEl = document.getElementById("profil-stats");
  const historyEl = document.getElementById("profil-history");

  function fmtDate(iso) {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }

  async function render() {
    if (!window.JeuxAuth || !window.JeuxAuth.isConfigured()) {
      notConfiguredEl.style.display = "block";
      return;
    }

    const session = window.JeuxAuth.getSession();
    const profile = window.JeuxAuth.getProfile();

    if (!session) {
      loggedOutEl.style.display = "block";
      loggedInEl.style.display = "none";
      return;
    }

    loggedOutEl.style.display = "none";
    notConfiguredEl.style.display = "none";
    loggedInEl.style.display = "block";

    const label = profile && profile.pseudo ? profile.pseudo : "…";
    pseudoEl.textContent = label;
    avatarEl.textContent = label.slice(0, 2).toUpperCase();
    emailEl.textContent = session.user.email || "";

    const scores = await window.JeuxAuth.myScores(50);

    const totalPoints = scores.reduce((sum, s) => sum + s.score, 0);
    const gamesPlayed = scores.length;
    statsEl.innerHTML = `
      <div class="stat"><div class="value">${totalPoints}</div><div class="label">Points cumulés</div></div>
      <div class="stat"><div class="value">${gamesPlayed}</div><div class="label">Parties enregistrées</div></div>
    `;

    if (scores.length === 0) {
      historyEl.innerHTML = `<p class="profil-empty">Aucun score enregistré pour l'instant — va jouer !</p>`;
      return;
    }

    historyEl.innerHTML = scores
      .map(
        (s) => `
        <div class="profil-row">
          <span class="game-tag">${GAME_LABELS[s.game] || s.game}</span>
          <span class="date">${fmtDate(s.created_at)}</span>
          <span class="score">${s.score} pts</span>
        </div>`
      )
      .join("");
  }

  document.getElementById("profil-login-btn").addEventListener("click", () => {
    if (window.AuthWidget) window.AuthWidget.open();
  });

  document.getElementById("profil-logout").addEventListener("click", async () => {
    await window.JeuxAuth.signOut();
    render();
  });

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.JeuxAuth) return;
    await window.JeuxAuth.ready();
    render();
    window.JeuxAuth.onChange(render);
  });
})();
