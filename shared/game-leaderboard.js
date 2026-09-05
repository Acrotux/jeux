(function () {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function refresh(game) {
    const el = document.getElementById("mini-leaderboard");
    if (!el || !window.JeuxAuth || !game) return;
    el.dataset.game = game;

    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured()) return;

    const rows = await window.JeuxAuth.fetchLeaderboard({ game, period: "all", limit: 3 });
    if (!rows || rows.length === 0 || rows.every((r) => r.points === 0)) {
      el.innerHTML = "";
      return;
    }

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
  }

  window.refreshMiniLeaderboard = refresh;

  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("mini-leaderboard");
    if (el && el.dataset.game) refresh(el.dataset.game);
  });
})();
