(function () {
  const tabsEl = document.getElementById("style-tabs");
  const gridEl = document.getElementById("games-grid");
  let currentStyle = "";
  let activities = [];

  function cardHtml(activity) {
    return `
      <a class="game-card" href="../${activity.path}">
        <div class="emoji">${activity.emoji}</div>
        <h2>${activity.name}</h2>
        <p>${activity.desc}</p>
        <div class="tag-row">
          ${activity.styles.map((s) => `<span class="tag">${s}</span>`).join("")}
          ${activity.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
      </a>`;
  }

  function render() {
    const filtered = activities.filter((a) => !currentStyle || a.styles.includes(currentStyle));
    gridEl.innerHTML = filtered.map(cardHtml).join("");
  }

  function init() {
    activities = window.buildGameActivities(window.GAMES);
    const styles = [...new Set(window.GAMES.flatMap((g) => g.styles))].sort();

    tabsEl.innerHTML =
      `<button class="style-tab active" data-style="">Tous les jeux</button>` +
      styles.map((s) => `<button class="style-tab" data-style="${s}">${s}</button>`).join("");

    tabsEl.querySelectorAll(".style-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabsEl.querySelectorAll(".style-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentStyle = btn.dataset.style;
        render();
      });
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.GAMES) return;
    init();
  });
})();
