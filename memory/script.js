(function () {
  const EMOJIS = ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐙", "🦋", "🍉", "🍇", "🍓", "🍕", "⚽", "🎈", "🚀", "🌈", "🎲", "🎧"];

  const SIZE_CONFIG = {
    4: { cols: 4, rows: 4 },
    5: { cols: 5, rows: 4 },
    6: { cols: 6, rows: 5 },
  };

  const gridEl = document.getElementById("memory-grid");
  const timerEl = document.getElementById("timer");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const winModal = document.getElementById("win-modal");
  const winText = document.getElementById("win-text");

  let size = 4;
  let cards = [];
  let flipped = [];
  let matchedCount = 0;
  let totalPairs = 0;
  let moves = 0;
  let lock = false;
  let timerInterval = null;
  let seconds = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck(pairCount) {
    const chosen = shuffle(EMOJIS.slice()).slice(0, pairCount);
    return shuffle(chosen.concat(chosen));
  }

  function render() {
    const { cols, rows } = SIZE_CONFIG[size];
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.innerHTML = "";
    cards.forEach((emoji, i) => {
      const card = document.createElement("div");
      card.className = "mem-card";
      card.dataset.idx = i;
      card.innerHTML = `
        <div class="mem-card-inner">
          <div class="mem-face front">❓</div>
          <div class="mem-face back">${emoji}</div>
        </div>`;
      card.addEventListener("click", () => flipCard(i));
      gridEl.appendChild(card);
    });
  }

  function flipCard(i) {
    if (lock) return;
    const card = gridEl.children[i];
    if (card.classList.contains("flipped") || card.classList.contains("matched")) return;
    if (flipped.length >= 2) return;

    card.classList.add("flipped");
    flipped.push(i);

    if (flipped.length === 2) {
      moves++;
      movesEl.textContent = moves;
      checkMatch();
    }
  }

  function checkMatch() {
    const [a, b] = flipped;
    const cardA = gridEl.children[a];
    const cardB = gridEl.children[b];

    if (cards[a] === cards[b]) {
      cardA.classList.add("matched");
      cardB.classList.add("matched");
      flipped = [];
      matchedCount++;
      pairsEl.textContent = `${matchedCount}/${totalPairs}`;
      if (matchedCount === totalPairs) endGame();
      return;
    }

    lock = true;
    cardA.classList.add("mismatch");
    cardB.classList.add("mismatch");
    setTimeout(() => {
      cardA.classList.remove("flipped", "mismatch");
      cardB.classList.remove("flipped", "mismatch");
      flipped = [];
      lock = false;
    }, 700);
  }

  function startTimer() {
    stopTimer();
    seconds = 0;
    timerEl.textContent = "00:00";
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function computeScore() {
    return Math.max(0, totalPairs * 100 - seconds * 3 - moves * 5);
  }

  async function saveScore() {
    const statusEl = document.getElementById("win-save-status");
    if (!statusEl || !window.JeuxAuth) return;
    statusEl.textContent = "";
    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured()) return;
    if (!window.JeuxAuth.getSession()) {
      statusEl.textContent = "Connecte-toi pour enregistrer ce score.";
      return;
    }
    const score = computeScore();
    const res = await window.JeuxAuth.submitScore("memory", score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  function endGame() {
    stopTimer();
    winText.textContent = `Terminé en ${timerEl.textContent} avec ${moves} coup(s).`;
    setTimeout(() => winModal.classList.add("open"), 400);
    saveScore();
  }

  function newGame() {
    winModal.classList.remove("open");
    const { cols, rows } = SIZE_CONFIG[size];
    totalPairs = (cols * rows) / 2;
    cards = buildDeck(totalPairs);
    flipped = [];
    matchedCount = 0;
    moves = 0;
    lock = false;
    movesEl.textContent = "0";
    pairsEl.textContent = `0/${totalPairs}`;
    render();
    startTimer();
  }

  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".size-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      size = Number(btn.dataset.size);
      newGame();
    });
  });
  document.querySelector(`.size-btn[data-size="${size}"]`).classList.add("active");

  document.getElementById("new-game").addEventListener("click", newGame);
  document.getElementById("win-replay").addEventListener("click", newGame);

  newGame();
})();
