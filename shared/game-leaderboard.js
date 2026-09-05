(function () {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const el = document.getElementById("mini-leaderboard");
    if (!el || !window.JeuxAuth) return;
    const game = el.dataset.game;

    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured()) return;

    const rows = await window.JeuxAuth.fetchLeaderboard({ game, period: "all", limit: 3 });
    if (!rows || rows.length === 0 || rows.every((r) => r.points === 0)) return;

    el.innerHTML = `
      <div class="mini-lb-title">🏆 Top 3 — tous joueurs</div>
      <ol class="mini-lb-list">
        ${rows
          .filter((r) => r.points > 0)
          .map(
            (r, i) => `
            <li>
              <span class="mini-lb-rank">${i + 1}</span>
              <span class="mini-lb-pseudo">${escapeHtml(r.pseudo)}</span>
              <span class="mini-lb-points">${r.points} pts</span>
            </li>`
          )
          .join("")}
      </ol>`;
  });
})();
