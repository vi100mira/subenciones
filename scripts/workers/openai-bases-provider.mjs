import { estimateCostEur } from "./openai-draft-provider.mjs";

const SECTION_KEYS = ["beneficiaries", "eligibilityRequirements", "eligibleActivities", "requiredDocuments", "evaluationCriteria", "budgetRules", "submission", "obligations", "exclusions"];
const clauseSchema = {
  type: "object", additionalProperties: false, required: ["text", "sourcePage", "evidenceQuote", "confidence"],
  properties: {
    text: { type: "string" }, sourcePage: { type: "integer", minimum: 1 }, evidenceQuote: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] }
  }
};
const constraintEvidence = {
  sourcePage: { type: "integer", minimum: 1 }, evidenceQuote: { type: "string" },
  confidence: { type: "string", enum: ["high", "medium", "low"] }
};
const proposalConstraintsSchema = {
  type: "object", additionalProperties: false, required: ["limits", "formatRules"],
  properties: {
    limits: { type: "array", maxItems: 12, items: { type: "object", additionalProperties: false,
      required: ["documentType", "kind", "value", "unit", "sourcePage", "evidenceQuote", "confidence"],
      properties: { documentType: { type: "string" }, kind: { type: "string", enum: ["maximum"] },
        value: { type: "number", exclusiveMinimum: 0 }, unit: { type: "string", enum: ["pages", "folios", "sides", "words", "characters"] }, ...constraintEvidence } } },
    formatRules: { type: "array", maxItems: 12, items: { type: "object", additionalProperties: false,
      required: ["kind", "value", "sourcePage", "evidenceQuote", "confidence"],
      properties: { kind: { type: "string", enum: ["font_family", "font_size_points", "line_spacing", "file_format"] }, value: { type: "string" }, ...constraintEvidence } } }
  }
};

export const basesSchema = {
  type: "object", additionalProperties: false, required: ["sections", "proposalConstraints", "uncertainties", "humanReviewRequired"],
  properties: {
    sections: {
      type: "object", additionalProperties: false, required: SECTION_KEYS,
      properties: Object.fromEntries(SECTION_KEYS.map((key) => [key, { type: "array", maxItems: 12, items: clauseSchema }]))
    },
    proposalConstraints: proposalConstraintsSchema,
    uncertainties: { type: "array", maxItems: 30, items: { type: "string" } },
    humanReviewRequired: { type: "boolean", enum: [true] }
  }
};

function limited(value, maximum) {
  return String(value || "").trim().slice(0, maximum);
}

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function publicBasesInput(context) {
  return {
    dataClass: "public",
    sourceUrl: context.sourceUrl,
    documentSha256: context.documentSha256,
    pages: (context.pages || []).slice(0, 20).map((page) => ({ page: Number(page.page), text: limited(page.text, 5000) })),
    rules: [
      "Extrae solo afirmaciones respaldadas literalmente por las paginas incluidas.",
      "No completes requisitos por conocimiento general ni por analogia con otras convocatorias.",
      "Cada evidenceQuote debe ser una cita literal de la sourcePage indicada.",
      "Copia evidenceQuote exactamente como aparece, incluidos errores OCR; no corrijas, resumas ni recompongas el texto.",
      "Si no puedes copiar una cita literal de al menos 20 caracteres, omite la clausula y registrala como incertidumbre.",
      "Extrae limites de extension y reglas de formato solo cuando aparezcan literalmente; si no constan, devuelve listas vacias.",
      "Separa ausencia de evidencia como incertidumbre; nunca la conviertas en un hecho.",
      "La salida queda siempre pendiente de revision humana."
    ]
  };
}

export function verifyBasesCitations(output, pages) {
  const byPage = new Map((pages || []).map((page) => [Number(page.page), normalized(page.text)]));
  const errors = [];
  for (const key of SECTION_KEYS) {
    for (const [index, clause] of (output?.sections?.[key] || []).entries()) {
      const pageText = byPage.get(Number(clause.sourcePage));
      const quote = normalized(clause.evidenceQuote);
      if (!pageText) errors.push(`${key}[${index}]: pagina inexistente`);
      else if (quote.length < 20 || !pageText.includes(quote)) errors.push(`${key}[${index}]: cita no localizada`);
    }
  }
  for (const [group, clauses] of Object.entries(output?.proposalConstraints || {})) {
    for (const [index, clause] of (clauses || []).entries()) {
      const pageText = byPage.get(Number(clause.sourcePage));
      const quote = normalized(clause.evidenceQuote);
      if (!pageText) errors.push(`proposalConstraints.${group}[${index}]: pagina inexistente`);
      else if (quote.length < 20 || !pageText.includes(quote)) errors.push(`proposalConstraints.${group}[${index}]: cita no localizada`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function outputText(response) {
  return (response.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
}

export async function interpretPublicBases(context, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const model = options.model || process.env.AI_BASES_MODEL || process.env.AI_DRAFT_MODEL || "gpt-5.6-luna";
  if (!apiKey) throw new Error("OPENAI_API_KEY no esta configurada para interpretar bases.");
  const input = publicBasesInput(context);
  const response = await (options.fetchFn || fetch)("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, store: false, max_output_tokens: Number(options.maxOutputTokens || process.env.AI_BASES_MAX_OUTPUT_TOKENS || 9000),
      reasoning: { effort: "medium" },
      input: [
        { role: "system", content: "Interpretas bases oficiales de subvenciones en espanol. Extraes clausulas trazables, no decides elegibilidad y no inventas datos." },
        { role: "user", content: JSON.stringify(input) }
      ],
      text: { format: { type: "json_schema", name: "interpretacion_bases", strict: true, schema: basesSchema } }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI respondio ${response.status}: ${payload.error?.message || "error sin detalle"}`);
  const text = outputText(payload);
  if (!text) throw new Error("OpenAI no devolvio una interpretacion estructurada.");
  const output = JSON.parse(text);
  const citationValidation = verifyBasesCitations(output, input.pages);
  const usage = { ...payload.usage, estimated_eur: estimateCostEur(payload.usage || {}, options) };
  if (!citationValidation.valid) {
    const error = new Error(`Citas invalidas: ${citationValidation.errors.join("; ")}`);
    error.usage = usage;
    error.responseId = payload.id;
    error.model = model;
    throw error;
  }
  return {
    output, model, responseId: payload.id, citationValidation,
    usage
  };
}
