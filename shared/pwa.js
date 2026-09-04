if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const depth = window.location.pathname.split("/").filter(Boolean).length - 1;
    const root = depth > 0 ? "../".repeat(depth) : "";
    navigator.serviceWorker.register(`${root}service-worker.js`, { scope: `${root}./` }).catch(() => {});
  });
}
