import { createClient } from "@supabase/supabase-js";
import type { WebSocketLikeConstructor } from "@supabase/realtime-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import WebSocket from "ws";
import { fail, ok } from "../src/apiResponse.js";

function authClient() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.APP_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configuracion de autenticacion no disponible.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const accessToken = String(req.body?.accessToken || "");
    const refreshToken = String(req.body?.refreshToken || "");
    const code = String(req.body?.code || "");
    const tokenHash = String(req.body?.tokenHash || "");
    const type = req.body?.type === "invite" ? "invite" : "recovery";
    const password = String(req.body?.password || "");
    if (!code && !tokenHash && (accessToken.length < 20 || refreshToken.length < 20)) return res.status(400).json(fail("La invitacion no es valida o ha caducado."));
    if (password.length < 12) return res.status(400).json(fail("La contrasena debe tener al menos 12 caracteres."));

    const auth = authClient();
    const { data: session, error: sessionError } = code
      ? await auth.auth.exchangeCodeForSession(code)
      : tokenHash
        ? await auth.auth.verifyOtp({ token_hash: tokenHash, type })
        : await auth.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (sessionError || !session.user?.email) return res.status(400).json(fail("La invitacion no es valida o ha caducado."));
    const { data: user, error: updateError } = await auth.auth.updateUser({ password });
    if (updateError || !user.user?.email) return res.status(400).json(fail("No se pudo establecer la contrasena."));
    return res.status(200).json(ok({ email: user.user.email }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return res.status(500).json(fail(message));
  }
}
