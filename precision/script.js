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
    const res = await window.JeuxAuth.submitScore(`precision_${activeMode}`, score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  function distanceScore(avgDistance, factor) {
    return Math.max(0, Math.round(1000 - avgDistance * factor));
  }

  // ===== Mode Visée =====
  const VISEE_ROUNDS = 8;
  const TARGET_DIAMETER = 56;
  const TARGET_RADIUS = TARGET_DIAMETER / 2;

  const viseeZone = document.getElementById("visee-zone");
  const viseeRoundEl = document.getElementById("visee-round");
  const viseeAvgEl = document.getElementById("visee-avg");

  let viseeRound = 0;
  let viseeDistances = [];
  let viseeTargetEl = null;
  let viseeTargetCenter = null;
  let viseeRunning = false;

  function spawnViseeTarget() {
    const rect = viseeZone.getBoundingClientRect();
    const x = TARGET_RADIUS + Math.random() * (rect.width - TARGET_DIAMETER);
    const y = TARGET_RADIUS + Math.random() * (rect.height - TARGET_DIAMETER);
    viseeTargetEl = document.createElement("div");
    viseeTargetEl.className = "visee-target";
    viseeTargetEl.style.width = `${TARGET_DIAMETER}px`;
    viseeTargetEl.style.height = `${TARGET_DIAMETER}px`;
    viseeTargetEl.style.left = `${x}px`;
    viseeTargetEl.style.top = `${y}px`;
    viseeZone.appendChild(viseeTargetEl);
    viseeTargetCenter = { x, y };
  }

  function finishVisee() {
    viseeRunning = false;
    const avg = viseeDistances.reduce((a, b) => a + b, 0) / viseeDistances.length;
    viseeAvgEl.textContent = `${Math.round(avg)}px`;
    const score = distanceScore(avg, 12);
    endTitle.textContent = "🎯 Résultat";
    endText.textContent = `Écart moyen au centre : ${Math.round(avg)} px.`;
    endModal.classList.add("open");
    saveScore(score);
  }

  viseeZone.addEventListener("click", (e) => {
    if (!viseeRunning || !viseeTargetEl) return;
    const rect = viseeZone.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const dist = Math.hypot(clickX - viseeTargetCenter.x, clickY - viseeTargetCenter.y);
    viseeDistances.push(dist);

    const marker = document.createElement("div");
    marker.className = "visee-hit-marker";
    marker.style.left = `${clickX}px`;
    marker.style.top = `${clickY}px`;
    viseeZone.appendChild(marker);
    setTimeout(() => marker.remove(), 400);

    viseeTargetEl.remove();
    viseeTargetEl = null;
    viseeRound++;
    viseeRoundEl.textContent = `${viseeRound}/${VISEE_ROUNDS}`;

    if (viseeRound >= VISEE_ROUNDS) {
      setTimeout(finishVisee, 200);
    } else {
      setTimeout(spawnViseeTarget, 300);
    }
  });

  function startVisee() {
    endModal.classList.remove("open");
    viseeZone.innerHTML = "";
    viseeRound = 0;
    viseeDistances = [];
    viseeRunning = true;
    viseeRoundEl.textContent = `0/${VISEE_ROUNDS}`;
    viseeAvgEl.textContent = "–";
    spawnViseeTarget();
  }

  document.getElementById("visee-start").addEventListener("click", startVisee);

  // ===== Mode Barre précise =====
  const BARRE_ROUNDS = 5;
  const trackEl = document.getElementById("barre-track");
  const targetEl = document.getElementById("barre-target");
  const indicatorEl = document.getElementById("barre-indicator");
  const stopBtn = document.getElementById("barre-stop");
  const barreRoundEl = document.getElementById("barre-round");
  const barreAvgEl = document.getElementById("barre-avg");
  const barreMessageEl = document.getElementById("barre-message");

  let barreRound = 0;
  let barreDistances = [];
  let barreRafId = null;
  let barreStartTime = 0;
  let barreTargetCenter = 0;
  let barreRunning = false;

  function indicatorWidth() {
    return indicatorEl.getBoundingClientRect().width;
  }

  function trackWidth() {
    return trackEl.getBoundingClientRect().width;
  }

  function placeBarreTarget() {
    const tw = trackWidth();
    const targetWidth = targetEl.getBoundingClientRect().width;
    const maxLeft = tw - targetWidth;
    const left = 20 + Math.random() * (maxLeft - 40);
    targetEl.style.left = `${left}px`;
    barreTargetCenter = left + targetWidth / 2;
  }

  function animateIndicator(timestamp) {
    if (!barreStartTime) barreStartTime = timestamp;
    const elapsed = (timestamp - barreStartTime) / 1000;
    const tw = trackWidth();
    const iw = indicatorWidth();
    const range = tw - iw;
    const x = (range / 2) * (1 + Math.sin((elapsed * Math.PI * 2) / 1.6));
    indicatorEl.style.left = `${x}px`;
    if (barreRunning) barreRafId = requestAnimationFrame(animateIndicator);
  }

  function startBarreRound() {
    barreRound++;
    barreRoundEl.textContent = `${barreRound}/${BARRE_ROUNDS}`;
    barreMessageEl.textContent = "";
    placeBarreTarget();
    barreStartTime = 0;
    barreRunning = true;
    stopBtn.disabled = false;
    barreRafId = requestAnimationFrame(animateIndicator);
  }

  function finishBarre() {
    const avg = barreDistances.reduce((a, b) => a + b, 0) / barreDistances.length;
    barreAvgEl.textContent = `${Math.round(avg)}px`;
    const score = distanceScore(avg, 15);
    endTitle.textContent = "📏 Résultat";
    endText.textContent = `Écart moyen à la cible : ${Math.round(avg)} px.`;
    endModal.classList.add("open");
    saveScore(score);
  }

  function stopBarre() {
    if (!barreRunning) return;
    barreRunning = false;
    cancelAnimationFrame(barreRafId);
    stopBtn.disabled = true;

    const iw = indicatorWidth();
    const indicatorLeft = parseFloat(indicatorEl.style.left) || 0;
    const indicatorCenter = indicatorLeft + iw / 2;
    const dist = Math.abs(indicatorCenter - barreTargetCenter);
    barreDistances.push(dist);
    barreMessageEl.textContent = `Écart : ${Math.round(dist)} px`;

    if (barreRound >= BARRE_ROUNDS) {
      setTimeout(finishBarre, 500);
    } else {
      setTimeout(startBarreRound, 700);
    }
  }

  stopBtn.addEventListener("click", stopBarre);

  document.addEventListener("keydown", (e) => {
    if (e.key !== " ") return;
    if (document.getElementById("mode-barre").style.display === "none") return;
    if (!barreRunning) return;
    e.preventDefault();
    stopBarre();
  });

  function startBarre() {
    endModal.classList.remove("open");
    barreRound = 0;
    barreDistances = [];
    barreAvgEl.textContent = "–";
    startBarreRound();
  }

  document.getElementById("barre-start").addEventListener("click", startBarre);

  // ===== Choix du test avant de commencer (écran de configuration) =====
  const MODE_LABELS = { visee: "— Visée", barre: "— Barre précise" };
  let activeMode = null;

  function activateMode(mode) {
    activeMode = mode;
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game-content").style.display = "block";
    document.getElementById("mode-visee").style.display = mode === "visee" ? "block" : "none";
    document.getElementById("mode-barre").style.display = mode === "barre" ? "block" : "none";
    document.getElementById("mode-label").textContent = MODE_LABELS[mode];
    endModal.classList.remove("open");
    if (window.refreshMiniLeaderboard) window.refreshMiniLeaderboard(`precision_${mode}`);
  }

  document.querySelectorAll(".mode-choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => activateMode(btn.dataset.mode));
  });

  document.getElementById("change-setup").addEventListener("click", (e) => {
    e.preventDefault();
    viseeRunning = false;
    barreRunning = false;
    if (barreRafId) cancelAnimationFrame(barreRafId);
    document.getElementById("game-content").style.display = "none";
    document.getElementById("setup-screen").style.display = "block";
  });

  endReplay.addEventListener("click", () => {
    if (activeMode === "visee") startVisee();
    else startBarre();
  });

  // Arrivée directe sur un test précis depuis le catalogue (?mode=visee|barre)
  const urlMode = new URLSearchParams(location.search).get("mode");
  if (urlMode === "visee" || urlMode === "barre") activateMode(urlMode);
})();
