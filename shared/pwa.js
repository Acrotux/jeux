(function () {
  // Racine du site déduite de l'URL de ce script lui-même (shared/pwa.js),
  // pour fonctionner aussi bien en local qu'en sous-dossier (ex. GitHub Pages /jeux/).
  const scriptEl = document.currentScript;
  const siteRoot = new URL("../", scriptEl.src);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(new URL("service-worker.js", siteRoot), { scope: siteRoot.href })
        .catch(() => {});
    });
  }
})();
