import fs from "node:fs";

const master = fs.readFileSync("scripts/private-corpus/build_master_draft.py", "utf8");
const layout = fs.readFileSync("scripts/private-corpus/master_docx.py", "utf8");
const skeleton = fs.readFileSync("scripts/private-corpus/fill_docx_skeleton.py", "utf8");
const inventory = fs.readFileSync("scripts/private-corpus/inventory_document_templates.py", "utf8");
const memoryPdf = fs.readFileSync("scripts/private-corpus/fill_diputacion_memory_pdf.py", "utf8");
const technicalMemory = fs.readFileSync("scripts/private-corpus/fill_technical_memory_pdf.py", "utf8");
const grantApplication = fs.readFileSync("scripts/private-corpus/fill_grant_application_pdf.py", "utf8");
const documentDeclaration = fs.readFileSync("scripts/private-corpus/fill_document_contribution_declaration_pdf.py", "utf8");
const gvaItinerary = fs.readFileSync("scripts/private-corpus/fill_gva_itinerary_form_pdf.py", "utf8");
const incomeDeclaration = fs.readFileSync("scripts/private-corpus/fill_other_income_declaration_pdf.py", "utf8");
const batch = fs.readFileSync("scripts/private-corpus/run_private_document_batch.py", "utf8");
const purge = fs.readFileSync("scripts/private-corpus/purge_private_document_run.py", "utf8");
const combined = `${master}\n${layout}\n${skeleton}\n${inventory}\n${memoryPdf}\n${technicalMemory}\n${grantApplication}\n${documentDeclaration}\n${gvaItinerary}\n${incomeDeclaration}\n${batch}\n${purge}`;

