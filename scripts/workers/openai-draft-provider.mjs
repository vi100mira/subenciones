import { actionableDocumentRequirements } from "./document-requirement-classifier.mjs";

const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_MAX_OUTPUT_TOKENS = 10000;

export const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "documents", "documentPlan", "evidenceRefs", "uncertainties", "humanReviewRequired", "submissionAllowed"],
  properties: {
    title: { type: "string" },
    documents: {
      type: "array", minItems: 1, maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["documentRef", "role", "title", "documentType", "requirementRefs", "sections", "evidenceRefs", "missingInputs"],
        properties: {
          documentRef: { type: "string" },
          role: { type: "string", enum: ["primary_proposal", "supporting_draft"] },
          title: { type: "string" },
          documentType: { type: "string" },
          requirementRefs: { type: "array", minItems: 1, items: { type: "string" } },
          sections: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", additionalProperties: false, required: ["title", "paragraphs", "evidenceRefs"], properties: {
            title: { type: "string" }, paragraphs: { type: "array", minItems: 1, items: { type: "string" } }, evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } }
          } } },
          evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } },
          missingInputs: { type: "array", items: { type: "string" } }
        }
      }
    },
    documentPlan: {
      type: "array", minItems: 1, maxItems: 40,
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "category", "preparation", "requirementRefs", "draftDocumentRefs", "evidenceRefs", "missingInputs"],
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: ["generated_draft", "official_form", "supporting_evidence", "declaration", "other"] },
          preparation: { type: "string", enum: ["drafted_in_proposal", "official_template_required", "tenant_evidence_required", "human_completion_required", "pending_classification"] },
          requirementRefs: { type: "array", minItems: 1, items: { type: "string" } },
          draftDocumentRefs: { type: "array", items: { type: "string" } },
          evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } },
          missingInputs: { type: "array", items: { type: "string" } }
        }
      }
    },
    evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } },
    uncertainties: { type: "array", items: { type: "string" } },
    humanReviewRequired: { type: "boolean", enum: [true] },
    submissionAllowed: { type: "boolean", enum: [false] }
  }
};

function limited(value, maximum = 12000) {
  return String(value || "").trim().slice(0, maximum);
}

export function requiredDocumentChecklist(context) {
  return actionableDocumentRequirements(context.requirementsContract).slice(0, 40).map(({ clause, classification }, index) => ({
    requirementRef: `required-document:${index + 1}`,
    text: limited(clause.text || clause.evidenceExcerpt, 1800),
    evidenceRef: clause.sourceUrl ? `${clause.sourceUrl}${clause.sourcePage ? `#page=${clause.sourcePage}` : ""}` : `sha256:${clause.documentSha256 || "unknown"}${clause.sourcePage ? `:page:${clause.sourcePage}` : ""}`,
    documentSha256: clause.documentSha256 || null,
    phase: classification.phase, specificity: classification.specificity,
    detectedCategories: classification.detectedCategories, recommendedCategory: classification.recommendedCategory, recommendedPreparation: classification.recommendedPreparation,
    planningReady: classification.planningReady, classificationReason: classification.reason
  }));
}

