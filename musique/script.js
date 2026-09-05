(function () {
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration = 0.35) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const endModal = document.getElementById("end-modal");
  const endTitle = document.getElementById("end-title");
  const endText = document.getElementById("end-text");
  const endReplay = document.getElementById("end-replay");

  async function saveScore(game, score) {
    const statusEl = document.getElementById("end-save-status");
    if (!statusEl || !window.JeuxAuth) return;
    statusEl.textContent = "";
    await window.JeuxAuth.ready();
    if (!window.JeuxAuth.isConfigured()) return;
    if (!window.JeuxAuth.getSession()) {
      statusEl.textContent = "Connecte-toi pour enregistrer ce score.";
      return;
    }
    const res = await window.JeuxAuth.submitScore(game, score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  // ===== Mode Simon : suite de sons =====
  const SIMON_FREQS = [261.63, 329.63, 392.0, 523.25];
  const pads = Array.from(document.querySelectorAll(".simon-pad"));
  const simonLevelEl = document.getElementById("simon-level");
  const simonBestEl = document.getElementById("simon-best");
  const simonMessageEl = document.getElementById("simon-message");

  let simonSequence = [];
  let simonPlayerIndex = 0;
  let simonAccepting = false;
  let simonBest = 0;

  async function playPad(i, duration = 0.35) {
    const pad = pads[i];
    pad.classList.add("lit");
    playTone(SIMON_FREQS[i], duration);
    await sleep(duration * 1000);
    pad.classList.remove("lit");
  }

  async function playSimonSequence() {
    simonAccepting = false;
    pads.forEach((p) => (p.disabled = true));
    simonMessageEl.textContent = "Regarde et écoute…";
    await sleep(500);
    for (const step of simonSequence) {
      await playPad(step);
      await sleep(180);
    }
    simonMessageEl.textContent = "À toi de jouer !";
    pads.forEach((p) => (p.disabled = false));
    simonAccepting = true;
    simonPlayerIndex = 0;
  }

  function simonAddStep() {
    simonSequence.push(Math.floor(Math.random() * 4));
    simonLevelEl.textContent = simonSequence.length - 1;
  }

  async function simonEnd() {
    simonAccepting = false;
    pads.forEach((p) => (p.disabled = true));
    const level = simonSequence.length - 1;
    simonMessageEl.textContent = "";
    simonMessageEl.className = "message lose";
    if (level > simonBest) {
      simonBest = level;
      simonBestEl.textContent = simonBest;
    }
    endTitle.textContent = level > 0 ? "🎵 Partie terminée" : "😅 Essaie encore";
    endText.textContent = `Niveau atteint : ${level}.`;
    endModal.classList.add("open");
    if (level > 0) await saveScore("musique", level * 50);
  }

  pads.forEach((pad, i) => {
    pad.addEventListener("click", async () => {
      if (!simonAccepting) return;
      playTone(SIMON_FREQS[i], 0.25);
      pad.classList.add("lit");
      setTimeout(() => pad.classList.remove("lit"), 200);

      if (simonSequence[simonPlayerIndex] !== i) {
        simonEnd();
        return;
      }
      simonPlayerIndex++;
      if (simonPlayerIndex === simonSequence.length) {
        simonAccepting = false;
        simonAddStep();
        await sleep(600);
        playSimonSequence();
      }
    });
  });

  function startSimon() {
    endModal.classList.remove("open");
    simonSequence = [];
    simonMessageEl.className = "message";
    simonAddStep();
    playSimonSequence();
  }

  document.getElementById("simon-start").addEventListener("click", startSimon);

  // ===== Mode Reconnaissance de notes =====
  const NOTE_NAMES = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si", "Do aigu"];
  const NOTE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const TOTAL_ROUNDS = 10;

  const notesRoundEl = document.getElementById("notes-round");
  const notesScoreEl = document.getElementById("notes-score");
  const notesMessageEl = document.getElementById("notes-message");
  const notesChoicesEl = document.getElementById("notes-choices");
  const notesPlayBtn = document.getElementById("notes-play");

  let notesRound = 0;
  let notesCorrect = 0;
  let notesCurrentAnswer = -1;
  let notesLocked = false;

  function renderNoteChoices() {
    notesChoicesEl.innerHTML = "";
    NOTE_NAMES.forEach((name, i) => {
      const btn = document.createElement("button");
      btn.className = "note-btn";
      btn.textContent = name;
      btn.addEventListener("click", () => answerNote(i, btn));
      notesChoicesEl.appendChild(btn);
    });
  }

  function nextNoteRound() {
    if (notesRound >= TOTAL_ROUNDS) {
      endNotesGame();
      return;
    }
    notesRound++;
    notesLocked = false;
    notesRoundEl.textContent = `${notesRound}/${TOTAL_ROUNDS}`;
    notesMessageEl.textContent = "";
    notesMessageEl.className = "message";
    notesCurrentAnswer = Math.floor(Math.random() * NOTE_NAMES.length);
    renderNoteChoices();
    playTone(NOTE_FREQS[notesCurrentAnswer], 0.6);
  }

  function answerNote(i, btn) {
    if (notesLocked) return;
    notesLocked = true;
    const correct = i === notesCurrentAnswer;
    btn.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      const correctBtn = notesChoicesEl.children[notesCurrentAnswer];
      correctBtn.classList.add("correct");
    } else {
      notesCorrect++;
      notesScoreEl.textContent = notesCorrect;
    }
    Array.from(notesChoicesEl.children).forEach((b) => (b.disabled = true));
    setTimeout(nextNoteRound, 900);
  }

  async function endNotesGame() {
    endTitle.textContent = "🎵 Manche terminée";
    endText.textContent = `${notesCorrect} bonne(s) réponse(s) sur ${TOTAL_ROUNDS}.`;
    endModal.classList.add("open");
    await saveScore("musique", notesCorrect * 100);
  }

  function startNotes() {
    endModal.classList.remove("open");
    notesRound = 0;
    notesCorrect = 0;
    notesScoreEl.textContent = "0";
    nextNoteRound();
  }

  notesPlayBtn.addEventListener("click", () => {
    if (notesCurrentAnswer >= 0) playTone(NOTE_FREQS[notesCurrentAnswer], 0.6);
  });
  document.getElementById("notes-start").addEventListener("click", startNotes);

  // ===== Bascule entre les modes =====
  const modeButtons = document.querySelectorAll(".mode-btn");
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.mode;
      document.getElementById("mode-simon").style.display = mode === "simon" ? "block" : "none";
      document.getElementById("mode-notes").style.display = mode === "notes" ? "block" : "none";
      endModal.classList.remove("open");
    });
  });

  endReplay.addEventListener("click", () => {
    const activeMode = document.querySelector(".mode-btn.active").dataset.mode;
    if (activeMode === "simon") startSimon();
    else startNotes();
  });

  // Arrivée directe sur un mode précis depuis le catalogue (?mode=simon|notes)
  const urlMode = new URLSearchParams(location.search).get("mode");
  if (urlMode) {
    const target = document.querySelector(`.mode-btn[data-mode="${urlMode}"]`);
    if (target) target.click();
  }
})();
