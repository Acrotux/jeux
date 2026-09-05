(function () {
  const WORDS = {
    animaux: [
      "GIRAFE", "ELEPHANT", "PAPILLON", "DAUPHIN", "HERISSON", "CROCODILE",
      "PERROQUET", "TORTUE", "ECUREUIL", "KANGOUROU", "FLAMANT", "REQUIN",
      "CHOUETTE", "LEZARD", "PANTHERE",
    ],
    nature: [
      "ARTICHAUT", "CITROUILLE", "FRAMBOISE", "CHATAIGNE", "ASPERGE",
      "PASTEQUE", "GRENADE", "AUBERGINE", "NOISETTE", "CACTUS",
      "TOURNESOL", "MONTAGNE", "RIVIERE", "VOLCAN", "GLACIER",
    ],
    metiers: [
      "BOULANGER", "POMPIER", "PLOMBIER", "MENUISIER", "JARDINIER",
      "ELECTRICIEN", "INFIRMIER", "ARCHITECTE", "PECHEUR", "HORLOGER",
      "APICULTEUR", "COUTURIER", "VETERINAIRE", "TRADUCTEUR", "FACTEUR",
    ],
    pays: [
      "PORTUGAL", "BRESIL", "CANADA", "MAROC", "NORVEGE", "JAPON",
      "ARGENTINE", "SENEGAL", "ISLANDE", "VIETNAM", "ECOSSE", "FINLANDE",
      "COLOMBIE", "TUNISIE", "MALAISIE",
    ],
  };
  WORDS.melange = Object.values(WORDS).flat();

  const CATEGORY_LABELS = {
    animaux: "Animaux",
    nature: "Nature & aliments",
    metiers: "Métiers",
    pays: "Pays",
    melange: "Mélange",
  };

  const MAX_ERRORS = 6;
  const KEY_ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

  const wordDisplay = document.getElementById("word-display");
  const keyboardEl = document.getElementById("keyboard");
  const attemptsEl = document.getElementById("attempts-left");
  const categoryLabelEl = document.getElementById("category-label");
  const messageEl = document.getElementById("message");
  const svg = document.getElementById("hangman-svg");
  const endModal = document.getElementById("end-modal");
  const endTitle = document.getElementById("end-title");
  const endText = document.getElementById("end-text");

  const PART_ORDER = ["head", "body", "arm-left", "arm-right", "leg-left", "leg-right"];

  let category = "melange";
  let word = "";
  let guessed = new Set();
  let errors = 0;
  let over = false;

  function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function pickWord(cat) {
    const list = WORDS[cat];
    return list[Math.floor(Math.random() * list.length)];
  }

  function buildKeyboard() {
    keyboardEl.innerHTML = "";
    KEY_ROWS.forEach((row) => {
      row.split("").forEach((letter) => {
        const btn = document.createElement("button");
        btn.className = "key-btn";
        btn.textContent = letter;
        btn.dataset.letter = letter;
        btn.addEventListener("click", () => guessLetter(letter));
        keyboardEl.appendChild(btn);
      });
    });
  }

  function renderWord() {
    wordDisplay.innerHTML = "";
    word.split("").forEach((ch) => {
      if (ch === " ") {
        const sp = document.createElement("div");
        sp.className = "letter-box space";
        wordDisplay.appendChild(sp);
        return;
      }
      const box = document.createElement("div");
      box.className = "letter-box";
      const normCh = normalize(ch);
      box.textContent = guessed.has(normCh) || over ? ch : "";
      wordDisplay.appendChild(box);
    });
  }

  function renderHangman() {
    PART_ORDER.forEach((part, i) => {
      const el = svg.querySelector(`.${part}`);
      el.classList.toggle("show", i < errors);
    });
  }

  function guessLetter(letter) {
    if (over) return;
    const btn = keyboardEl.querySelector(`[data-letter="${letter}"]`);
    if (btn && btn.disabled) return;
    guessed.add(letter);
    if (btn) btn.disabled = true;

    const normWord = normalize(word);
    if (normWord.includes(letter)) {
      if (btn) btn.classList.add("correct");
    } else {
      errors++;
      if (btn) btn.classList.add("wrong");
      attemptsEl.textContent = MAX_ERRORS - errors;
      renderHangman();
    }

    renderWord();
    checkEnd();
  }

  function checkEnd() {
    const normWord = normalize(word);
    const won = normWord.split("").every((ch) => ch === " " || guessed.has(ch));
    if (won) {
      over = true;
      endGame(true);
      return;
    }
    if (errors >= MAX_ERRORS) {
      over = true;
      endGame(false);
    }
  }

  function computeScore() {
    const cleanLength = normalize(word).replace(/ /g, "").length;
    return (MAX_ERRORS - errors) * 100 + cleanLength * 10;
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
    const res = await window.JeuxAuth.submitScore("pendu", score);
    statusEl.textContent = res.saved
      ? `Score enregistré : ${score} pts`
      : "Choisis un pseudo dans ton profil pour enregistrer tes scores.";
  }

  function endGame(won) {
    messageEl.textContent = won ? "🎉 Bravo, tu as trouvé le mot !" : `😢 Perdu ! Le mot était « ${word} ».`;
    messageEl.className = "message " + (won ? "win" : "lose");
    renderWord();
    document.querySelectorAll(".key-btn").forEach((b) => (b.disabled = true));
    setTimeout(() => {
      endTitle.textContent = won ? "🎉 Gagné !" : "💀 Perdu";
      endText.textContent = won
        ? `Tu as trouvé « ${word} » avec ${errors} erreur(s).`
        : `Le mot était « ${word} ».`;
      endModal.classList.add("open");
    }, 500);
    saveScore(won);
  }

  function newGame() {
    endModal.classList.remove("open");
    word = pickWord(category);
    guessed = new Set();
    errors = 0;
    over = false;
    attemptsEl.textContent = MAX_ERRORS;
    categoryLabelEl.textContent = CATEGORY_LABELS[category];
    messageEl.textContent = "";
    messageEl.className = "message";
    buildKeyboard();
    renderWord();
    renderHangman();
  }

  function startWithCategory(cat) {
    category = cat;
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game-content").style.display = "block";
    newGame();
  }

  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => startWithCategory(btn.dataset.cat));
  });

  document.getElementById("change-setup").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("game-content").style.display = "none";
    document.getElementById("setup-screen").style.display = "block";
  });

  document.addEventListener("keydown", (e) => {
    const letter = e.key.toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter <= "Z") guessLetter(letter);
  });

  document.getElementById("new-game").addEventListener("click", newGame);
  document.getElementById("end-replay").addEventListener("click", newGame);

  // Arrivée directe sur une catégorie précise (?categorie=animaux|nature|metiers|pays|melange)
  const urlCategory = new URLSearchParams(location.search).get("categorie");
  if (urlCategory && CATEGORY_LABELS[urlCategory]) {
    startWithCategory(urlCategory);
  }
})();
