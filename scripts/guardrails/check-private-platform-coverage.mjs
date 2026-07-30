import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("prototype/platform-runtime.js", "utf8");
const dashboard = fs.readFileSync("prototype/dashboard-renderer.js", "utf8");
const markup = fs.readFileSync("prototype/index.html", "utf8");
const api = fs.readFileSync("api/admin-platform-opportunities.ts", "utf8");

assert(markup.includes('id="private-coverage"') && markup.includes("Solo superadmin"), "La cobertura privada no tiene un contenedor exclusivo de superadmin");
assert(dashboard.includes("privateCoveragePanel.hidden = !isPlatform"), "La cobertura privada puede filtrarse a tenants");
assert(runtime.includes("Fuentes privadas verificadas") && runtime.includes("Candidatas privadas tracked / pendientes") && runtime.includes("Fuentes/candidatas privadas publicables") && runtime.includes("Oportunidades privadas indexadas"), "La cobertura privada no separa estados técnicos");
assert(runtime.includes("Sin datos privados disponibles") && runtime.includes("privateCandidatesState !== \"available\""), "La cobertura privada no declara la ausencia de migración o datos");
assert(runtime.includes("nunca una recomendación automática a clientes") && api.includes("platform_superadmin_only"), "La cobertura privada pierde el límite de visibilidad o recomendación");
console.log(JSON.stringify({ ok: true, visibility: "platform_superadmin_only", states: 4 }));