const checks = [
  [master.includes('parser.add_argument("--corpus"') && master.includes('parser.add_argument("--tenant"'), "el extractor no recibe corpus y tenant de forma explícita"],
  [master.includes('"processing": "local_only"') && master.includes('"external_ai_calls": 0'), "falta declarar procesamiento estrictamente local"],
  [master.includes('"cross_tenant_reuse": False'), "falta prohibir reutilización entre tenants"],
  [master.includes("privacy_blocked") && master.includes("PERSON_ID") && master.includes("IBAN"), "faltan filtros de datos personales"],
  [master.includes('"human_review_required": True'), "el perfil maestro no exige revisión humana"],
  [layout.includes("No presentar sin revisión humana") && layout.includes("propuesta sin aprobar"), "el DOCX maestro no hace visible la revisión pendiente"],
  [skeleton.includes('"blocked"') && skeleton.includes('"signature"') && skeleton.includes('"amounts"'), "el autocompletado no bloquea firma e importes"],
  [skeleton.includes("matches != 1"), "el adaptador podría completar coincidencias ambiguas"],
  [skeleton.includes("template_sha256") && skeleton.includes("output_sha256"), "falta trazabilidad criptográfica de entrada y salida"],
  [inventory.includes('"content_copied_to_report": False') && inventory.includes('"cross_tenant_reuse": False'), "el inventario podría copiar contenido o cruzar tenants"],
  [inventory.includes('"blocked_sensitive"') && inventory.includes('"map_before_prefill"'), "el inventario no separa plantillas sensibles y mapeables"],
  [inventory.includes('"source_sha256"') && inventory.includes('"human_review_required": True'), "el inventario carece de trazabilidad o revisión humana"],
  [inventory.includes("refine_candidates") && inventory.includes('"reference_only_filled"'), "el inventario confunde formularios cumplimentados con esqueletos"],
  [inventory.includes('"duplicate_reference"') && inventory.includes("seen_hashes"), "el inventario cuenta duplicados como plantillas distintas"],
  [memoryPdf.includes("field_map") && memoryPdf.includes("len(reader.get_fields() or {}) != 71"), "el adaptador PDF no valida la versión exacta del formulario"],
  [memoryPdf.includes('"ready_to_present_percentage": 0') && memoryPdf.includes('"external_submission_allowed": False'), "el PDF propuesto podría confundirse con un documento presentable"],
  [memoryPdf.includes('"objectives_and_targets"') && memoryPdf.includes('"detailed_budget"'), "el PDF no bloquea objetivos o presupuesto específicos"],
  [technicalMemory.includes('"personal_values_reused": False') && technicalMemory.includes('"representatives"') && technicalMemory.includes('"signatures"'), "la memoria técnica reutiliza datos personales bloqueados"],
  [technicalMemory.includes('"reference_sha256"') && technicalMemory.includes('"reference_document_id"'), "la memoria técnica no conserva la procedencia histórica"],
  [grantApplication.includes('"personal_values_reused": False') && grantApplication.includes('"bank_account"') && grantApplication.includes('"representative_identity"'), "la solicitud reutiliza datos personales o bancarios bloqueados"],
  [grantApplication.includes('"reference_sha256"') && grantApplication.includes('"external_submission_allowed": False'), "la solicitud carece de procedencia o podría presentarse automáticamente"],
  [documentDeclaration.includes('"personal_values_reused": False') && documentDeclaration.includes('"representative_identity"') && documentDeclaration.includes('"document_declarations"'), "la declaración reutiliza identidad o decisiones declarativas"],
  [documentDeclaration.includes('"reference_sha256"') && documentDeclaration.includes('"signature"') && documentDeclaration.includes('"external_submission_allowed": False'), "la declaración carece de procedencia o podría firmarse/presentarse automáticamente"],
  [gvaItinerary.includes('"personal_values_reused": False') && gvaItinerary.includes('"safe_master_coverage_percentage": 100'), "el Anexo GVA no limita el relleno a hechos maestros seguros"],
  [gvaItinerary.includes('"budget"') && gvaItinerary.includes('"representative"') && gvaItinerary.includes('"signature"'), "el Anexo GVA no bloquea presupuesto, representante o firma"],
  [incomeDeclaration.includes('"safe_master_coverage_percentage": 100') && incomeDeclaration.includes('"personal_values_reused": False'), "la declaración de ingresos no limita el relleno a hechos maestros"],
  [incomeDeclaration.includes('"project_total"') && incomeDeclaration.includes('"other_income_decision"') && incomeDeclaration.includes('"signature"'), "la declaración de ingresos no bloquea importes, decisión o firma"],
  [skeleton.includes('parser.add_argument("--tenant"') && skeleton.includes("allow-proposed-drafts"), "el adaptador DOCX no valida tenant o propuestas"],
  [batch.includes("output_root.is_relative_to(corpus)") && batch.includes("source.is_relative_to(corpus)"), "el lote no protege corpus y rutas de origen"],
  [batch.includes('"private_values_copied_to_manifest": False') && batch.includes('"external_submission_allowed": False'), "el manifiesto de lote expone valores o permite presentar"],
  [batch.includes("authorized_payload") && batch.includes('"persistent_authorized"'), "el lote no consume el contexto persistente autorizado"],
  [batch.includes("context_sha256") && batch.includes("expires_at <= datetime.now"), "el lote no valida integridad o caducidad del contexto"],
  [batch.includes('authorization.get("personal_data_allowed") is False') && batch.includes('authorization.get("sensitive_data_allowed") is False'), "el lote admite un contexto privado demasiado amplio"],
  [batch.includes('"blocked_sensitive", "manual_only"') && batch.includes('"mapping_pending"'), "el lote no conserva los bloqueos de privacidad y mapeo"],
  [purge.includes("not run.is_relative_to(root)") && purge.includes("any(path.is_symlink()"), "el borrado local no limita rutas o enlaces"],
  [purge.includes("confirm-delete") && purge.includes('"content_copied_to_receipt": False'), "el borrado no exige confirmación o copia contenido al recibo"],
  [!/(?:requests|httpx|openai|anthropic|urllib\.request|fetch\s*\()/i.test(combined), "el flujo privado contiene un cliente o llamada de red"],
  [!combined.includes("Desktop\\PROYECTOS") && !combined.includes("novaterra\\proof"), "el código contiene una ruta privada o un tenant piloto"],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  processing: "local_only",
  externalAiCalls: 0,
  tenantIsolation: true,
  humanReviewRequired: true,
  blockedFields: ["representative", "amounts", "date", "signature"]
}, null, 2));
