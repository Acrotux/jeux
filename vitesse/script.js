(function () {
  const endModal = document.getElementById("end-modal");
  const endTitle = document.getElementById("end-title");
  const endText = document.getElementById("end-text");
  const endReplay = document.getElementById("end-replay");

  async function saveScore(score) {
    const statusEl = document.getElementById("end-save-status");
    if (!statusEl || !window.JeuxAuth) return;
    statusEl.textContent = "";
    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured()) return;
    if (!window.JeuxAuth.getSession()) {
      statusEl.textContent = "Connecte-toi pour enregistrer ce score.";
      return;
    }
    const res = await window.JeuxAuth.submitScore("vitesse", score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== Mode Frappe =====
  const WORDS_POOL = [
    "maison", "voiture", "jardin", "soleil", "musique", "voyage", "cuisine", "montagne",
    "rivière", "fenêtre", "tableau", "lumière", "nuage", "ordinateur", "téléphone", "chocolat",
    "bicyclette", "papillon", "aventure", "silence", "directeur", "poisson", "gâteau", "lecture",
    "printemps", "automne", "hiver", "famille", "village", "château",
  ];
  const WORDS_PER_ROUND = 8;

  const frappeWordsEl = document.getElementById("frappe-words");
  const frappeInput = document.getElementById("frappe-input");
  const frappeWpmEl = document.getElementById("frappe-wpm");
  const frappeAccuracyEl = document.getElementById("frappe-accuracy");
  const frappeProgressEl = document.getElementById("frappe-progress");
  const frappeMessageEl = document.getElementById("frappe-message");

  let frappeWords = [];
  let frappeStatuses = [];
  let frappeIndex = 0;
  let frappeStartTime = 0;
  let frappeTypedChars = 0;
  let frappeCorrectChars = 0;
  let frappeRunning = false;

  function normalizeWord(str) {
    return str.trim().toLowerCase().normalize("NFC");
  }

  function renderFrappeWords() {
    frappeWordsEl.innerHTML = frappeWords
      .map((w, i) => {
        let cls = "word";
        if (frappeStatuses[i]) cls += ` ${frappeStatuses[i]}`;
        else if (i === frappeIndex) cls += " current";
        return `<span class="${cls}" data-i="${i}">${w}</span>`;
      })
      .join("");
  }

  function markWord(status) {
    frappeStatuses[frappeIndex] = status;
  }

  function finishFrappe() {
    frappeRunning = false;
    frappeInput.disabled = true;
    const elapsedMin = Math.max((performance.now() - frappeStartTime) / 60000, 0.02);
    const wpm = Math.round(frappeWords.length / elapsedMin);
    const accuracy = frappeTypedChars > 0 ? Math.min(1, frappeCorrectChars / frappeTypedChars) : 1;
    frappeWpmEl.textContent = wpm;
    frappeAccuracyEl.textContent = `${Math.round(accuracy * 100)}%`;
    const score = Math.round(wpm * 10 * accuracy);
    endTitle.textContent = "⌨️ Résultat";
    endText.textContent = `${wpm} mots/min, ${Math.round(accuracy * 100)}% de précision.`;
    endModal.classList.add("open");
    saveScore(score);
  }

  frappeInput.addEventListener("keydown", (e) => {
    if (!frappeRunning) return;
    if (frappeStartTime === 0) frappeStartTime = performance.now();

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const typed = normalizeWord(frappeInput.value);
      if (typed.length === 0) return; // évite de valider un mot vide
      const target = normalizeWord(frappeWords[frappeIndex]);
      frappeTypedChars += Math.max(typed.length, target.length);
      if (typed === target) {
        frappeCorrectChars += target.length;
        markWord("done");
      } else {
        markWord("wrong");
      }
      frappeInput.value = "";
      frappeIndex++;
      frappeProgressEl.textContent = `${frappeIndex}/${frappeWords.length}`;
      if (frappeIndex >= frappeWords.length) {
        finishFrappe();
      } else {
        renderFrappeWords();
      }
    }
  });

  function startFrappe() {
    endModal.classList.remove("open");
    frappeWords = shuffle(WORDS_POOL).slice(0, WORDS_PER_ROUND);
    frappeStatuses = new Array(frappeWords.length).fill(null);
    frappeIndex = 0;
    frappeStartTime = 0;
    frappeTypedChars = 0;
    frappeCorrectChars = 0;
    frappeRunning = true;
    frappeWpmEl.textContent = "0";
    frappeAccuracyEl.textContent = "100%";
    frappeProgressEl.textContent = `0/${frappeWords.length}`;
    frappeMessageEl.textContent = "";
    frappeInput.value = "";
    frappeInput.disabled = false;
    frappeInput.focus();
    renderFrappeWords();
  }

  document.getElementById("frappe-start").addEventListener("click", startFrappe);

  // ===== Mode Réactivité =====
  const TOTAL_ROUNDS = 5;
  const zoneEl = document.getElementById("reaction-zone");
  const zoneTextEl = document.getElementById("reaction-zone-text");
  const roundEl = document.getElementById("reaction-round");
  const avgEl = document.getElementById("reaction-avg");

  let reactionRound = 0;
  let reactionTimes = [];
  let reactionState = "idle"; // idle | waiting | go
  let reactionTimer = null;
  let reactionShownAt = 0;

  function setZone(state, text) {
    reactionState = state;
    zoneEl.className = "reaction-zone " + state;
    zoneTextEl.textContent = text;
  }

  function nextReactionRound() {
    if (reactionRound >= TOTAL_ROUNDS) {
      finishReaction();
      return;
    }
    reactionRound++;
    roundEl.textContent = `${reactionRound}/${TOTAL_ROUNDS}`;
    setZone("waiting", "Attends le vert…");
    const delay = 1000 + Math.random() * 2500;
    reactionTimer = setTimeout(() => {
      reactionShownAt = performance.now();
      setZone("go", "Clique !");
    }, delay);
  }

  function finishReaction() {
    const avg = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
    avgEl.textContent = avg;
    setZone("idle", "Terminé !");
    const score = Math.max(0, Math.round(1000 - avg));
    endTitle.textContent = "⚡ Résultat";
    endText.textContent = `Temps de réaction moyen : ${avg} ms.`;
    endModal.classList.add("open");
    saveScore(score);
  }

  function handleReactionInput() {
    if (reactionState === "waiting") {
      clearTimeout(reactionTimer);
      setZone("tooearly", "Trop tôt ! Réessaie…");
      setTimeout(() => nextRoundRetry(), 900);
      return;
    }
    if (reactionState === "go") {
      const ms = Math.round(performance.now() - reactionShownAt);
      reactionTimes.push(ms);
      setZone("idle", `${ms} ms !`);
      setTimeout(nextReactionRound, 700);
    }
  }

  zoneEl.addEventListener("click", handleReactionInput);

  document.addEventListener("keydown", (e) => {
    if (e.key !== " ") return;
    if (document.getElementById("mode-reaction").style.display === "none") return;
    if (reactionState !== "waiting" && reactionState !== "go") return;
    e.preventDefault();
    handleReactionInput();
  });

  function nextRoundRetry() {
    reactionRound--;
    nextReactionRound();
  }

  function startReaction() {
    endModal.classList.remove("open");
    reactionRound = 0;
    reactionTimes = [];
    avgEl.textContent = "–";
    nextReactionRound();
  }

  document.getElementById("reaction-start").addEventListener("click", startReaction);

  // ===== Mode fixé à l'arrivée (catalogue -> ?mode=frappe|reaction), aucun choix dans la page =====
  const MODE_LABELS = { frappe: "— Frappe", reaction: "— Réactivité" };
  const urlMode = new URLSearchParams(location.search).get("mode");
  const activeMode = urlMode === "reaction" ? "reaction" : "frappe";

  document.getElementById("mode-frappe").style.display = activeMode === "frappe" ? "block" : "none";
  document.getElementById("mode-reaction").style.display = activeMode === "reaction" ? "block" : "none";
  document.getElementById("mode-label").textContent = MODE_LABELS[activeMode];

  endReplay.addEventListener("click", () => {
    if (activeMode === "frappe") startFrappe();
    else startReaction();
  });
})();
