const PRIVATE_SOURCES = new Set(["guided_interview", "manual_entry", "uploaded_document"]);
const CORE_FIELDS = {
  legal_name: 5, tax_id: 4, registered_address: 2, mission: 4, trajectory: 3,
  territory: 2, collectives: 2, methodology: 2, team: 1, alliances: 1, evaluation: 1
};
const STOP = new Set(["para", "por", "con", "una", "uno", "unos", "unas", "del", "las", "los", "que", "como", "desde", "sobre", "entre", "esta", "este", "estos", "estas", "sus", "sin", "programa", "proyecto", "convocatoria", "ayuda", "ayudas", "subvencion", "subvenciones"]);

function terms(value) {
  return [...new Set(String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ").split(/\s+/).filter((term) => term.length > 2 && !STOP.has(term)))];
}

function allowed(candidate) {
  if (!PRIVATE_SOURCES.has(candidate.source_type)) return false;
  const metadata = candidate.metadata_json || {};
  if (metadata.personal_data_included === true || metadata.sensitive_data_included === true) return false;
  const dataClass = String(metadata.data_class || "internal");
  if (!["internal", "internal_approved"].includes(dataClass)) return false;
  const uses = Array.isArray(metadata.allowed_uses) ? metadata.allowed_uses.map(String) : [];
  return !uses.length || uses.includes("drafting");
}

export function retrieveApprovedFacts(candidates, queryParts, limit = 12) {
  const queryTerms = new Set(terms(queryParts.join(" ")));
  return candidates.filter(allowed).map((candidate) => {
    const factTerms = terms(`${candidate.field_key} ${candidate.suggested_value}`);
    const matchedTerms = factTerms.filter((term) => queryTerms.has(term)).slice(0, 8);
    const confidence = candidate.confidence === "high" ? 1 : candidate.confidence === "medium" ? 0.5 : 0;
    const score = Number(((CORE_FIELDS[candidate.field_key] || 0) + matchedTerms.length * 4 + confidence).toFixed(2));
    return { candidate, score, matchedTerms };
  }).filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score
      || String(right.candidate.reviewed_at || "").localeCompare(String(left.candidate.reviewed_at || ""))
      || left.candidate.id.localeCompare(right.candidate.id))
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(({ candidate, score, matchedTerms }) => ({
      id: candidate.id, sourceType: candidate.source_type, retrievalScore: score, matchedTerms
    }));
}

export const privateFactSourceTypes = [...PRIVATE_SOURCES];
