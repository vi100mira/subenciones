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
  privateOpen: {
    agent: "Busqueda privada abierta",
    sourcesReviewed: 12,
    accepted: 12,
    activeOrOpen: 6,
    monitorOnly: 5,
    needsHumanReview: 1,
    loadedRows: 20,
    scrapingUsed: false,
    state: "funcional con catalogo inicial"
  },
  entityResearch: {
    agent: "Investigador de entidad",
    requiredInputs: ["nombre", "web publica", "email admin", "consentimiento"],
    crawlLimit: "12 paginas / profundidad 2 / 90s / 3 MB",
    state: "operativo como flujo de plataforma; falta worker real"
  }
};
