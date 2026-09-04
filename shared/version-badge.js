(function () {
  const siteRoot = new URL("../", document.currentScript.src);

  fetch(new URL("version.json", siteRoot))
    .then((res) => res.json())
    .then(({ version, updatedAt }) => {
      const date = new Date(updatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const badge = document.createElement("div");
      badge.className = "version-badge";
      badge.textContent = `v${version} · ${date}`;
      document.body.appendChild(badge);
    })
    .catch(() => {});
})();
