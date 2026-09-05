(function () {
  const COLORS = ["#e2513f", "#4f6df5", "#2fb380", "#ffce45", "#ff8a5c", "#8a5cff", "#5cc8ff", "#c05cd9"];

  const DIFFICULTIES = {
    facile: { pegs: 4, colors: 4, attempts: 10 },
    moyen: { pegs: 4, colors: 6, attempts: 10 },
    difficile: { pegs: 5, colors: 8, attempts: 10 },
  };
  const SCORE_MULTIPLIER = { facile: 1, moyen: 1.3, difficile: 1.6 };

  const currentEl = document.getElementById("mm-current");
  const paletteEl = document.getElementById("mm-palette");
  const historyEl = document.getElementById("mm-history");
  const attemptsEl = document.getElementById("attempts-left");
  const endModal = document.getElementById("end-modal");
  const endTitle = document.getElementById("end-title");
  const endText = document.getElementById("end-text");

  let difficulty = "moyen";
  let config = DIFFICULTIES[difficulty];
  let secret = [];
  let guess = [];
  let history = [];
  let selectedColor = 0;
  let over = false;

  function randomSecret() {
    return Array.from({ length: config.pegs }, () => Math.floor(Math.random() * config.colors));
  }

  function renderPalette() {
    paletteEl.innerHTML = "";
    for (let i = 0; i < config.colors; i++) {
      const btn = document.createElement("button");
      btn.className = "mm-color-btn" + (i === selectedColor ? " selected" : "");
      btn.style.background = COLORS[i];
      btn.addEventListener("click", () => {
        selectedColor = i;
        renderPalette();
      });
      paletteEl.appendChild(btn);
    }
  }

  function renderCurrent() {
    currentEl.innerHTML = "";
    guess.forEach((val, i) => {
      const slot = document.createElement("div");
      slot.className = "mm-slot" + (val !== null ? " filled" : "");
      if (val !== null) slot.style.background = COLORS[val];
      slot.addEventListener("click", () => {
        if (over) return;
        guess[i] = val !== null ? null : selectedColor;
        renderCurrent();
      });
      currentEl.appendChild(slot);
    });
  }

  function computeFeedback(secretArr, guessArr) {
    let black = 0;
    const secretRemain = [];
    const guessRemain = [];
    for (let i = 0; i < secretArr.length; i++) {
      if (guessArr[i] === secretArr[i]) black++;
      else {
        secretRemain.push(secretArr[i]);
        guessRemain.push(guessArr[i]);
      }
    }
    let white = 0;
    const counts = {};
    secretRemain.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    guessRemain.forEach((c) => {
      if (counts[c] > 0) {
        white++;
        counts[c]--;
      }
    });
    return { black, white };
  }

  function renderHistory() {
    historyEl.innerHTML = history
      .map((entry, i) => {
        const pegs = entry.guess
          .map((c) => `<div class="mm-peg" style="background:${COLORS[c]}"></div>`)
          .join("");
        const fbPegs = [];
        for (let k = 0; k < entry.black; k++) fbPegs.push('<div class="mm-fb-peg black"></div>');
        for (let k = 0; k < entry.white; k++) fbPegs.push('<div class="mm-fb-peg white"></div>');
        while (fbPegs.length < config.pegs) fbPegs.push('<div class="mm-fb-peg"></div>');
        return `
          <div class="mm-row">
            <span class="mm-row-number">#${i + 1}</span>
            <div class="mm-guess">${pegs}</div>
            <div class="mm-feedback">${fbPegs.join("")}</div>
          </div>`;
      })
      .join("");
  }

  function computeScore() {
    const base = Math.max(0, (config.attempts - history.length + 1) * 100);
    return Math.round(base * (SCORE_MULTIPLIER[difficulty] || 1));
  }

  async function saveScore(won) {
    const statusEl = document.getElementById("end-save-status");
    if (!statusEl || !window.JeuxAuth) return;
    statusEl.textContent = "";
    if (!won) return;
    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured()) return;
    if (!window.JeuxAuth.getSession()) {
      statusEl.textContent = "Connecte-toi pour enregistrer ce score.";
      return;
    }
    const score = computeScore();
    const res = await window.JeuxAuth.submitScore("mastermind", score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  function endGame(won) {
    over = true;
    const secretPegs = secret.map((c) => `<div class="mm-peg" style="background:${COLORS[c]}"></div>`).join("");
    endTitle.textContent = won ? "🎉 Gagné !" : "💀 Perdu";
    endText.innerHTML = won
      ? `Trouvé en ${history.length} essai(s) !`
      : `La combinaison était : <div class="mm-guess" style="display:inline-flex;gap:6px;vertical-align:middle;">${secretPegs}</div>`;
    endModal.classList.add("open");
    saveScore(won);
  }

  function submitGuess() {
    if (over) return;
    if (guess.some((v) => v === null)) return;
    const fb = computeFeedback(secret, guess);
    history.push({ guess: guess.slice(), black: fb.black, white: fb.white });
    renderHistory();
    attemptsEl.textContent = config.attempts - history.length;

    if (fb.black === config.pegs) {
      endGame(true);
      return;
    }
    if (history.length >= config.attempts) {
      endGame(false);
      return;
    }
    guess = new Array(config.pegs).fill(null);
    renderCurrent();
  }

  function newGame() {
    endModal.classList.remove("open");
    config = DIFFICULTIES[difficulty];
    secret = randomSecret();
    guess = new Array(config.pegs).fill(null);
    history = [];
    over = false;
    selectedColor = 0;
    attemptsEl.textContent = config.attempts;
    renderPalette();
    renderCurrent();
    renderHistory();
  }

  function startWithDifficulty(diff) {
    difficulty = diff;
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game-content").style.display = "block";
    newGame();
  }

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => startWithDifficulty(btn.dataset.diff));
  });

  document.getElementById("change-setup").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("game-content").style.display = "none";
    document.getElementById("setup-screen").style.display = "block";
  });

  document.getElementById("mm-clear").addEventListener("click", () => {
    if (over) return;
    guess = new Array(config.pegs).fill(null);
    renderCurrent();
  });
  document.getElementById("mm-submit").addEventListener("click", submitGuess);
  document.getElementById("new-game").addEventListener("click", newGame);
  document.getElementById("end-replay").addEventListener("click", newGame);

  // Arrivée directe sur une difficulté précise (?difficulty=facile|moyen|difficile)
  const urlDifficulty = new URLSearchParams(location.search).get("difficulty");
  if (urlDifficulty && DIFFICULTIES[urlDifficulty]) {
    startWithDifficulty(urlDifficulty);
  }
})();
