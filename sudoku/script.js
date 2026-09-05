(function () {
  const gridEl = document.getElementById("grid");
  const timerEl = document.getElementById("timer");
  const errorsEl = document.getElementById("errors");
  const remainingEl = document.getElementById("remaining");
  const winModal = document.getElementById("win-modal");
  const winText = document.getElementById("win-text");

  const DIFFICULTIES = { facile: 36, moyen: 46, difficile: 54 }; // cases retirées
  const SCORE_MULTIPLIER = { facile: 1, moyen: 1.3, difficile: 1.6 };
  let difficulty = "moyen";
  let solution = [];
  let board = []; // valeurs actuelles saisies par le joueur (0 = vide)
  let given = [];  // cases fixées au départ
  let selected = -1;
  let errorCount = 0;
  let timerInterval = null;
  let seconds = 0;
  let timerStarted = false;
  let solved = false;

  function idx(r, c) { return r * 9 + c; }

  // ---- Génération d'une grille valide complète (backtracking) ----
  function shuffledDigits() {
    const d = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function isValidPlacement(grid, r, c, val) {
    for (let i = 0; i < 9; i++) {
      if (grid[idx(r, i)] === val) return false;
      if (grid[idx(i, c)] === val) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[idx(br + i, bc + j)] === val) return false;
      }
    }
    return true;
  }

  function fillGrid(grid, pos) {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    if (grid[pos] !== 0) return fillGrid(grid, pos + 1);
    for (const val of shuffledDigits()) {
      if (isValidPlacement(grid, r, c, val)) {
        grid[pos] = val;
        if (fillGrid(grid, pos + 1)) return true;
        grid[pos] = 0;
      }
    }
    return false;
  }

  function generateSolution() {
    const grid = new Array(81).fill(0);
    fillGrid(grid, 0);
    return grid;
  }

  function generatePuzzle(diffKey) {
    solution = generateSolution();
    board = solution.slice();
    given = new Array(81).fill(true);

    const cellsToRemove = DIFFICULTIES[diffKey];
    const order = [...Array(81).keys()];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 0; i < cellsToRemove; i++) {
      const p = order[i];
      board[p] = 0;
      given[p] = false;
    }
  }

  // ---- Rendu ----
  function render() {
    gridEl.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = idx(r, c);
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.idx = p;
        if (given[p]) cell.classList.add("given");
        if (board[p] !== 0) cell.textContent = board[p];
        if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("thick-bottom");
        cell.addEventListener("click", () => selectCell(p));
        gridEl.appendChild(cell);
      }
    }
    updateHighlights();
    updateRemaining();
  }

  function selectCell(p) {
    if (solved) return;
    selected = p;
    updateHighlights();
  }

  function updateHighlights() {
    const cells = gridEl.children;
    const selR = selected >= 0 ? Math.floor(selected / 9) : -1;
    const selC = selected >= 0 ? selected % 9 : -1;
    const selVal = selected >= 0 ? board[selected] : 0;

    for (let p = 0; p < 81; p++) {
      const cell = cells[p];
      cell.classList.remove("selected", "peer", "same-value", "error", "error-bg");
      if (selected < 0) continue;
      const r = Math.floor(p / 9);
      const c = p % 9;
      const sameBox = Math.floor(r / 3) === Math.floor(selR / 3) && Math.floor(c / 3) === Math.floor(selC / 3);
      if (p === selected) {
        cell.classList.add("selected");
      } else if (r === selR || c === selC || sameBox) {
        cell.classList.add("peer");
      }
      if (selVal !== 0 && board[p] === selVal && p !== selected) {
        cell.classList.add("same-value");
      }
    }
  }

  function updateRemaining() {
    const left = board.filter((v) => v === 0).length;
    remainingEl.textContent = left;
  }

  // ---- Saisie ----
  function inputValue(val) {
    if (selected < 0 || solved) return;
    if (given[selected]) return;
    const cells = gridEl.children;
    const cell = cells[selected];

    if (val === 0) {
      board[selected] = 0;
      cell.textContent = "";
      cell.classList.remove("error");
      updateRemaining();
      return;
    }

    if (!timerStarted) startTimer();

    board[selected] = val;
    cell.textContent = val;

    if (val !== solution[selected]) {
      errorCount++;
      errorsEl.textContent = errorCount;
      cell.classList.add("error");
    } else {
      cell.classList.remove("error");
    }
    updateHighlights();
    updateRemaining();
    checkWin();
  }

  function computeScore() {
    const base = Math.max(0, 1000 - seconds * 2 - errorCount * 20);
    return Math.round(base * (SCORE_MULTIPLIER[difficulty] || 1));
  }

  function checkWin() {
    if (board.some((v) => v === 0)) return;
    const allCorrect = board.every((v, i) => v === solution[i]);
    if (allCorrect) {
      solved = true;
      stopTimer();
      winText.textContent = `Grille terminée en ${timerEl.textContent} avec ${errorCount} erreur(s).`;
      winModal.classList.add("open");
      saveScore();
    }
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
    const res = await window.JeuxAuth.submitScore("sudoku", score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  function checkGridManually() {
    const cells = gridEl.children;
    let hasError = false;
    for (let p = 0; p < 81; p++) {
      if (given[p] || board[p] === 0) continue;
      const cell = cells[p];
      if (board[p] !== solution[p]) {
        cell.classList.add("error-bg");
        hasError = true;
      } else {
        cell.classList.remove("error-bg");
      }
    }
    if (!hasError && board.every((v) => v !== 0)) checkWin();
  }

  // ---- Timer ----
  function resetTimer() {
    stopTimer();
    seconds = 0;
    timerStarted = false;
    timerEl.textContent = "00:00";
  }

  function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
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

  // ---- Nouvelle partie ----
  function newGame() {
    winModal.classList.remove("open");
    solved = false;
    errorCount = 0;
    errorsEl.textContent = "0";
    selected = -1;
    generatePuzzle(difficulty);
    render();
    resetTimer();
  }

  // ---- Écran de choix de difficulté (avant de commencer) ----
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
    resetTimer();
    document.getElementById("game-content").style.display = "none";
    document.getElementById("setup-screen").style.display = "block";
  });

  // ---- Événements ----
  document.getElementById("numpad").addEventListener("click", (e) => {
    const btn = e.target.closest(".num-btn");
    if (!btn) return;
    inputValue(Number(btn.dataset.num));
  });

  document.addEventListener("keydown", (e) => {
    if (selected < 0) return;
    if (e.key >= "1" && e.key <= "9") inputValue(Number(e.key));
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") inputValue(0);
    else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      let r = Math.floor(selected / 9);
      let c = selected % 9;
      if (e.key === "ArrowUp") r = (r + 8) % 9;
      if (e.key === "ArrowDown") r = (r + 1) % 9;
      if (e.key === "ArrowLeft") c = (c + 8) % 9;
      if (e.key === "ArrowRight") c = (c + 1) % 9;
      selectCell(idx(r, c));
    }
  });

  document.getElementById("new-game").addEventListener("click", newGame);
  document.getElementById("check-game").addEventListener("click", checkGridManually);
  document.getElementById("win-replay").addEventListener("click", newGame);

  // Arrivée directe sur une difficulté précise (?difficulty=facile|moyen|difficile)
  const urlDifficulty = new URLSearchParams(location.search).get("difficulty");
  if (urlDifficulty && DIFFICULTIES[urlDifficulty]) {
    startWithDifficulty(urlDifficulty);
  }
})();
