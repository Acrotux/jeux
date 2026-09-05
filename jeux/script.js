(function () {
  const tabsEl = document.getElementById("style-tabs");
  const gridEl = document.getElementById("games-grid");
  let currentStyle = "";

  function cardHtml(game) {
    return `
      <a class="game-card" href="../${game.path}">
        <div class="emoji">${game.emoji}</div>
        <h2>${game.name}</h2>
        <p>${game.desc}</p>
        <div class="tag-row">
          ${game.styles.map((s) => `<span class="tag">${s}</span>`).join("")}
          ${game.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
      </a>`;
  }

  function render() {
    const games = window.GAMES.filter((g) => !currentStyle || g.styles.includes(currentStyle));
    gridEl.innerHTML = games.map(cardHtml).join("");
  }

  function init() {
    const styles = [...new Set(window.GAMES.flatMap((g) => g.styles))].sort();
    tabsEl.innerHTML =
      `<button class="style-tab active" data-style="">Tous</button>` +
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

  document.addEventListener("DOMContentLoaded", init);
})();
