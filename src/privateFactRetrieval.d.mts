export type ApprovedFactCandidate = {
  id: string;
  field_key: string;
  suggested_value: string;
  source_type: string;
  confidence?: string | null;
  reviewed_at?: string | null;
  metadata_json?: Record<string, unknown> | null;
};

export type RetrievedFactRef = {
  id: string;
  sourceType: string;
  retrievalScore: number;
  matchedTerms: string[];
};

export function retrieveApprovedFacts(
  candidates: ApprovedFactCandidate[], queryParts: unknown[], limit?: number
): RetrievedFactRef[];

export const privateFactSourceTypes: string[];
