import crypto from "node:crypto";

const months = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };

function dateFromSpanish(value) {
  const match = String(value || "").toLowerCase().match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(20\d{2})/i);
  const month = months[match?.[2]?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
  return match && Number.isInteger(month) ? new Date(Date.UTC(Number(match[3]), month, Number(match[1]), 23, 59, 59)) : null;
}

function periodFacts(period) {
  const range = String(period).toLowerCase().match(/del\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(20\d{2})/i);
  if (range) {
    const startMonth = months[range[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
    const endMonth = months[range[4].normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) return { opening: new Date(Date.UTC(Number(range[5]), startMonth, Number(range[1]), 0, 0, 0)), closing: new Date(Date.UTC(Number(range[5]), endMonth, Number(range[3]), 23, 59, 59)) };
  }
  const dates = [...String(period).matchAll(/\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+20\d{2}/gi)].map((match) => dateFromSpanish(match[0])).filter(Boolean);
  return { opening: dates[0] || null, closing: dates[dates.length - 1] || null };
}

function eligibleTitle(value) {
  return value && value.length > 12 && !/^(abiertas|pendientes|resueltas|cerradas|mantente informado)$/i.test(value);
}

export function extractPrivateCallCandidates(page, source) {
  const lines = String(page?.extracted_text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const results = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!/^del\s+\d{1,2}\s+de\s+/i.test(lines[index])) continue;
    const title = lines[index + 1];
    const facts = periodFacts(lines[index]);
    if (!eligibleTitle(title) || !facts.opening || !facts.closing || facts.opening > new Date() || facts.closing < new Date()) continue;
    const evidence = `${lines[index]}\n${title}`;
    results.push({
      id: crypto.createHash("sha256").update(`${source.id}|${title}|${lines[index]}`).digest("hex").slice(0, 16),
      title,
      deadline_text: lines[index],
      status_facts: { status: "Abierta", opening: facts.opening.toISOString().slice(0, 10), closing: facts.closing.toISOString().slice(0, 10) },
      source_url: page.url,
      evidence_excerpt: evidence
    });
  }
  return [...new Map(results.map((item) => [item.id, item])).values()];
}
