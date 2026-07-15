import type { getSupabaseAdmin } from "./supabaseAdmin.js";

const SECTION_KEYS = [
  "beneficiaries", "eligibilityRequirements", "eligibleActivities", "requiredDocuments",
  "evaluationCriteria", "budgetRules", "submission", "obligations", "exclusions"
] as const;
const CORE_SECTIONS = ["beneficiaries", "eligibleActivities", "requiredDocuments", "submission"] as const;

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
type InterpretationRow = {
  id: string;
  opportunity_version_id: string;
  status: string;
  citations_verified: boolean;
  contract_json: Record<string, any> | null;
  reviewed_at?: string | null;
};

export function isMissingBasesSchema(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""))
    || /platform_bases_interpretations.*(?:not exist|schema cache)/i.test(String(error?.message || ""));
}

function clauseKey(clause: Record<string, any>) {
  return JSON.stringify([
    String(clause.text || "").trim().toLowerCase(),
    clause.documentSha256 || "",
    clause.sourcePage ?? ""
  ]);
}

export function combineApprovedBasesRows(rows: InterpretationRow[]) {
  const approved = rows.filter((row) => row.status === "approved" && row.citations_verified);
  const sections = Object.fromEntries(SECTION_KEYS.map((key) => [key, [] as Record<string, any>[]]));
  const constraintLimits: Record<string, any>[] = [];
  const formatRules: Record<string, any>[] = [];
  for (const row of approved) {
    for (const key of SECTION_KEYS) sections[key].push(...(row.contract_json?.sections?.[key] || []));
    constraintLimits.push(...(row.contract_json?.proposalConstraints?.limits || []));
    formatRules.push(...(row.contract_json?.proposalConstraints?.formatRules || []));
  }
  for (const key of SECTION_KEYS) {
    const seen = new Set<string>();
    sections[key] = sections[key].filter((clause) => {
      const identity = clauseKey(clause);
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, 20);
  }
  const missingCoreSections = CORE_SECTIONS.filter((key) => !sections[key].length);
  const unique = (items: Record<string, any>[]) => [...new Map(items.map((item) => [JSON.stringify([item.kind, item.documentType, item.value, item.unit, item.sourcePage, item.documentSha256]), item])).values()];
  const limits = unique(constraintLimits);
  return {
    status: approved.length ? "approved" : "not_approved",
    citationsVerified: approved.length > 0,
    approvedInterpretationIds: approved.map((row) => row.id),
    proposalConstraints: {
      status: limits.length ? "verified" : "not_found_requires_review",
      draftingGate: limits.length ? "constraints_verified" : "blocked_pending_constraint_review",
      requiresRenderedValidation: limits.some((item) => ["pages", "folios", "sides"].includes(item.unit)),
      requiresHumanReview: !approved.length,
      limits,
      formatRules: unique(formatRules)
    },
    requirementsContract: {
      schemaVersion: 1,
      status: approved.length ? "approved" : "not_approved",
      documentaryGate: approved.length && !missingCoreSections.length
        ? "requirements_approved"
        : "blocked_missing_core_requirements",
      requiresHumanReview: !approved.length,
      coveredSections: SECTION_KEYS.filter((key) => sections[key].length),
      missingCoreSections,
      sections
    }
  };
}

export async function loadApprovedBases(supabase: SupabaseAdmin, opportunityVersionId: string) {
  const { data, error } = await supabase.from("platform_bases_interpretations")
    .select("id, opportunity_version_id, status, citations_verified, contract_json, reviewed_at")
    .eq("opportunity_version_id", opportunityVersionId).eq("status", "approved")
    .order("reviewed_at", { ascending: false });
  if (error && !isMissingBasesSchema(error)) throw error;
  if (error) return combineApprovedBasesRows([]);
  return combineApprovedBasesRows((data || []) as InterpretationRow[]);
}
