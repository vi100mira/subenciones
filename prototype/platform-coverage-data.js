window.PLATFORM_COVERAGE = {
  generatedAt: "2026-07-01T10:55:02.583Z",
  public: {
    agent: "Busqueda de convocatorias",
    source: "BDNS/SNPSAP",
    query: "social",
    potential: 572,
    loaded: 30,
    open: 6,
    uncertain: 16,
    closed: 8,
    detailErrors: 0,
    state: "funcional paginado"
  },
  municipal: {
    agent: "Busqueda de convocatorias locales",
    source: "BDNS/SNPSAP - tipoAdmon=L",
    queries: ["accion social", "inclusion", "empleo", "asociaciones", "entidades sin animo de lucro"],
    activationRule: "Emisor oficial + solicitud abierta + bases extraidas",
    state: "campana funcional; BOP y portales locales se profundizan desde la ficha BDNS"
  },
  privateOpen: {
    agent: "Busqueda privada abierta",
    sourcesReviewed: 18,
    accepted: 18,
    activeOrOpen: 0,
    monitorOnly: 16,
    needsHumanReview: 16,
    loadedRows: 18,
    scrapingUsed: true,
    state: "18 iniciativas privadas catalogadas; 16 por verificar y 2 cerradas; ninguna se activa sin bases y vigencia"
  },
  entityResearch: {
    agent: "Investigador de entidad",
    requiredInputs: ["nombre", "web publica", "email admin", "consentimiento"],
    crawlLimit: "12 paginas / profundidad 2 / 90s / 3 MB",
    state: "operativo y alojado bajo demanda; solo procesa web pública consentida"
  }
};
