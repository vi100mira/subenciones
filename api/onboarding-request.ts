import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin } from "../src/supabaseAdmin.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanUrl(value: unknown) {
  const raw = cleanText(value, 240);
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.toString();
  } catch {
    return null;
  }
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 180).toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

    const entityName = cleanText(req.body?.entityName);
    const requesterEmail = cleanEmail(req.body?.requesterEmail);
    const adminEmail = cleanEmail(req.body?.adminEmail);
    const websiteUrl = cleanUrl(req.body?.websiteUrl);
    const territory = cleanText(req.body?.territory, 120) || null;
    const publicWebConsent = req.body?.publicWebConsent === true;

    if (!entityName) return res.status(400).json(fail("Falta el nombre de la entidad"));
    if (!requesterEmail) return res.status(400).json(fail("Email solicitante invalido"));
    if (!adminEmail) return res.status(400).json(fail("Email admin invalido"));

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenant_onboarding_requests")
      .insert({
        entity_name: entityName,
        website_url: websiteUrl,
        territory,
        requester_email: requesterEmail,
        admin_email: adminEmail,
        status: "requested",
        request_context_json: {
          source: "public_onboarding_form",
          public_web_analysis_permission: publicWebConsent ? "requested_by_user" : "not_granted",
          drive_connection_permission: "not_requested",
          contains_personal_data: false,
          next_step: "admin_email_verification_pending"
        }
      })
      .select("id, entity_name, admin_email, status, expires_at, created_at")
      .single();

    if (error) throw error;

    return res.status(201).json(
      ok({
        request: data,
        nextStep: "Pendiente de verificacion por email del administrador de la entidad."
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return res.status(400).json(fail(message));
  }
}
