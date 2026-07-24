import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { fail } from "../src/apiResponse.js";
import { logError, logInfo } from "../src/logger.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json"
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    await requireTenantAgentEntitlement(getSupabaseAdmin(), actor.tenantId, "draft_agent");
    const body = req.body as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req as unknown as Request,
      onBeforeGenerateToken: async (pathname) => {
        const expectedPrefix = `tenants/${actor.tenantId}/sources/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error(`La ruta debe empezar por ${expectedPrefix}`);
        }

        return {
          allowedContentTypes: [...ALLOWED_TYPES],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ uploadedBy: actor.userId, tenantId: actor.tenantId })
        };
      },
      onUploadCompleted: async ({ blob }) => {
        logInfo("source_blob_upload_completed", {
          pathname: blob.pathname,
          tenantId: actor.tenantId,
          userId: actor.userId
        });
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    logError("source_blob_upload_failed", { status, message });
    return res.status(status).json(fail(message));
  }
}
