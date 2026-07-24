import { createHash } from "node:crypto";
import { canonicalJson } from "./canonicalJson.mjs";

const SECTION_KEYS = [
  "beneficiaries", "eligibilityRequirements", "eligibleActivities", "requiredDocuments",
  "evaluationCriteria", "budgetRules", "submission", "obligations", "exclusions"
];
const CORE_SECTIONS = ["beneficiaries", "eligibleActivities", "requiredDocuments", "submission"];

function clauseKey(clause) {
  return JSON.stringify([
    String(clause.text || "").trim().toLowerCase(),
    clause.documentSha256 || "",
    clause.sourcePage ?? ""
  ]);
}

function unique(items) {
  return [...new Map(items.map((item) => [JSON.stringify([
    item.kind, item.documentType, item.value, item.unit, item.sourcePage, item.documentSha256
  ]), item])).values()];
}

export function combineApprovedBasesRows(rows, acceptedIds = []) {
  const accepted = new Set(acceptedIds);
  const effective = [...rows].sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .filter((row) => row.citations_verified && (row.status === "approved"
      || (row.status === "review_required" && accepted.has(row.id))));
  const sections = Object.fromEntries(SECTION_KEYS.map((key) => [key, []]));
  const constraintLimits = [];
  const formatRules = [];
  for (const row of effective) {
    for (const key of SECTION_KEYS) sections[key].push(...(row.contract_json?.sections?.[key] || []));
    constraintLimits.push(...(row.contract_json?.proposalConstraints?.limits || []));
    formatRules.push(...(row.contract_json?.proposalConstraints?.formatRules || []));
  }
  for (const key of SECTION_KEYS) {
    const seen = new Set();
    sections[key] = sections[key].filter((clause) => {
      const identity = clauseKey(clause);
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, 20);
  }
  const missingCoreSections = CORE_SECTIONS.filter((key) => !sections[key].length);
  const limits = unique(constraintLimits);
  return {
    status: effective.length ? "approved" : "not_approved",
    citationsVerified: effective.length > 0,
    approvedInterpretationIds: effective.map((row) => row.id),
    proposalConstraints: {
      status: limits.length ? "verified" : "not_found_requires_review",
      draftingGate: limits.length ? "constraints_verified" : "blocked_pending_constraint_review",
      requiresRenderedValidation: limits.some((item) => ["pages", "folios", "sides"].includes(item.unit)),
      requiresHumanReview: !effective.length,
      limits,
      formatRules: unique(formatRules)
    },
    requirementsContract: {
      schemaVersion: 1,
      status: effective.length ? "approved" : "not_approved",
      documentaryGate: effective.length && !missingCoreSections.length
        ? "requirements_approved" : "blocked_missing_core_requirements",
      requiresHumanReview: !effective.length,
      coveredSections: SECTION_KEYS.filter((key) => sections[key].length),
      missingCoreSections,
      sections
    }
  };
}

export function basesAcceptanceContractHash(rows, acceptedIds) {
  const combined = combineApprovedBasesRows(rows, acceptedIds);
  return createHash("sha256").update(canonicalJson({
    interpretationIds: [...combined.approvedInterpretationIds].sort(),
    proposalConstraints: combined.proposalConstraints,
    requirementsContract: combined.requirementsContract
  })).digest("hex");
}
