// Pastille de connexion + modale (email -> code -> pseudo), à placer dans
// un conteneur <div id="auth-widget"></div> présent dans le header de chaque page.
(function () {
  // Racine du site déduite de l'URL de ce script (capturée tout de suite : document.currentScript
  // n'est valable que pendant l'exécution synchrone initiale du script).
  const siteRoot = new URL("../", document.currentScript.src);

  function initials(pseudo) {
    return (pseudo || "?").slice(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function buildModal() {
    if (document.getElementById("auth-modal")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "auth-modal";
    overlay.innerHTML = `
      <div class="modal">
        <button class="auth-close" type="button" aria-label="Fermer">✕</button>
        <div id="auth-step-email">
          <h2>Connexion</h2>
          <p class="auth-hint">Reçois un code à usage unique par email, pas besoin de mot de passe.</p>
          <form class="auth-form" id="auth-form-email">
            <label for="auth-email">Adresse email</label>
            <input type="email" id="auth-email" required autocomplete="email" placeholder="toi@exemple.com" />
            <p class="auth-error" id="auth-email-error"></p>
            <button class="btn" type="submit">Recevoir mon code</button>
          </form>
          <p class="auth-hint">
            En continuant, tu acceptes notre
            <a href="${new URL("confidentialite/index.html", siteRoot).href}" target="_blank" rel="noopener">politique de confidentialité</a>.
          </p>
        </div>
        <div id="auth-step-code" style="display:none;">
          <h2>Vérification</h2>
          <p class="auth-hint">Code envoyé à <strong id="auth-email-echo"></strong>.</p>
          <form class="auth-form" id="auth-form-code">
            <label for="auth-code">Code à 6 chiffres</label>
            <input type="text" id="auth-code" class="auth-code-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" required />
            <p class="auth-error" id="auth-code-error"></p>
            <button class="btn" type="submit">Valider</button>
            <button class="btn-secondary btn" type="button" id="auth-back-email">← Changer d'email</button>
          </form>
        </div>
        <div id="auth-step-pseudo" style="display:none;">
          <h2>Choisis ton pseudo</h2>
          <p class="auth-hint">Affiché dans les classements. 2 à 20 caractères.</p>
          <form class="auth-form" id="auth-form-pseudo">
            <label for="auth-pseudo">Pseudo</label>
            <input type="text" id="auth-pseudo" minlength="2" maxlength="20" required />
            <p class="auth-error" id="auth-pseudo-error"></p>
            <button class="btn" type="submit">Continuer</button>
          </form>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector(".auth-close").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById("auth-form-email").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("auth-email").value.trim();
      const errorEl = document.getElementById("auth-email-error");
      errorEl.textContent = "";
      try {
        await window.JeuxAuth.sendCode(email);
        document.getElementById("auth-email-echo").textContent = email;
        overlay.dataset.email = email;
        showStep("code");
      } catch (err) {
        errorEl.textContent = "Impossible d'envoyer le code. Vérifie l'adresse.";
      }
    });

    document.getElementById("auth-back-email").addEventListener("click", () => showStep("email"));

    document.getElementById("auth-form-code").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = document.getElementById("auth-code").value.trim();
      const email = overlay.dataset.email;
      const errorEl = document.getElementById("auth-code-error");
      errorEl.textContent = "";
      try {
        await window.JeuxAuth.verifyCode(email, code);
        const profile = window.JeuxAuth.getProfile();
        if (profile && profile.pseudo) {
          closeModal();
        } else {
          showStep("pseudo");
        }
      } catch (err) {
        errorEl.textContent = "Code invalide ou expiré.";
      }
    });

    document.getElementById("auth-form-pseudo").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pseudo = document.getElementById("auth-pseudo").value.trim();
      const errorEl = document.getElementById("auth-pseudo-error");
      errorEl.textContent = "";
      if (!/^[\p{L}\p{N} _.-]{2,20}$/u.test(pseudo)) {
        errorEl.textContent = "Pseudo invalide (2 à 20 caractères : lettres, chiffres, espace, - _ .).";
        return;
      }
      try {
        const available = await window.JeuxAuth.isPseudoAvailable(pseudo);
        if (!available) {
          errorEl.textContent = "Ce pseudo est déjà pris.";
          return;
        }
        await window.JeuxAuth.setPseudo(pseudo);
        closeModal();
      } catch (err) {
        errorEl.textContent = "Impossible d'enregistrer ce pseudo.";
      }
    });
  }

  function showStep(step) {
    ["email", "code", "pseudo"].forEach((s) => {
      document.getElementById(`auth-step-${s}`).style.display = s === step ? "block" : "none";
    });
  }

  function openModal() {
    buildModal();
    showStep("email");
    document.getElementById("auth-modal").classList.add("open");
  }

  function closeModal() {
    const overlay = document.getElementById("auth-modal");
    if (overlay) overlay.classList.remove("open");
  }

  function renderPill() {
    const container = document.getElementById("auth-widget");
    if (!container) return;

    if (!window.JeuxAuth.isConfigured()) {
      container.innerHTML = "";
      return;
    }

    const session = window.JeuxAuth.getSession();
    const profile = window.JeuxAuth.getProfile();

    if (!session) {
      container.innerHTML = `<button class="btn auth-btn" id="auth-open-btn">Se connecter</button>`;
      document.getElementById("auth-open-btn").addEventListener("click", openModal);
      return;
    }

    const label = profile && profile.pseudo ? profile.pseudo : "…";
    const avatarHtml =
      profile && profile.avatar_url
        ? `<img class="avatar" src="${escapeHtml(profile.avatar_url)}" alt="" />`
        : `<span class="avatar">${escapeHtml(initials(label))}</span>`;
    container.innerHTML = `
      <a class="auth-pill" href="${new URL("profil/index.html", siteRoot).href}">
        ${avatarHtml}
        <span>${escapeHtml(label)}</span>
      </a>`;
  }

  window.AuthWidget = { open: openModal, close: closeModal };

  let pseudoPromptShown = false;
  function maybePromptPseudo() {
    if (pseudoPromptShown) return;
    const session = window.JeuxAuth.getSession();
    const profile = window.JeuxAuth.getProfile();
    if (session && (!profile || !profile.pseudo)) {
      pseudoPromptShown = true;
      buildModal();
      showStep("pseudo");
      document.getElementById("auth-modal").classList.add("open");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.JeuxAuth) return;
    renderPill();
    await window.JeuxAuth.ready();
    renderPill();
    maybePromptPseudo();
    window.JeuxAuth.onChange(renderPill);
  });
})();