export function publicDraftInput(context) {
  const approvedFacts = (context.approvedFacts || []).slice(0, 40).map((fact) => ({
    factRef: `approved-fact:${limited(fact.id, 80)}`, fieldKey: limited(fact.fieldKey, 100), value: limited(fact.value, 1200),
    sourceType: fact.sourceType, confidence: fact.confidence
  }));
  return {
    dataClass: approvedFacts.length ? "public_plus_internal_approved" : "public",
    opportunity: {
      title: limited(context.title, 500),
      funder: limited(context.funderName, 500),
      sourceUrl: context.sourceUrl,
      officialUrl: context.officialUrl,
      basesUrl: context.basesUrl,
      deadline: limited(context.deadlineText, 2000),
      amount: limited(context.amountText, 2000),
      eligibility: limited(context.eligibilityText),
      criteria: limited(context.criteriaText),
      requiredDocuments: limited(context.requiredDocumentsText),
      requiredDocumentChecklist: requiredDocumentChecklist(context),
      submissionChannel: limited(context.submissionChannelText, 4000),
      proposalConstraints: context.constraints,
      approvedRequirementsContract: context.requirementsContract
    },
    entityApprovedFacts: approvedFacts,
    instructions: [
      "Redacta en español exclusivamente con la evidencia pública incluida.",
      "No inventes experiencia, cifras, personas, resultados ni datos de la entidad solicitante.",
      "Estructura el contenido para responder a las secciones del contrato de bases aprobado y cita su evidencia.",
      "Crea un plan documental que cubra cada requirementRef de requiredDocumentChecklist al menos una vez.",
      "Respeta recommendedCategory y recommendedPreparation cuando no sean mixed_bundle ni pending_classification; desglosa cada mixed_bundle en varios elementos del plan.",
      "Genera un elemento documents independiente por cada contenido redactable; enlazalo desde documentPlan.draftDocumentRefs y usa exactamente un role primary_proposal.",
      "Usa en documentType el identificador de la restriccion oficial correspondiente cuando exista; los demas documentos son supporting_draft.",
      "Distingue el texto redactable de formularios oficiales, acreditaciones del tenant y declaraciones que necesitan completado humano.",
      "Usa entityApprovedFacts solo cuando esten presentes; no extrapoles ni completes datos de entidad ausentes y cita su factRef en evidenceRefs.",
      "Cuando falte información de la entidad, declárala como incertidumbre y usa un marcador pendiente.",
      "Cita sourceUrl, officialUrl, basesUrl o la página de las restricciones en evidenceRefs.",
      "Respeta todos los límites y reglas formales; la validación PDF y la revisión humana siguen siendo obligatorias.",
      "Nunca declares que el documento puede presentarse automáticamente."
    ]
  };
}

function outputText(response) {
  return (response.output || []).flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
}

export function estimateCostEur(usage, options = {}) {
  const inputPerMillion = Number(options.inputUsdPerMillion ?? process.env.AI_DRAFT_INPUT_USD_PER_MILLION ?? 1);
  const outputPerMillion = Number(options.outputUsdPerMillion ?? process.env.AI_DRAFT_OUTPUT_USD_PER_MILLION ?? 6);
  const safetyFactor = Number(options.eurSafetyFactor ?? process.env.AI_DRAFT_EUR_SAFETY_FACTOR ?? 1.2);
  const usd = ((Number(usage.input_tokens || 0) * inputPerMillion) + (Number(usage.output_tokens || 0) * outputPerMillion)) / 1_000_000;
  return Number((usd * safetyFactor).toFixed(6));
}

export function maximumRunCostEur(options = {}) {
  const maxInputTokens = Number(options.maxInputTokens ?? process.env.AI_DRAFT_MAX_INPUT_TOKENS ?? 20000);
  const maxOutputTokens = Number(options.maxOutputTokens ?? process.env.AI_DRAFT_MAX_OUTPUT_TOKENS ?? DEFAULT_MAX_OUTPUT_TOKENS);
  return estimateCostEur({ input_tokens: maxInputTokens, output_tokens: maxOutputTokens }, options);
}

export async function generatePublicDraft(context, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const model = options.model || process.env.AI_DRAFT_MODEL || DEFAULT_MODEL;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada en el worker.");
  const fetchFn = options.fetchFn || fetch;
  const response = await fetchFn("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: Number(options.maxOutputTokens || process.env.AI_DRAFT_MAX_OUTPUT_TOKENS || DEFAULT_MAX_OUTPUT_TOKENS),
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: "Eres un redactor técnico de subvenciones. Solo utilizas evidencia aportada, señalas lagunas y produces un borrador sujeto a revisión humana." },
        { role: "user", content: JSON.stringify(publicDraftInput(context)) }
      ],
      text: { format: { type: "json_schema", name: "borrador_subvencion", strict: true, schema: draftSchema } }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI respondió ${response.status}: ${payload.error?.message || "error sin detalle"}`);
  const text = outputText(payload);
  if (!text) throw new Error("OpenAI no devolvió un borrador estructurado.");
  return {
    output: JSON.parse(text), model, responseId: payload.id,
    usage: {
      input_tokens: Number(payload.usage?.input_tokens || 0),
      output_tokens: Number(payload.usage?.output_tokens || 0),
      total_tokens: Number(payload.usage?.total_tokens || 0),
      estimated_eur: estimateCostEur(payload.usage || {}, options)
    }
  };
}
