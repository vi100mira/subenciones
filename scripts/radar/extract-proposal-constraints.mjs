const NUMBER_WORDS = new Map([
  ["un", 1], ["una", 1], ["uno", 1], ["dos", 2], ["tres", 3], ["cuatro", 4],
  ["cinco", 5], ["seis", 6], ["siete", 7], ["ocho", 8], ["nueve", 9], ["diez", 10],
  ["once", 11], ["doce", 12], ["quince", 15], ["veinte", 20]
]);

const LIMIT_PATTERNS = [
  /(?:extension\s+maxima(?:\s+de)?|limite(?:\s+maximo)?(?:\s+de)?|maximo(?:\s+de)?|no\s+(?:podra\s+)?(?:exceder|superar)(?:a)?(?:\s+las?|\s+de)?|no\s+superior\s+a)\s+(?:(\d[\d.]*)|([a-z]+))(?:\s*\((\d+)\))?\s*(paginas?|folios?|caras?|palabras?|caracteres?)/g,
  /(\d[\d.]*)\s*(paginas?|folios?|caras?|palabras?|caracteres?)\s*(?:como\s+maximo|maximo)/g
];

function plain(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function numericValue(match, reverse = false) {
  if (reverse) return Number(match[1].replace(/\./g, ""));
  return Number(match[3] || match[1]?.replace(/\./g, "") || NUMBER_WORDS.get(match[2]));
}

function normalizedUnit(raw) {
  if (raw.startsWith("pagina")) return "pages";
  if (raw.startsWith("folio")) return "folios";
  if (raw.startsWith("cara")) return "sides";
  if (raw.startsWith("palabra")) return "words";
  return "characters";
}

function documentType(context) {
  if (/memoria/.test(context)) return "memoria_tecnica";
  if (/pitch|presentacion/.test(context)) return "presentacion";
  if (/formulario|solicitud/.test(context)) return "formulario";
  if (/anexo/.test(context)) return "anexo";
  if (/propuesta|proyecto|documento/.test(context)) return "propuesta_proyecto";
  return "documentacion_solicitud";
}

function excerpt(original, index, length) {
  return original.slice(Math.max(0, index - 180), Math.min(original.length, index + length + 220)).replace(/\s+/g, " ").trim();
}

function formatRules(context, evidence) {
  const rules = [];
  const font = context.match(/(?:fuente|tipo\s+de\s+letra|letra|en)\s*:?\s*(arial|times\s+new\s+roman|calibri|verdana)/i);
  const size = context.match(/(?:arial|times\s+new\s+roman|calibri|verdana)?\s*,?\s*(\d{1,2})\s*(?:puntos?|pt)\b/i);
  const spacing = context.match(/interlineado\s*:?\s*(sencillo|simple|doble|1[,.]5|\d(?:[,.]\d)?)/i);
  if (font) rules.push({ kind: "font_family", value: font[1], ...evidence });
  if (size) rules.push({ kind: "font_size_points", value: Number(size[1]), ...evidence });
  if (spacing) rules.push({ kind: "line_spacing", value: spacing[1].replace(",", "."), ...evidence });
  return rules;
}

export function extractProposalConstraints(text = "", options = {}) {
  const pages = options.pageEvidence?.length
    ? options.pageEvidence.map((page) => ({ page: page.page, text: page.text || "" }))
    : [{ page: null, text }];
  const limits = [];
  const formats = [];
  const seen = new Set();

  for (const page of pages) {
    const normalized = plain(page.text);
    LIMIT_PATTERNS.forEach((pattern, patternIndex) => {
      for (const match of normalized.matchAll(new RegExp(pattern.source, pattern.flags))) {
        const unitRaw = patternIndex === 1 ? match[2] : match[4];
        const value = numericValue(match, patternIndex === 1);
        if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) continue;
        const contextStart = Math.max(0, match.index - 220);
        const subjectContext = normalized.slice(contextStart, match.index + match[0].length);
        const context = normalized.slice(contextStart, match.index + match[0].length + 260);
        const type = documentType(subjectContext);
        const unit = normalizedUnit(unitRaw);
        const key = `${type}:${unit}:${value}:${page.page ?? "html"}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const evidence = {
          sourceUrl: options.sourceUrl || null,
          documentSha256: options.documentSha256 || null,
          sourcePage: page.page,
          evidenceExcerpt: excerpt(page.text, match.index, match[0].length),
          confidence: "high"
        };
        limits.push({ documentType: type, kind: "maximum", value, unit, ...evidence });
        formats.push(...formatRules(context, evidence));
      }
    });
  }

  return {
    status: limits.length ? "verified" : "not_found_requires_review",
    draftingGate: limits.length ? "constraints_verified" : "blocked_pending_constraint_review",
    requiresRenderedValidation: limits.some((item) => ["pages", "folios", "sides"].includes(item.unit)),
    requiresHumanReview: true,
    limits,
    formatRules: formats
  };
}

export function combineProposalConstraints(items = []) {
  const limits = items.flatMap((item) => item?.limits || []);
  const formatRules = items.flatMap((item) => item?.formatRules || []);
  return {
    status: limits.length ? "verified" : "not_found_requires_review",
    draftingGate: limits.length ? "constraints_verified" : "blocked_pending_constraint_review",
    requiresRenderedValidation: limits.some((item) => ["pages", "folios", "sides"].includes(item.unit)),
    requiresHumanReview: true,
    limits,
    formatRules
  };
}
