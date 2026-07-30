// Declarative platform catalogue. It is not a scanner input until each source
// has passed the explicit access and review gates below.
export const PUBLIC_NATIONAL_SOURCE_CATALOG_VERSION = "public-national-v1";

const NO_SCAN = Object.freeze({
  enabled: false,
  requestsPerMinute: 0,
  pagesPerRun: 0,
  maxDepth: 0
});

function publicSource({ id, label, kind, sourceRole, territoryCodes, owner, url, procedureEvidenceUrl, accessMethods }) {
  return {
    id,
    label,
    kind,
    source_role: sourceRole,
    scope: "platform_global",
    territory_codes: territoryCodes,
    owner,
    url,
    provenance_url: url,
    procedure_evidence_url: procedureEvidenceUrl || null,
    procedure_evidence_role: procedureEvidenceUrl ? "procedure_evidence" : null,
    access: {
      methods: accessMethods,
      robots_status: "pending_assessment",
      terms_status: "pending_assessment"
    },
    scan_policy: { ...NO_SCAN },
    review_status: "pending_assessment",
    opportunity_policy: "evidence_only_never_create_opportunities"
  };
}

export const PUBLIC_NATIONAL_SOURCE_CATALOG = Object.freeze([
  publicSource({ id: "bdns-snpsap", label: "BDNS / SNPSAP", kind: "bdns", sourceRole: "discovery_canonical", territoryCodes: ["ES"], owner: "Intervencion General de la Administracion del Estado", url: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias", accessMethods: ["api", "html"] }),
  publicSource({ id: "boe", label: "BOE", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES"], owner: "Agencia Estatal Boletin Oficial del Estado", url: "https://www.boe.es/", accessMethods: ["html", "xml", "pdf"] }),
  publicSource({ id: "boja", label: "BOJA", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-AN"], owner: "Junta de Andalucia", url: "https://www.juntadeandalucia.es/eboja.html", procedureEvidenceUrl: "https://www.juntadeandalucia.es/servicios/sede.html", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "boa", label: "BOA", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-AR"], owner: "Gobierno de Aragon", url: "https://www.boa.aragon.es/", procedureEvidenceUrl: "https://www.aragon.es/tramites", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "bopa", label: "BOPA", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-AS"], owner: "Principado de Asturias", url: "https://sede.asturias.es/bopa", procedureEvidenceUrl: "https://sede.asturias.es/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "boib", label: "BOIB", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-IB"], owner: "Govern de les Illes Balears", url: "https://www.caib.es/eboibfront/", procedureEvidenceUrl: "https://www.caib.es/seucaib/es/", accessMethods: ["html", "pdf", "rss"] }),
  publicSource({ id: "boc-canarias", label: "BOC", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-CN"], owner: "Gobierno de Canarias", url: "https://www.gobiernodecanarias.org/boc/", procedureEvidenceUrl: "https://sede.gobiernodecanarias.org/sede/", accessMethods: ["html", "pdf", "rss"] }),
  publicSource({ id: "boc-cantabria", label: "BOC", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-CB"], owner: "Gobierno de Cantabria", url: "https://boc.cantabria.es/", procedureEvidenceUrl: "https://sede.cantabria.es/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "docm", label: "DOCM", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-CM"], owner: "Junta de Comunidades de Castilla-La Mancha", url: "https://docm.castillalamancha.es/", procedureEvidenceUrl: "https://www.jccm.es/sede/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "bocyl", label: "BOCYL", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-CL"], owner: "Junta de Castilla y Leon", url: "https://bocyl.jcyl.es/", procedureEvidenceUrl: "https://www.tramitacastillayleon.jcyl.es/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "dogc", label: "DOGC", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-CT"], owner: "Generalitat de Catalunya", url: "https://dogc.gencat.cat/", procedureEvidenceUrl: "https://web.gencat.cat/es/tramits/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "dogv", label: "DOGV", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-VC"], owner: "Generalitat Valenciana", url: "https://dogv.gva.es/", procedureEvidenceUrl: "https://www.gva.es/es/inicio/procedimientos", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "doe", label: "DOE", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-EX"], owner: "Junta de Extremadura", url: "https://doe.juntaex.es/", procedureEvidenceUrl: "https://sede.juntaex.es/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "dog", label: "DOG", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-GA"], owner: "Xunta de Galicia", url: "https://www.xunta.gal/diario-oficial-galicia", procedureEvidenceUrl: "https://sede.xunta.gal/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "bocm", label: "BOCM", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-MD"], owner: "Comunidad de Madrid", url: "https://www.bocm.es/", procedureEvidenceUrl: "https://sede.comunidad.madrid/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "borm", label: "BORM", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-MC"], owner: "Region de Murcia", url: "https://www.borm.es/", procedureEvidenceUrl: "https://sede.carm.es/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "bon", label: "BON", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-NC"], owner: "Gobierno de Navarra", url: "https://bon.navarra.es/", procedureEvidenceUrl: "https://www.navarra.es/es/tramites", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "bopv", label: "BOPV", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-PV"], owner: "Gobierno Vasco", url: "https://www.euskadi.eus/bopv2/datos/", procedureEvidenceUrl: "https://www.euskadi.eus/ayudas-subvenciones/web01-a2koga/es/", accessMethods: ["html", "pdf"] }),
  publicSource({ id: "bor", label: "BOR", kind: "gazette", sourceRole: "official_publication", territoryCodes: ["ES-RI"], owner: "Gobierno de La Rioja", url: "https://web.larioja.org/bor-portada/bor", procedureEvidenceUrl: "https://www.larioja.org/oficina-electronica/es/", accessMethods: ["html", "pdf"] })
]);

export function publicSourceScanBlockReason(source) {
  if (source.scope !== "platform_global") return "source_not_platform_global";
  if (source.review_status !== "approved_for_scan") return "review_pending";
  if (source.access?.robots_status !== "permitted") return "robots_not_permitted";
  if (source.access?.terms_status !== "permitted") return "terms_not_permitted";
  if (source.scan_policy?.enabled !== true) return "scan_not_enabled";
  return null;
}

export function isPublicSourceScanEligible(source) {
  return publicSourceScanBlockReason(source) === null;
}
