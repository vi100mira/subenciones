import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = path.join(root, "supabase", "bootstrap", "empty-project-bootstrap.manifest.json");
const migrationsRoot = path.join(root, "supabase", "migrations");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const included = manifest.segments.flatMap((segment) => segment.files);
const excluded = manifest.excludedMigrations.map((item) => item.file);
const allFiles = fs.readdirSync(migrationsRoot).filter((file) => file.endsWith(".sql")).sort();
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(included.length > 0, "El manifiesto no incluye migraciones.");
expect([...included].every((file, index) => index === 0 || file > included[index - 1]), "Las migraciones no están ordenadas cronológicamente.");
expect(new Set(included).size === included.length, "Hay migraciones duplicadas en el manifiesto.");
expect(excluded.includes("20260626132000_novaterra_demo_seed.sql"), "El seed demo de Novaterra debe permanecer excluido.");
expect(excluded.includes("20260715210000_tenant_commercial_plan_seed.sql"), "La actualización demo de Novaterra debe permanecer excluida.");

for (const file of included) expect(allFiles.includes(file), `No existe la migración incluida ${file}.`);
for (const item of allFiles) expect(included.includes(item) || excluded.includes(item), `La migración ${item} no está clasificada.`);

for (const required of [
  "20260624190000_sources_rag_foundation.sql",
  "20260624191000_sources_rag_rls.sql",
  "20260624201000_platform_sources.sql",
  "20260629183000_opportunity_versions_alerts.sql",
  "20260729193000_platform_private_source_candidates.sql",
  "20260730130000_catalog_lifecycle_governance.sql"
]) expect(included.includes(required), `Falta la dependencia crítica ${required}.`);

const privateIndex = included.indexOf("20260729193000_platform_private_source_candidates.sql");
const lifecycleIndex = included.indexOf("20260730130000_catalog_lifecycle_governance.sql");
expect(privateIndex >= 0 && lifecycleIndex > privateIndex, "Lifecycle debe ir después de candidatas privadas.");
expect(included.indexOf("20260624201000_platform_sources.sql") < included.indexOf("20260629183000_opportunity_versions_alerts.sql"), "Oportunidades requiere platform_sources antes.");
expect(included.indexOf("20260624191000_sources_rag_rls.sql") < included.indexOf("20260629183000_opportunity_versions_alerts.sql"), "Las políticas de oportunidades requieren is_org_member antes.");

if (failures.length) {
  console.error("Bootstrap vacío inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Bootstrap vacío válido: ${included.length} migraciones, ${excluded.length} exclusión demo y sin ejecución remota.`);
