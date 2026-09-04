// Gestion du thème clair/sombre, partagée par toutes les pages
(function () {
  const STORAGE_KEY = "jeux-theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  applyTheme(getPreferredTheme());

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      applyTheme(document.documentElement.getAttribute("data-theme") || getPreferredTheme());
      btn.addEventListener("click", toggleTheme);
    }
  });
})();
