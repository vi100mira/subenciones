import { basesAcceptanceContractHash, combineApprovedBasesRows } from "./basesContract.mjs";
import type { BasesInterpretationRow } from "./basesContract.mjs";
import type { getSupabaseAdmin } from "./supabaseAdmin.js";

export { basesAcceptanceContractHash, combineApprovedBasesRows } from "./basesContract.mjs";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
export type TenantBasesAcceptance = {
  id: string;
  status: "accepted" | "discrepancy_reported";
  interpretation_ids: string[];
  contract_hash: string;
  note: string;
  accepted_by: string;
  updated_at: string;
};

export function isMissingBasesSchema(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""))
    || /platform_bases_interpretations.*(?:not exist|schema cache)/i.test(String(error?.message || ""));
}

export function isMissingAcceptanceSchema(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""))
    || /tenant_bases_acceptances.*(?:not exist|schema cache)/i.test(String(error?.message || ""));
}

export async function loadTenantBasesAcceptance(supabase: SupabaseAdmin, tenantId: string, opportunityVersionId: string) {
  const { data, error } = await supabase.from("tenant_bases_acceptances")
    .select("id, status, interpretation_ids, contract_hash, note, accepted_by, updated_at")
    .eq("tenant_id", tenantId).eq("opportunity_version_id", opportunityVersionId).maybeSingle();
  if (error && !isMissingAcceptanceSchema(error)) throw error;
  return error ? null : (data as TenantBasesAcceptance | null);
}

export async function loadApprovedBases(supabase: SupabaseAdmin, opportunityVersionId: string, tenantId?: string) {
  const { data, error } = await supabase.from("platform_bases_interpretations")
    .select("id, opportunity_version_id, status, citations_verified, contract_json, reviewed_at")
    .eq("opportunity_version_id", opportunityVersionId).in("status", ["approved", "review_required"])
    .order("reviewed_at", { ascending: false });
  if (error && !isMissingBasesSchema(error)) throw error;
  if (error) return combineApprovedBasesRows([]);
  const rows = (data || []) as BasesInterpretationRow[];
  const acceptance = tenantId ? await loadTenantBasesAcceptance(supabase, tenantId, opportunityVersionId) : null;
  if (acceptance?.status === "discrepancy_reported") return combineApprovedBasesRows([]);
  const acceptedIds = acceptance?.status === "accepted"
    && basesAcceptanceContractHash(rows, acceptance.interpretation_ids) === acceptance.contract_hash
    ? acceptance.interpretation_ids : [];
  return combineApprovedBasesRows(rows, acceptedIds);
}
