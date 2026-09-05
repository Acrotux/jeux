// Lance un duel vers une adresse email : si un compte existe déjà pour cette
// adresse, crée un duel normal ; sinon, invite la personne par email (elle
// pourra créer son compte et relever le duel). La clé service_role n'est
// utilisée que côté serveur, jamais exposée au client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_GAMES = ["sudoku", "pendu", "memory", "mastermind", "musique", "vitesse", "precision"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const { email, game } = await req.json();
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Adresse email invalide" }, 400);
    }
    if (!ALLOWED_GAMES.includes(game)) {
      return json({ error: "Jeu invalide" }, 400);
    }
    const targetEmail = email.trim().toLowerCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: "Session invalide" }, 401);

    if (caller.email && caller.email.toLowerCase() === targetEmail) {
      return json({ error: "Impossible de te défier toi-même" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Cherche un compte existant avec cet email (l'API admin ne filtre pas
    // par email : on liste et on compare nous-mêmes).
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) return json({ error: listError.message }, 500);

    const existingUser = listData.users.find((u) => (u.email || "").toLowerCase() === targetEmail);

    let insertPayload: Record<string, unknown>;
    let invited = false;

    if (existingUser) {
      insertPayload = {
        game,
        challenger_id: caller.id,
        opponent_id: existingUser.id,
        status: "pending",
      };
    } else {
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(targetEmail);
      if (inviteError && !String(inviteError.message).toLowerCase().includes("already")) {
        return json({ error: inviteError.message }, 500);
      }
      insertPayload = {
        game,
        challenger_id: caller.id,
        invited_email: targetEmail,
        status: "pending",
      };
      invited = true;
    }

    const { error: insertError } = await adminClient.from("challenges").insert(insertPayload);
    if (insertError) return json({ error: insertError.message }, 500);

    return json({ success: true, invited });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
