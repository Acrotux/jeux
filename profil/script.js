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
    if (profile && profile.avatar_url) {
      avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="" />`;
    } else {
      avatarEl.textContent = label.slice(0, 2).toUpperCase();
    }
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

  document.getElementById("profil-avatar-btn").addEventListener("click", () => {
    document.getElementById("profil-avatar-input").click();
  });

  document.getElementById("profil-avatar-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById("profil-avatar-status");
    statusEl.textContent = "Envoi en cours…";
    try {
      await window.JeuxAuth.uploadAvatar(file);
      statusEl.textContent = "Photo mise à jour !";
      render();
    } catch (err) {
      statusEl.textContent = err && err.message ? err.message : "Impossible d'envoyer cette image.";
    }
    e.target.value = "";
  });

  document.getElementById("profil-delete-account").addEventListener("click", async () => {
    const statusEl = document.getElementById("profil-delete-status");
    const confirmation = prompt(
      'Cette action est irréversible et supprime tout ton compte (scores, défis, photo).\nTape SUPPRIMER pour confirmer.'
    );
    if (confirmation !== "SUPPRIMER") return;
    statusEl.textContent = "Suppression en cours…";
    try {
      await window.JeuxAuth.deleteAccount();
      window.location.href = "../index.html";
    } catch (err) {
      statusEl.textContent = "Impossible de supprimer le compte pour le moment. Réessaie plus tard.";
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.JeuxAuth) return;
    await window.JeuxAuth.ready();
    render();
    window.JeuxAuth.onChange(render);
  });
})();
