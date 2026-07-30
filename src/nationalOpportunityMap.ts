export type PlatformSourceReadRow = {
  id: string;
  label: string;
  kind: string;
};

export type PlatformOpportunityReadRow = {
  id: string;
  platform_source_id: string | null;
  source_scope: string;
  territory: string | null;
  status: string;
  last_seen_at: string | null;
  updated_at: string | null;
};

export type OpportunityVersionReadRow = {
  opportunity_id: string;
  deadline_status: string;
  deadline_confidence: string;
  source_url: string | null;
  official_url: string | null;
  detected_at: string | null;
};

export type NationalTerritoryReadRow = {
  code: string;
  label: string;
  evidenceSourceId: string;
  indexed: number;
  openVerified: number;
  pendingReview: number;
  evidenceUrls: number;
  updatedAt: string | null;
  canonicalSources: string[];
  dataStatus: "available" | "no_indexed_opportunities";
  cause: string;
};

const TERRITORIES = [
  ["ES-AN", "Andalucía", "boja", "ES61"],
  ["ES-AR", "Aragón", "boa", "ES24"],
  ["ES-AS", "Asturias", "bopa", "ES12"],
  ["ES-IB", "Illes Balears", "boib", "ES53"],
  ["ES-CN", "Canarias", "boc-canarias", "ES70"],
  ["ES-CB", "Cantabria", "boc-cantabria", "ES13"],
  ["ES-CM", "Castilla-La Mancha", "docm", "ES42"],
  ["ES-CL", "Castilla y León", "bocyl", "ES41"],
  ["ES-CT", "Cataluña", "dogc", "ES51"],
  ["ES-VC", "Comunitat Valenciana", "dogv", "ES52"],
  ["ES-EX", "Extremadura", "doe", "ES43"],
  ["ES-GA", "Galicia", "dog", "ES11"],
  ["ES-MD", "Comunidad de Madrid", "bocm", "ES3"],
  ["ES-MC", "Región de Murcia", "borm", "ES62"],
  ["ES-NC", "Navarra", "bon", "ES22"],
  ["ES-PV", "País Vasco", "bopv", "ES21"],
  ["ES-RI", "La Rioja", "bor", "ES23"]
] as const;

const TERRITORY_BY_NUTS_PREFIX = new Map(TERRITORIES.map(([code, , , nutsPrefix]) => [nutsPrefix, code]));
const TERRITORY_BY_CODE = new Map(TERRITORIES.map(([code, label, evidenceSourceId]) => [code, { label, evidenceSourceId }]));

function maxDate(...values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) || null;
}

function isHttpsUrl(value: string | null) {
  try {
    return new URL(value || "").protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * BDNS territory strings use NUTS codes. A national ES value stays national;
 * it is not duplicated into autonomous communities. Explicit multi-territory
 * values count once in each declared autonomous community.
 */
export function resolveNationalTerritories(value: string | null) {
  const territory = String(value || "").toUpperCase();
  if (/\bES\s*-\s*ESPA/.test(territory)) return { scope: "national" as const, codes: [] as string[] };
  const codes = [...territory.matchAll(/\bES\d{1,3}\b/g)]
    .map(([nuts]): string | undefined => [...TERRITORY_BY_NUTS_PREFIX.entries()]
      .filter(([prefix]) => nuts.startsWith(prefix))
      .sort(([left], [right]) => right.length - left.length)[0]?.[1])
    .filter((code): code is string => Boolean(code));
  return { scope: "autonomous" as const, codes: [...new Set(codes)] };
}

export function buildNationalOpportunityMap({
  generatedAt,
  sources,
  opportunities,
  versions,
  pendingReviewOpportunityIds
}: {
  generatedAt: string;
  sources: PlatformSourceReadRow[];
  opportunities: PlatformOpportunityReadRow[];
  versions: OpportunityVersionReadRow[];
  pendingReviewOpportunityIds: string[];
}) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const versionByOpportunityId = new Map(versions.map((version) => [version.opportunity_id, version]));
  const pendingIds = new Set(pendingReviewOpportunityIds);
  const rows = new Map(TERRITORIES.map(([code, label, evidenceSourceId]) => [code, {
    code, label, evidenceSourceId, indexed: 0, openVerified: 0, pendingReview: 0,
    evidenceUrls: 0, updatedAt: null as string | null, canonicalSources: new Set<string>()
  }]));
  const national = { indexed: 0, openVerified: 0, pendingReview: 0, evidenceUrls: 0, updatedAt: null as string | null, canonicalSources: new Set<string>() };
  let excludedWithoutTerritory = 0;
  let excludedWithoutBdnsSource = 0;

  for (const opportunity of opportunities) {
    const source = opportunity.platform_source_id ? sourceById.get(opportunity.platform_source_id) : undefined;
    if (opportunity.source_scope !== "platform_public" || source?.kind !== "bdns") {
      excludedWithoutBdnsSource += 1;
      continue;
    }
    const target = resolveNationalTerritories(opportunity.territory);
    if (target.scope === "autonomous" && !target.codes.length) {
      excludedWithoutTerritory += 1;
      continue;
    }
    const version = versionByOpportunityId.get(opportunity.id);
    const hasEvidence = isHttpsUrl(version?.official_url || version?.source_url || null);
    const isOpenVerified = opportunity.status === "open"
      && version?.deadline_status === "open"
      && ["high", "medium"].includes(version.deadline_confidence)
      && hasEvidence;
    const apply = (summary: typeof national) => {
      summary.indexed += 1;
      if (isOpenVerified) summary.openVerified += 1;
      if (pendingIds.has(opportunity.id)) summary.pendingReview += 1;
      if (hasEvidence) summary.evidenceUrls += 1;
      summary.updatedAt = maxDate(summary.updatedAt, opportunity.last_seen_at, opportunity.updated_at, version?.detected_at);
      summary.canonicalSources.add(source.label);
    };
    if (target.scope === "national") apply(national);
    else target.codes.forEach((code) => apply(rows.get(code as (typeof TERRITORIES)[number][0])!));
  }

  const territories: NationalTerritoryReadRow[] = TERRITORIES.map(([code]) => {
    const row = rows.get(code)!;
    return {
      code: row.code,
      label: row.label,
      evidenceSourceId: row.evidenceSourceId,
      indexed: row.indexed,
      openVerified: row.openVerified,
      pendingReview: row.pendingReview,
      evidenceUrls: row.evidenceUrls,
      updatedAt: row.updatedAt,
      canonicalSources: [...row.canonicalSources].sort(),
      dataStatus: row.indexed ? "available" : "no_indexed_opportunities",
      cause: row.indexed ? "Lectura persistida de BDNS con territorio explícito." : "No hay convocatorias BDNS indexadas con territorio explícito para esta comunidad."
    };
  });

  return {
    generatedAt,
    rules: {
      canonicalSource: "Solo oportunidades platform_public vinculadas a una fuente BDNS persistida.",
      territory: "ES nacional no se reparte; los registros multi-territorio cuentan solo en cada comunidad indicada por su código NUTS.",
      openVerified: "Estado open + versión vigente open + confianza alta/media + URL HTTPS de evidencia.",
      pendingReview: "Oportunidades con un evento persistido de cambio en revisión humana pendiente."
    },
    territories,
    nationalScope: { ...national, canonicalSources: [...national.canonicalSources].sort() },
    exclusions: { withoutTerritory: excludedWithoutTerritory, withoutBdnsSource: excludedWithoutBdnsSource }
  };
}
