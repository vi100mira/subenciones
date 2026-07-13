import PDFDocument from "pdfkit";

export type PdfSection = { title: string; lines: string[] };
export type PdfLimit = { value?: number; unit?: string };
export type PdfFormatRule = { kind?: string; value?: string | number };

function fontName(rules: PdfFormatRule[]) {
  const family = String(rules.find((rule) => rule.kind === "font_family")?.value || "Helvetica").toLowerCase();
  return family.includes("times") ? "Times-Roman" : "Helvetica";
}

function fontSize(rules: PdfFormatRule[]) {
  const value = Number(rules.find((rule) => rule.kind === "font_size_points")?.value || 11);
  return value >= 8 && value <= 18 ? value : 11;
}

function lineGap(rules: PdfFormatRule[], size: number) {
  const raw = String(rules.find((rule) => rule.kind === "line_spacing")?.value || "1.15");
  const spacing = raw === "doble" ? 2 : raw === "sencillo" || raw === "simple" ? 1 : Number(raw);
  return Number.isFinite(spacing) ? Math.max(0, size * (spacing - 1)) : size * 0.15;
}

export async function renderProposalPdf(title: string, sections: PdfSection[], rules: PdfFormatRule[] = []) {
  const size = fontSize(rules);
  const gap = lineGap(rules, size);
  const document = new PDFDocument({ size: "A4", margins: { top: 50, right: 50, bottom: 50, left: 50 }, bufferPages: true, info: { Title: title } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const ended = new Promise<void>((resolve, reject) => { document.on("end", resolve); document.on("error", reject); });
  document.font(fontName(rules)).fontSize(Math.min(18, size + 5)).text(title, { align: "left" }).moveDown(0.8);
  for (const section of sections) {
    document.font(fontName(rules)).fontSize(Math.min(15, size + 2)).text(section.title).moveDown(0.35);
    document.font(fontName(rules)).fontSize(size);
    for (const line of section.lines) document.text(`• ${line}`, { indent: 12, lineGap: gap }).moveDown(0.25);
    document.moveDown(0.45);
  }
  const pageCount = document.bufferedPageRange().count;
  document.end();
  await ended;
  return { buffer: Buffer.concat(chunks), pageCount, font: fontName(rules), fontSize: size };
}

export function validateRenderedPages(pageCount: number, limits: PdfLimit[]) {
  const pageLimits = limits.filter((limit) => ["pages", "folios", "sides"].includes(limit.unit || "") && Number(limit.value) > 0);
  if (!pageLimits.length) return;
  const maximum = Math.min(...pageLimits.map((limit) => Number(limit.value)));
  if (pageCount > maximum) throw new Error(`Redaccion bloqueada: el PDF ocupa ${pageCount} paginas y el maximo oficial es ${maximum}.`);
}
