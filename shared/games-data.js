// Registre unique des jeux du site : utilisé par l'accueil (derniers ajouts /
// dernières mises à jour) et par la page Jeux (catalogue filtrable par style).
window.GAMES = [
  {
    id: "sudoku",
    name: "Sudoku",
    emoji: "🔢",
    path: "sudoku/index.html",
    desc: "Remplis la grille 9×9 sans répéter aucun chiffre sur une ligne, une colonne ou un bloc.",
    styles: ["Logique"],
    tags: ["3 niveaux"],
    addedAt: "2026-09-04T15:00:00Z",
    updatedAt: "2026-09-05T04:45:34Z",
  },
  {
    id: "pendu",
    name: "Pendu",
    emoji: "🪢",
    path: "pendu/index.html",
    desc: "Devine le mot mystère lettre par lettre avant que le dessin ne soit terminé.",
    styles: ["Vocabulaire"],
    tags: ["Catégories"],
    addedAt: "2026-09-04T15:00:00Z",
    updatedAt: "2026-09-05T04:45:34Z",
  },
  {
    id: "memory",
    name: "Memory",
    emoji: "🧠",
    path: "memory/index.html",
    desc: "Retrouve toutes les paires de cartes en un minimum de coups et le plus vite possible.",
    styles: ["Mémoire"],
    tags: ["4 tailles"],
    addedAt: "2026-09-04T15:00:00Z",
    updatedAt: "2026-09-05T04:45:35Z",
  },
  {
    id: "mastermind",
    name: "Mastermind",
    emoji: "🎯",
    path: "mastermind/index.html",
    desc: "Devine la combinaison secrète grâce aux indices de couleurs à chaque essai.",
    styles: ["Logique"],
    tags: ["3 niveaux"],
    addedAt: "2026-09-04T20:00:00Z",
    updatedAt: "2026-09-05T04:45:34Z",
  },
  {
    id: "musique",
    name: "Musique",
    emoji: "🎵",
    path: "musique/index.html",
    desc: "Reproduis une suite de sons ou reconnais la note jouée, sans aucun fichier audio.",
    styles: ["Oreille"],
    tags: ["2 modes"],
    addedAt: "2026-09-04T20:05:00Z",
    updatedAt: "2026-09-05T04:45:34Z",
    modes: [
      { id: "simon", name: "Suite de sons" },
      { id: "notes", name: "Reconnaissance de notes" },
    ],
  },
  {
    id: "vitesse",
    name: "Vitesse",
    emoji: "⚡",
    path: "vitesse/index.html",
    desc: "Vitesse de frappe au clavier ou temps de réaction au clic — deux façons de tester tes réflexes.",
    styles: ["Réflexes"],
    tags: ["2 modes"],
    addedAt: "2026-09-04T20:45:00Z",
    updatedAt: "2026-09-05T04:58:47Z",
    modes: [
      { id: "frappe", name: "Frappe" },
      { id: "reaction", name: "Réactivité" },
    ],
  },
  {
    id: "precision",
    name: "Précision",
    emoji: "🎯",
    path: "precision/index.html",
    desc: "Vise le centre d'une cible ou stoppe une barre au bon moment — deux tests de précision.",
    styles: ["Adresse"],
    tags: ["2 modes"],
    addedAt: "2026-09-04T21:00:00Z",
    updatedAt: "2026-09-05T05:19:47Z",
    modes: [
      { id: "visee", name: "Visée" },
      { id: "barre", name: "Barre précise" },
    ],
  },
];

// Un jeu à plusieurs modes devient plusieurs entrées indépendantes
// (ex. Précision -> Visée / Barre précise), chacune avec le nom du test
// comme titre et le jeu parent en étiquette. Utilisé par le catalogue et
// par l'accueil, pour que ces noms apparaissent partout de la même façon.
window.buildGameActivities = function (games) {
  const list = [];
  games.forEach((g) => {
    if (g.modes && g.modes.length) {
      g.modes.forEach((m) => {
        list.push({
          name: m.name,
          emoji: g.emoji,
          path: `${g.path}?mode=${m.id}`,
          desc: g.desc,
          styles: g.styles,
          tags: [g.name],
          addedAt: g.addedAt,
          updatedAt: g.updatedAt,
        });
      });
    } else {
      list.push({
        name: g.name,
        emoji: g.emoji,
        path: g.path,
        desc: g.desc,
        styles: g.styles,
        tags: g.tags,
        addedAt: g.addedAt,
        updatedAt: g.updatedAt,
      });
    }
  });
  return list;
};
