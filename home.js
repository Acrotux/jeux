(function () {
  function gameCardHtml(game) {
    return `
      <a class="game-card" href="${game.path}">
        <div class="emoji">${game.emoji}</div>
        <h2>${game.name}</h2>
        <p>${game.desc}</p>
        <div class="tag-row">
          ${game.styles.map((s) => `<span class="tag">${s}</span>`).join("")}
        </div>
      </a>`;
  }

  function renderRecentGames() {
    if (!window.GAMES) return;

    const byAdded = [...window.GAMES].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).slice(0, 3);
    const byUpdated = [...window.GAMES].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);

    document.getElementById("recent-added").innerHTML = byAdded.map(gameCardHtml).join("");
    document.getElementById("recent-updated").innerHTML = byUpdated.map(gameCardHtml).join("");
  }

  async function loadDuelBanner() {
    const slot = document.getElementById("duel-banner-slot");
    if (!slot || !window.JeuxAuth) return;
    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured() || !window.JeuxAuth.getSession()) return;
    const all = await window.JeuxAuth.listChallenges();
    const uid = window.JeuxAuth.getSession().user.id;
    const pending = all.filter((c) => c.status === "pending" && c.opponent_id === uid);
    if (pending.length === 0) return;
    slot.innerHTML = `
      <div class="duel-banner">
        ⚔️ ${pending.length} duel${pending.length > 1 ? "s" : ""} en attente de ta réponse —
        <a href="duel/index.html">voir</a>
      </div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderRecentGames();
    loadDuelBanner();
  });
})();
