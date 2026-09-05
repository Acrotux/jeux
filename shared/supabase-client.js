// Client Supabase partagé + helpers auth/scores/classements.
// Nécessite que le script CDN supabase-js et supabase-config.js soient chargés avant.
window.JeuxAuth = (function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = Boolean(cfg.url && cfg.anonKey);
  const sb = configured ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  let currentSession = null;
  let currentProfile = null;
  const listeners = [];

  function notify() {
    listeners.forEach((cb) => cb({ session: currentSession, profile: currentProfile }));
  }

  async function refreshProfile() {
    if (!currentSession) {
      currentProfile = null;
      return null;
    }
    const { data } = await sb
      .from("profiles")
      .select("id, pseudo, avatar_url")
      .eq("id", currentSession.user.id)
      .maybeSingle();
    currentProfile = data || null;
    return currentProfile;
  }

  async function init() {
    if (!configured) return;
    const { data } = await sb.auth.getSession();
    currentSession = data.session;
    await refreshProfile();
    notify();

    sb.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session;
      await refreshProfile();
      notify();
    });
  }

  const initPromise = configured ? init() : Promise.resolve();

  return {
    isConfigured: () => configured,
    ready: () => initPromise,
    onChange: (cb) => listeners.push(cb),
    getSession: () => currentSession,
    getProfile: () => currentProfile,

    async sendCode(email) {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    },

    async verifyCode(email, code) {
      const { data, error } = await sb.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      currentSession = data.session;
      await refreshProfile();
      notify();
      return currentSession;
    },

    async signOut() {
      await sb.auth.signOut();
      currentSession = null;
      currentProfile = null;
      notify();
    },

    async isPseudoAvailable(pseudo) {
      const { data, error } = await sb
        .from("profiles")
        .select("id")
        .ilike("pseudo", pseudo)
        .maybeSingle();
      if (error) throw error;
      return !data;
    },

    async setPseudo(pseudo) {
      if (!currentSession) throw new Error("Non connecté");
      const { error } = await sb
        .from("profiles")
        .upsert({ id: currentSession.user.id, pseudo });
      if (error) throw error;
      await refreshProfile();
      notify();
    },

    async submitScore(game, score) {
      if (!currentSession) return { saved: false, reason: "not-logged-in" };
      if (!currentProfile || !currentProfile.pseudo) return { saved: false, reason: "no-pseudo" };
      const { error } = await sb
        .from("scores")
        .insert({ user_id: currentSession.user.id, game, score });
      if (error) return { saved: false, reason: error.message };
      return { saved: true };
    },

    async fetchLeaderboard({ game, period = "all", limit = 10 } = {}) {
      if (!configured) return [];
      const { data, error } = await sb.rpc("get_leaderboard", {
        period,
        game_filter: game || null,
        limit_count: limit,
      });
      if (error) {
        console.error("fetchLeaderboard", error);
        return [];
      }
      return data;
    },

    async searchProfiles(query) {
      if (!currentSession || !query || query.trim().length < 2) return [];
      const { data, error } = await sb
        .from("profiles")
        .select("id, pseudo")
        .ilike("pseudo", `%${query.trim()}%`)
        .neq("id", currentSession.user.id)
        .limit(5);
      if (error) return [];
      return data;
    },

    async createChallenge(opponentId, game) {
      if (!currentSession) throw new Error("Non connecté");
      const { error } = await sb
        .from("challenges")
        .insert({ challenger_id: currentSession.user.id, opponent_id: opponentId, game });
      if (error) throw error;
    },

    async listChallenges() {
      if (!currentSession) return [];
      const uid = currentSession.user.id;
      const { data, error } = await sb
        .from("challenges")
        .select("*")
        .or(`challenger_id.eq.${uid},opponent_id.eq.${uid}`)
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      if (data.length === 0) return [];

      const ids = [...new Set(data.flatMap((c) => [c.challenger_id, c.opponent_id]))];
      const { data: profs } = await sb.from("profiles").select("id, pseudo").in("id", ids);
      const pseudoOf = Object.fromEntries((profs || []).map((p) => [p.id, p.pseudo]));

      const enriched = await Promise.all(
        data.map(async (c) => {
          let challengerScore = null;
          let opponentScore = null;
          if (c.status === "accepted") {
            challengerScore = await this.bestScoreBetween(c.challenger_id, c.game, c.responded_at, c.expires_at);
            opponentScore = await this.bestScoreBetween(c.opponent_id, c.game, c.responded_at, c.expires_at);
          }
          return {
            ...c,
            is_mine: c.challenger_id === uid,
            challenger_pseudo: pseudoOf[c.challenger_id] || "?",
            opponent_pseudo: pseudoOf[c.opponent_id] || "?",
            challenger_score: challengerScore,
            opponent_score: opponentScore,
          };
        })
      );
      return enriched;
    },

    async respondChallenge(id, accept) {
      const patch = { status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() };
      if (accept) patch.expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const { error } = await sb.from("challenges").update(patch).eq("id", id);
      if (error) throw error;
    },

    async cancelChallenge(id) {
      const { error } = await sb.from("challenges").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },

    async deleteChallenge(id) {
      const { error } = await sb.from("challenges").delete().eq("id", id);
      if (error) throw error;
    },

    async uploadAvatar(file) {
      if (!currentSession) throw new Error("Non connecté");
      const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
      const MAX_BYTES = 5 * 1024 * 1024;
      if (!ALLOWED_TYPES[file.type]) throw new Error("Format d'image non supporté (JPEG, PNG, WEBP ou GIF uniquement)");
      if (file.size > MAX_BYTES) throw new Error("Image trop lourde (5 Mo maximum)");
      const ext = ALLOWED_TYPES[file.type];
      const path = `${currentSession.user.id}/avatar.${ext}`;
      const { error: uploadError } = await sb.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await sb
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", currentSession.user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      notify();
      return avatarUrl;
    },

    async bestScoreBetween(userId, game, fromISO, toISO) {
      let query = sb.from("scores").select("score").eq("user_id", userId).eq("game", game);
      if (fromISO) query = query.gte("created_at", fromISO);
      if (toISO) query = query.lte("created_at", toISO);
      const { data, error } = await query.order("score", { ascending: false }).limit(1);
      if (error || !data || data.length === 0) return 0;
      return data[0].score;
    },

    async myScores(limit = 20) {
      if (!currentSession) return [];
      const { data, error } = await sb
        .from("scores")
        .select("game, score, created_at")
        .eq("user_id", currentSession.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return [];
      return data;
    },

    async deleteAccount() {
      if (!currentSession) throw new Error("Non connecté");
      const { data, error } = await sb.functions.invoke("delete-account");
      if (error || (data && data.error)) throw error || new Error(data.error);
      currentSession = null;
      currentProfile = null;
      notify();
    },
  };
})();
