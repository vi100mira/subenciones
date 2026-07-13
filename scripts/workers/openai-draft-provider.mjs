const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_MAX_OUTPUT_TOKENS = 6000;

export const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections", "evidenceRefs", "uncertainties", "humanReviewRequired", "submissionAllowed"],
  properties: {
    title: { type: "string" },
    sections: {
      type: "array", minItems: 1, maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "paragraphs", "evidenceRefs"],
        properties: {
          title: { type: "string" },
          paragraphs: { type: "array", minItems: 1, items: { type: "string" } },
          evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } }
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

export function publicDraftInput(context) {
  return {
    dataClass: "public",
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
      submissionChannel: limited(context.submissionChannelText, 4000),
      proposalConstraints: context.constraints
    },
    instructions: [
      "Redacta en español exclusivamente con la evidencia pública incluida.",
      "No inventes experiencia, cifras, personas, resultados ni datos de la entidad solicitante.",
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
