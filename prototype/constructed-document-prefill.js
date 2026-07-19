(function () {
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const values = (items) => [...new Set((Array.isArray(items) ? items : []).map((item) => String(item?.text || item || "").trim()).filter(Boolean))];
  const usable = (value) => value && !/(pendiente|requiere revision|por confirmar)/i.test(String(value));

  function clauses(pack, key) {
    return values(pack?.requirementsContract?.sections?.[key]);
  }

  function availableSection(pack, section) {
    const key = normalize(section);
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

    if (/(identificacion|datos administrativos)/.test(key)) return common;
    if (/(linea solicitada|objetivo)/.test(key)) return values([pack?.title, ...activities, ...criteria]);
    if (/(declaracion|obligacion)/.test(key)) return values([...eligibility, ...obligations]);
    if (/(diagnostico|problema)/.test(key)) return values([...(pack?.fit || []), ...(pack?.evidence || [])]);
    if (/(actividad|metodologia)/.test(key)) return values([...activities, ...(pack?.steps || [])]);
    if (/(impacto|indicador|evaluacion|verificacion)/.test(key)) return values([...criteria, ...(pack?.evidence || [])]);
    if (/(personal|coste|cofinanciacion|presupuesto|alerta)/.test(key)) return values([...limits, pack?.requirementsContract?.sections?.budgetRules?.[0]?.text]);
    if (/(representante|poder|vigencia|adjunto|certificado|estatuto|cuenta|solvencia)/.test(key)) return required.filter((item) => /(represent|poder|certific|estatuto|cuenta|aeat|seguridad social)/i.test(item));
    if (/(rol|dedicacion|equipo)/.test(key)) return clauses(pack, "eligibleActivities");
    if (key === "privacidad") return ["Usar solo datos personales mínimos y autorizados; excluir expedientes individuales y datos sensibles."];
    if (key === "firma") return [];
    return common;
  }

  function wordSet(value) {
    return new Set(normalize(value).split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  }

  function matchGeneratedDocument(doc, output) {
    const documents = Array.isArray(output?.documents) ? output.documents : [];
    if (!documents.length) return null;
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
      const key = normalize(title);
      const generated = generatedSections.find((section) => {
        const candidate = normalize(section.title);
        return candidate === key || candidate.includes(key) || key.includes(candidate);
      });
      if (generated?.paragraphs?.length) return {
        title, state: "generated", label: "Borrador generado · revisión humana pendiente",
        paragraphs: values(generated.paragraphs), evidence: values(generated.evidenceRefs)
      };
      const available = availableSection(pack, title);
      if (available.length) return {
        title, state: "prefilled", label: "Pre-rellenado con datos disponibles",
        paragraphs: available.slice(0, 6), evidence: values([pack?.source])
      };
      return {
        title, state: "pending", label: "Contenido pendiente",
        paragraphs: [key === "firma"
          ? "La firma nunca se autocompleta: debe realizarla una persona autorizada después de revisar el documento."
          : "No hay información aprobada suficiente para completar este apartado sin inventar datos."],
        evidence: []
      };
    });
  }

  window.ConstructedDocumentPrefill = { matchGeneratedDocument, sections };
})();
