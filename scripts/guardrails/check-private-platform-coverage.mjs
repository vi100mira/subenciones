import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("prototype/platform-runtime.js", "utf8");
const dashboard = fs.readFileSync("prototype/dashboard-renderer.js", "utf8");
const markup = fs.readFileSync("prototype/index.html", "utf8");
const api = fs.readFileSync("api/admin-platform-opportunities.ts", "utf8");

assert(markup.includes('id="private-coverage"') && markup.includes("Solo superadmin"), "La cobertura privada no tiene un contenedor exclusivo de superadmin");
assert(dashboard.includes("privateCoveragePanel.hidden = !isPlatform"), "La cobertura privada puede filtrarse a tenants");
assert(runtime.includes("Fuentes privadas y oportunidades") && runtime.includes("0 oportunidades verificadas") && runtime.includes("Fuentes privadas verificadas") && runtime.includes("Oportunidades privadas verificadas") && runtime.includes("Excepciones técnicas pendientes"), "La cobertura privada no separa fuente, seguimiento, oportunidades y excepciones técnicas");
assert(api.includes("Privada en monitorización") && api.includes("Privada verificada / inventario global"), "La API no diferencia un programa monitorizado de una oportunidad privada verificada");
assert(runtime.includes("Sin datos privados disponibles") && runtime.includes("privateCandidatesState !== \"available\""), "La cobertura privada no declara la ausencia de migración o datos");
assert(runtime.includes("superadministrador supervisa") && api.includes("platform_superadmin_only"), "La cobertura privada pierde el límite de visibilidad o recomendación");
console.log(JSON.stringify({ ok: true, visibility: "platform_superadmin_only", states: 4 }));
