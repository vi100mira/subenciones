(function () {
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const values = (items) => [...new Set((Array.isArray(items) ? items : []).map((item) => String(item?.text || item || "").trim()).filter(Boolean))];
  const usable = (value) => value && !/(pendiente|requiere revision|por confirmar)/i.test(String(value));
  const families = [
    ["identity", /identificacion|datos administrativos|entidad solicitante|resumen/],
    ["diagnosis", /diagnostico|necesidad|problema|contexto/],
    ["objectives", /objetivo|finalidad|resultado esperado/],
    ["beneficiaries", /destinatar|beneficiar|colectiv|participante/],
    ["methodology", /actividad|metodologia|plan de trabajo|actuacion/],
    ["calendar", /calendario|cronograma|plazo de ejecucion|temporal/],
    ["team", /equipo|personal|perfil|dedicacion|alianza/],
    ["impact", /impacto|indicador|evaluacion|verificacion|seguimiento/],
    ["budget", /coste|cofinanciacion|presupuesto|financiacion|sostenibilidad/],
    ["risk", /riesgo|obligacion|declaracion|alerta/],
    ["evidence", /representante|poder|vigencia|adjunto|certificado|estatuto|cuenta|solvencia/],
    ["privacy", /privacidad|datos personales/],
    ["signature", /firma/]
  ];
  const questions = {
    identity: "¿Cuál es el nombre definitivo del proyecto y qué datos institucionales deben figurar?",
    diagnosis: "¿Qué necesidad concreta aborda el proyecto y qué evidencia actual la demuestra?",
    objectives: "¿Qué objetivos específicos y medibles asume esta candidatura?",
    beneficiaries: "¿Cuántas personas se atenderán, con qué perfil agregado y en qué territorio?",
    methodology: "¿Cómo se ejecutará cada actividad y qué relación tiene con los objetivos?",
    calendar: "¿En qué fechas e hitos se ejecutará cada actividad?",
    team: "¿Qué perfiles, dedicaciones y alianzas se asignan al proyecto?",
    impact: "¿Cuál es la línea base, la meta y la fuente de verificación de cada indicador?",
    budget: "¿Qué importe, costes, IVA y cofinanciación se aprueban para esta candidatura?",
    risk: "¿Qué riesgos, mitigaciones y obligaciones específicas deben validarse?",
    evidence: "¿Qué documento auténtico, vigente y autorizado debe adjuntarse?"
  };

  function clauses(pack, key) {
    return values(pack?.requirementsContract?.sections?.[key]);
  }

  function familyFor(section) {
    const key = normalize(section);
    return families.find(([, pattern]) => pattern.test(key))?.[0] || "identity";
  }

  function evidenceFor(pack, keys = []) {
    const entries = keys.flatMap((key) => pack?.requirementsContract?.sections?.[key] || []);
    return values(entries.flatMap((entry) => [
      entry?.sourceUrl ? `${entry.sourceUrl}${entry.sourcePage ? `#page=${entry.sourcePage}` : ""}` : "",
      entry?.evidenceExcerpt || ""
    ]));
  }

  function availableSection(pack, section) {
    const family = familyFor(section);
    const entity = window.CredentialsAuth?.getSession?.()?.label || "";
    const common = [
      usable(entity) ? `Entidad solicitante: ${entity}` : "",
      usable(pack?.title) ? `Convocatoria: ${pack.title}` : "",
      usable(pack?.source) ? `Fuente: ${pack.source}` : "",
      usable(pack?.territory) ? `Territorio: ${pack.territory}` : "",
      usable(pack?.deadline) ? `Plazo: ${pack.deadline}` : ""
    ].filter(Boolean);
    const activities = clauses(pack, "eligibleActivities");
    const eligibility = [...clauses(pack, "beneficiaries"), ...clauses(pack, "eligibilityRequirements")];
    const obligations = clauses(pack, "obligations");
    const criteria = clauses(pack, "evaluationCriteria");
    const limits = values(pack?.proposalConstraints?.limits?.map((item) => item.evidenceExcerpt || `${item.documentType || "Documento"}: ${item.value || ""} ${item.unit || ""}`));
    const required = values(pack?.documentRequirements);

    const byFamily = {
      identity: common,
      diagnosis: values([...(pack?.fit || []), ...(pack?.evidence || [])]),
      objectives: values([pack?.title, ...activities, ...criteria]),
      beneficiaries: eligibility,
      methodology: values([...activities, ...(pack?.steps || [])]),
      calendar: clauses(pack, "submission"),
      team: [],
      impact: values([...criteria, ...(pack?.evidence || [])]),
      budget: values([...limits, ...clauses(pack, "budgetRules")]),
      risk: values([...obligations, ...(pack?.risks || [])]),
      evidence: required.filter((item) => /(represent|poder|certific|estatuto|cuenta|aeat|seguridad social)/i.test(item)),
      privacy: ["Usar solo datos personales mínimos y autorizados; excluir expedientes individuales y datos sensibles."],
      signature: []
    };
    const evidenceKeys = {
      objectives: ["eligibleActivities", "evaluationCriteria"], beneficiaries: ["beneficiaries", "eligibilityRequirements"],
      methodology: ["eligibleActivities"], calendar: ["submission"], impact: ["evaluationCriteria"],
      budget: ["budgetRules"], risk: ["obligations"], evidence: ["requiredDocuments"]
    };
    return {
      family,
      paragraphs: values(byFamily[family] || common).slice(0, 6),
      evidence: values([...evidenceFor(pack, evidenceKeys[family]), pack?.source]),
      state: ["diagnosis", "risk"].includes(family) ? "proposed" : "verified"
    };
  }

  function wordSet(value) {
    return new Set(normalize(value).split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  }

  function matchGeneratedDocument(doc, output) {
    const documents = Array.isArray(output?.documents) ? output.documents : [];
    if (!documents.length) return null;
    const requirementRefs = values([doc?.requirementRef, ...(doc?.requirementRefs || [])]);
    const exact = requirementRefs.length
      ? documents.find((item) => requirementRefs.some((ref) => item.requirementRefs?.includes(ref)))
      : null;
    if (exact) return exact;
    const target = wordSet(`${doc?.title} ${doc?.requirement}`);
    const scored = documents.map((item) => {
      const candidate = wordSet(`${item.title} ${item.documentType}`);
      return { item, score: [...target].filter((word) => candidate.has(word)).length };
    }).sort((a, b) => b.score - a.score);
    if (scored[0]?.score) return scored[0].item;
    if (doc?.classification?.recommendedCategory === "generated_draft") return documents.find((item) => item.role === "primary_proposal") || documents[0];
    return null;
  }

  function sections(doc, pack, generatedDocument) {
    const generatedSections = Array.isArray(generatedDocument?.sections) ? generatedDocument.sections : [];
    return (doc?.sections || []).map((title) => {
      const family = familyFor(title);
      const key = normalize(title);
      const generated = generatedSections.find((section) => {
        const candidate = normalize(section.title);
        return candidate === key || candidate.includes(key) || key.includes(candidate) || familyFor(section.title) === family;
      });
      if (generated?.paragraphs?.length) return {
        title, state: "proposed", label: "Propuesto con evidencia · revisión humana pendiente",
        paragraphs: values(generated.paragraphs), evidence: values(generated.evidenceRefs), questions: []
      };
      const available = availableSection(pack, title);
      if (available.family === "signature") return {
        title, state: "human_only", label: "Acción exclusivamente humana",
        paragraphs: ["La firma nunca se autocompleta ni se presenta: debe realizarla una persona autorizada después de revisar el documento."],
        evidence: [], questions: []
      };
      if (available.paragraphs.length) return {
        title, state: available.state, label: available.state === "verified" ? "Pre-rellenado con fuente verificable" : "Contexto propuesto · revisar",
        paragraphs: available.paragraphs, evidence: available.evidence,
        questions: questions[available.family] ? [questions[available.family]] : []
      };
      return {
        title, state: "missing", label: "Dato pendiente · no se inventa",
        paragraphs: ["No hay información aprobada suficiente para completar este apartado."],
        evidence: [], questions: [questions[available.family] || `¿Qué información aprobada debe completar “${title}”?`]
      };
    });
  }

  function summary(items) {
    const count = (state) => items.filter((item) => item.state === state).length;
    return { verified: count("verified"), proposed: count("proposed"), missing: count("missing"), humanOnly: count("human_only"), total: items.length };
  }

  window.ConstructedDocumentPrefill = { matchGeneratedDocument, sections, summary };
})();
