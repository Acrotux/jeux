(function () {
  const listEl = document.getElementById("lb-list");
  const gameTabs = document.querySelectorAll("#lb-tabs .lb-tab");
  const periodTabs = document.querySelectorAll("#lb-period-tabs .lb-tab");
  let currentGame = "";
  let currentPeriod = "day";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderList(rows) {
    if (!window.JeuxAuth || !window.JeuxAuth.isConfigured()) {
      listEl.innerHTML = `<li class="lb-empty">Classement bientôt disponible.</li>`;
      return;
    }
    if (!rows || rows.length === 0) {
      listEl.innerHTML = `<li class="lb-empty">Connecte-toi et joue pour apparaître ici !</li>`;
      return;
    }
    listEl.innerHTML =
      rows
        .filter((r) => r.points > 0)
        .map(
          (r, i) => `
        <li class="lb-item">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-pseudo">${escapeHtml(r.pseudo)}</span>
          <span class="lb-points">${r.points} pts</span>
        </li>`
        )
        .join("") || `<li class="lb-empty">Connecte-toi et joue pour apparaître ici !</li>`;
  }

  async function loadLeaderboard() {
    if (!window.JeuxAuth) return;
    await window.JeuxAuth.ready();
    const rows = await window.JeuxAuth.fetchLeaderboard({
      game: currentGame || undefined,
      period: currentPeriod,
      limit: 10,
    });
    renderList(rows);
  }

  gameTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      gameTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentGame = tab.dataset.game;
      listEl.innerHTML = `<li class="lb-empty">Chargement…</li>`;
      loadLeaderboard();
    });
  });

  periodTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      periodTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentPeriod = tab.dataset.period;
      listEl.innerHTML = `<li class="lb-empty">Chargement…</li>`;
      loadLeaderboard();
    });
  });

  document.addEventListener("DOMContentLoaded", loadLeaderboard);
})();
