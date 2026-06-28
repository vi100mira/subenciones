(function () {
  const context = {
    name: "Novaterra demo",
    territory: "Comunitat Valenciana",
    allowedTerritories: ["es - espana", "comunitat valenciana", "valenciana", "valencia", "castellon", "alicante"],
    excludedTerritories: ["cadiz", "huelva", "granada", "aragon", "london", "todo el mundo"]
  };

  function plain(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function territoryText(item) {
    return plain([item.territory, item.organism, item.administrationLevel].join(" "));
  }

  function territoryDecision(item) {
    const text = territoryText(item);
    const allowed = context.allowedTerritories.some((token) => text.includes(plain(token)));
    const excluded = context.excludedTerritories.find((token) => text.includes(plain(token)));
    if (allowed && !excluded) {
      return {
        status: "candidate",
        reason: `Territorio compatible con ${context.territory}: estatal o valenciano.`
      };
    }
    return {
      status: "discarded",
      reason: excluded
        ? `Descartada por territorio ajeno al perfil de ${context.name}: ${item.territory || excluded}.`
        : `Requiere revision territorial antes de proponerse a ${context.name}.`
    };
  }

  function applyEntityFit() {
    if (!window.RADAR?.opportunities?.length) return;
    const annotated = window.RADAR.opportunities.map((item) => {
      const entityFit = territoryDecision(item);
      return { ...item, entityFit };
    });
    const territorialCandidates = annotated.filter((item) => item.entityFit.status === "candidate");
    const archived = territorialCandidates
      .filter((item) => item.deadlineStatus === "closed")
      .map((item) => ({
        ...item,
        entityFit: {
          status: "archived",
          reason: "Archivada por plazo cerrado; no se muestra como oportunidad viva."
        }
      }));
    const visible = territorialCandidates.filter((item) => item.deadlineStatus !== "closed");
    const discarded = annotated.filter((item) => item.entityFit.status !== "candidate");
    window.RADAR_ENTITY_CONTEXT = context;
    window.RADAR_ENTITY_DISCARDED = discarded;
    window.RADAR_DEADLINE_ARCHIVED = archived;
    window.RADAR.opportunities = visible;
    window.RADAR.count = visible.length;
    window.RADAR.quality = {
      ...(window.RADAR.quality || {}),
      entityCandidateCount: visible.length,
      entityDiscardedCount: discarded.length,
      entityArchivedClosedCount: archived.length,
      entityFitRule: `Solo estatal/Espana o ${context.territory}`
    };
  }

  applyEntityFit();
})();
