(function () {
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

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.GAMES) return;
    document.getElementById("games-grid").innerHTML = window.GAMES.map(cardHtml).join("");
  });
})();
