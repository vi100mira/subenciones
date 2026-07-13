(function () {
  const context = {
    name: "Novaterra",
    territory: "Comunitat Valenciana",
    allowedTerritories: ["es - espana", "comunitat valenciana", "valenciana", "valencia", "castellon", "alicante"],
    excludedTerritories: ["cadiz", "huelva", "granada", "aragon", "london", "todo el mundo"],
    webSignals: ["empleo", "insercion", "inclusion", "discapacidad", "vulnerab", "formacion", "itinerario", "acompanamiento", "economia social", "rse", "accion social", "servicios sociales", "tercer sector", "joven"],
    negativeSignals: ["deporte", "federacion", "futbol", "ejercito", "armada", "inspeccion de trabajo", "becas para la preparacion", "corporaciones locales"]
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

  function itemText(item) {
    return plain([
      item.title,
      item.theme,
      item.source,
      item.territory,
      item.organism,
      item.amount,
      ...(item.fit || []),
      ...(item.programFeatures || [])
    ].join(" "));
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

  function thematicDecision(item) {
    const text = itemText(item);
    const hits = context.webSignals.filter((token) => text.includes(plain(token)));
    const blocked = context.negativeSignals.find((token) => text.includes(plain(token)));
    if (blocked && hits.length < 2) {
      return { status: "discarded", hits, reason: `No prioritaria para Novaterra: pesa mas ${blocked} que empleo/inclusion.` };
    }
    if (hits.length >= 2) {
      return { status: "candidate", hits, reason: `Encaje Novaterra por ${hits.slice(0, 3).join(", ")}.` };
    }
    return { status: "discarded", hits, reason: "No aparecen senales suficientes del perfil web de Novaterra: empleo, inclusion, formacion o accion social." };
  }

  function entityDecision(item) {
    const territory = territoryDecision(item);
    const thematic = thematicDecision(item);
    if (territory.status === "candidate" && thematic.status === "candidate") {
      return {
        status: "candidate",
        reason: `${thematic.reason} ${territory.reason}`,
        signals: thematic.hits
      };
    }
    return {
      status: "discarded",
      reason: territory.status !== "candidate" ? territory.reason : thematic.reason,
      signals: thematic.hits
    };
  }

  function applyEntityFit() {
    if (!window.RADAR?.opportunities?.length) return;
    const annotated = window.RADAR.opportunities.map((item) => {
      const entityFit = entityDecision(item);
      return { ...item, entityFit };
    });
    const privateAnnotated = (window.PRIVATE_OPEN_OPPORTUNITIES || []).map((item) => ({ ...item, entityFit: entityDecision(item) }));
    window.RADAR_PLATFORM_OPPORTUNITIES = annotated;
    window.PRIVATE_OPEN_OPPORTUNITIES = privateAnnotated;
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
    const discarded = [...annotated, ...privateAnnotated].filter((item) => item.entityFit.status !== "candidate");
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
      entityFitRule: `Web Novaterra: empleo, inclusion, formacion y accion social; territorio estatal o ${context.territory}`
    };
  }

  applyEntityFit();
})();
