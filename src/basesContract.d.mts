export type BasesInterpretationRow = {
  id: string;
  status: string;
  citations_verified: boolean;
  contract_json: Record<string, any> | null;
};

export type CombinedBases = {
  status: string;
  citationsVerified: boolean;
  approvedInterpretationIds: string[];
  proposalConstraints: Record<string, any>;
  requirementsContract: Record<string, any>;
};

export function combineApprovedBasesRows(rows: BasesInterpretationRow[], acceptedIds?: string[]): CombinedBases;
export function basesAcceptanceContractHash(rows: BasesInterpretationRow[], acceptedIds: string[]): string;
