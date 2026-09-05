(function () {
  function activityCardHtml(activity) {
    return `
      <a class="game-card" href="${activity.path}">
        <div class="emoji">${activity.emoji}</div>
        <h2>${activity.name}</h2>
        <p>${activity.desc}</p>
        <div class="tag-row">
          ${activity.styles.map((s) => `<span class="tag">${s}</span>`).join("")}
          ${activity.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
      </a>`;
  }

  function renderRecentGames() {
    if (!window.GAMES || !window.buildGameActivities) return;
    const activities = window.buildGameActivities(window.GAMES);

    const byAdded = [...activities].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).slice(0, 3);
    const byUpdated = [...activities].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);

    document.getElementById("recent-added").innerHTML = byAdded.map(activityCardHtml).join("");
    document.getElementById("recent-updated").innerHTML = byUpdated.map(activityCardHtml).join("");
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
