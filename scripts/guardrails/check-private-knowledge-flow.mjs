import fs from "node:fs";

const files = {
  governance: fs.readFileSync("api/tenant-agent-governance.ts", "utf8"),
  sources: fs.readFileSync("api/source-connections.ts", "utf8"),
  ingestion: fs.readFileSync("api/ingestion-dispatch.ts", "utf8"),
  preflight: fs.readFileSync("api/private-source-preflight.ts", "utf8"),
  preflightPolicy: fs.readFileSync("src/privateSourcePreflight.ts", "utf8"),
  preflightUi: fs.readFileSync("prototype/private-source-preflight.js", "utf8"),
  profileReview: fs.readFileSync("api/tenant-profile-review.ts", "utf8"),
  documentCandidates: fs.readFileSync("api/private-document-candidates.ts", "utf8"),
  annexFile: fs.readFileSync("api/private-annex-file.ts", "utf8"),
  annexViewer: fs.readFileSync("prototype/private-annex-viewer.js", "utf8"),
  documentContext: fs.readFileSync("api/private-document-context.ts", "utf8"),
  apiResponse: fs.readFileSync("src/apiResponse.ts", "utf8"),
  ui: fs.readFileSync("prototype/private-knowledge.js", "utf8"),
  planUi: fs.readFileSync("prototype/tenant-plan.js", "utf8"),
  agentUi: fs.readFileSync("prototype/tenant-agent-runtime.js", "utf8"),
  masterUi: fs.readFileSync("prototype/master-fact-review.js", "utf8"),
  requirements: fs.readFileSync("prototype/opportunity-requirements.js", "utf8"),
  index: fs.readFileSync("prototype/index.html", "utf8")
};

const checks = [
  [files.governance.includes('"manual_upload", "drive_connection", "sharepoint_connection"'), "faltan consentimientos privados"],
  [files.governance.includes('action === "approve_private_source"'), "falta aprobación separada de la fuente"],
  [files.governance.includes('.eq("scope", "tenant_private")') && files.governance.includes("ya no está pendiente de aprobación"), "la aprobación admite fuentes internas que no son repositorios privados o vuelve a ocultar la ausencia"],
  [files.sources.includes("tenant_id") && files.sources.includes("actor.tenantId"), "la fuente no queda acotada por tenant"],
  [/token\|secret\|password\|credential\|path/i.test(files.sources), "no se bloquean secretos o rutas en config_json"],
  [files.ui.includes("Privacidad y control") && files.ui.includes("no mezcla tenants"), "faltan límites visibles en la elección del método"],
  [files.planUi.includes("Curador de conocimiento") && files.planUi.includes("Redactor documental"), "el modal informativo no explica las dos capacidades"],
  [files.planUi.includes("Conocimiento progresivo del tenant") && files.planUi.includes("No entrena un modelo compartido"), "la información del plan no distingue memoria privada de entrenamiento"],
  [files.ui.includes('name="preparation-route"') && files.ui.includes('value="projects"') && files.ui.includes('value="guided"'), "faltan las dos vías excluyentes de preparación"],
  [files.ui.includes('find((item) => item.scope === "tenant_private")') && !files.ui.includes("privateSources?.[0]"), "una entrevista interna puede confundirse con un repositorio de proyectos"],
  [files.ui.includes("hasCompatibleConsent") && files.ui.includes("data-private-consent-renewal") && files.ui.includes("Renovar permiso y continuar"), "una fuente con consentimiento revocado no ofrece renovación explícita"],
  [files.ui.includes("webkitdirectory") && files.ui.includes("localSelectionMatches") && files.ui.includes("data-local-folder-form"), "la fuente local puede encolarse sin seleccionar una carpeta"],
  [files.preflight.includes("assessPrivateSourceManifest") && files.preflight.includes("private_source.preflight_"), "el preanálisis privado no está centralizado o auditado"],
  [files.preflightPolicy.includes("storedPrivatePreflightCanQueue") && files.ingestion.includes("storedPrivatePreflightCanQueue(source.config_json)"), "el backend permite encolar una fuente sin criba"],
  [files.governance.includes("storedPrivatePreflightCanQueue(source.config_json)") && files.governance.includes("antes de aprobarse"), "la gobernanza permite aprobar una fuente sin criba"],
  [files.preflightUi.includes("supportedBytes") && files.preflightUi.includes('"ready_limited" : "review"') && files.ui.includes("accept-limited"), "la UI no bloquea o advierte una fuente insustancial"],
  [files.index.includes("private-source-preflight.js") && files.index.indexOf("private-source-preflight.js") < files.index.indexOf("private-knowledge.js"), "la política de preanálisis no se carga antes del flujo privado"],
  [files.ui.includes("La ruta completa no se guarda ni se envía a la API") && files.ui.includes("Esta selección se pierde al recargar"), "el selector local no explica sus límites de privacidad"],
  [files.ui.includes("Fuente aprobada. Iniciando inventario privado") && files.ui.includes("La fuente está aprobada, pero no se pudo iniciar"), "aprobación e inventario no comunican sus estados por separado"],
  [files.ui.includes('document.querySelector("#private-knowledge-panel")?.remove()'), "Entidad conserva el panel operativo privado"],
  [files.index.includes('data-screen="knowledge"') && files.index.includes('id="common-knowledge-library"'), "la base común no tiene una pantalla propia"],
  [files.ui.includes("Biblioteca común para todas las candidaturas") && files.ui.includes("Datos reutilizables"), "la pantalla no explica el corpus común y su reutilización"],
  [files.ui.includes("Documentos propuestos por el inventario") && files.ui.includes("data-annex-open") && files.annexViewer.includes("data-document-candidate-review"), "la base común no permite abrir y revisar documentos propuestos"],
  [files.documentCandidates.includes('.eq("tenant_id", actor.tenantId)') && files.documentCandidates.includes('"private_document_candidates.reviewed"'), "la revisión documental no está aislada o auditada"],
  [files.documentCandidates.includes("document_content_copied: false") && files.documentCandidates.includes('review_status: status'), "la aprobación copia contenido o no conserva su decisión"],
  [files.documentCandidates.includes('"restricted"') && files.annexViewer.includes("Aprobar como restringido"), "los anexos personales no tienen aprobación restringida"],
  [files.annexFile.includes('access: "private"') && files.annexFile.includes("annex-vault") && !files.annexFile.includes('access: "public"'), "el archivo de anexos no usa Blob privado"],
  [files.annexFile.includes("sha256 !== document.source_sha256") && files.annexFile.includes("x-annex-restricted-confirmed"), "la carga no verifica integridad o confirmación restringida"],
  [files.annexFile.includes("ai_allowed: false") && files.annexFile.includes("embeddings_allowed: false"), "el anexo restringido puede llegar a IA o embeddings"],
  [files.annexFile.includes('"private_annex.stored"') && files.annexFile.includes('"private_annex.downloaded"'), "el ciclo del anexo no queda auditado"],
  [files.annexViewer.includes("data-annex-file") && files.annexViewer.includes("data-annex-download"), "la Base común no carga o descarga anexos completos"],
  [files.annexFile.includes('"private_annex.previewed"') && files.annexFile.includes("X-Content-Type-Options"), "la vista privada no queda auditada o evita el sniffing"],
  [files.annexViewer.includes("crypto.subtle.digest") && files.annexViewer.includes("data-annex-viewer-watermark"), "la vista local no verifica la huella o no marca al usuario"],
  [files.annexViewer.includes("x-annex-restricted-confirmed") && files.annexViewer.includes("No se enviará a IA"), "el visor restringido no exige confirmación explícita"],
  [files.annexViewer.includes("annex-viewer-workspace") && files.annexViewer.includes("annex-viewer-sidebar"), "el documento no se abre en un visor integrado con área visual y control lateral"],
  [files.planUi.includes("data-plan-area-info") && files.planUi.includes("data-plan-open-preparation"), "las áreas del plan no ofrecen información modal o acceso a Asistentes"],
  [files.agentUi.includes("PrivateKnowledge?.openPreparation?.()"), "el agente sigue abriendo Candidatura directamente"],
  [files.ingestion.includes('requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent")'), "la ingesta privada no exige agente contratado"],
  [files.ui.includes('save({ phase: "inventory", ingestionQueued: true })'), "la ingesta avanza antes de devolver resultados"],
  [!files.ui.includes("localStorage"), "la UI persiste estado privado fuera de la sesión"],
  [files.masterUi.includes("/api/tenant-profile-review") && files.masterUi.includes('method: "PATCH"') && files.masterUi.includes('"?scope=private"'), "la revisión maestra sigue siendo simulada o mezcla sugerencias públicas"],
  [files.masterUi.includes("evidence_excerpt") && files.masterUi.includes("Valores en conflicto"), "la revisión no muestra evidencia o conflictos"],
  [files.profileReview.includes('req.method === "POST"') && files.profileReview.includes("guided_proposals_created"), "el formulario guiado no persiste propuestas reales"],
  [files.profileReview.includes("noPersonalData") && files.profileReview.includes('allowed_uses: ["matching", "drafting", "forms"]'), "las propuestas guiadas no declaran privacidad o usos"],
  [files.ui.includes("data-private-guided-form") && files.ui.includes('request("/api/tenant-profile-review"'), "la UI guiada sigue siendo simulada"],
  [files.ui.includes("data-private-document-context") && files.ui.includes("/api/private-document-context?sourceId="), "la app no entrega el contexto al ejecutor local"],
  [files.ui.includes("Caduca en 15 minutos") && files.ui.includes("no contiene el corpus"), "la descarga no explica caducidad o límites"],
  [!files.ui.includes("data-private-approve-master") && !files.ui.includes("aprobada en esta demostración"), "permanece una aprobación ficticia en sessionStorage"],
  [files.profileReview.includes('.eq("tenant_id", actor.tenantId)') && files.profileReview.includes('"entity_profile.master_approved"'), "la aprobación maestra no está aislada o auditada"],
  [files.profileReview.includes("master_fact_refs") && files.profileReview.includes("Quedan ${unresolved.length}"), "faltan referencias aprobadas o bloqueo de pendientes"],
  [files.documentContext.includes('.eq("tenant_id", actor.tenantId)') && files.documentContext.includes('.eq("status", "approved")'), "el contexto documental no limita tenant o hechos aprobados"],
  [files.documentContext.includes('scope.readOnly !== true') && files.documentContext.includes('scope.includeSensitiveData !== false'), "el contexto documental no revalida el alcance privado"],
  [files.documentContext.includes('profile.review_state !== "approved"') && files.documentContext.includes("Conflicto en el hecho aprobado"), "el contexto documental admite plantillas sin aprobar o conflictos"],
  [files.documentContext.includes('action: "private_document.context_issued"') && files.documentContext.includes("context_sha256"), "la emisión de contexto no queda auditada por hash"],
  [files.requirements.includes("data-private-knowledge-open"), "el esqueleto no conduce al flujo privado"],
  [files.requirements.includes("Este borrador no es la base común") && files.requirements.includes("Ir a Base común"), "el visor confunde el borrador con el corpus común"],
  [files.index.includes("master-fact-review.js") && files.index.includes("private-knowledge.js"), "los módulos de conocimiento privado no están cargados"],
  [files.apiResponse.includes("export function errorMessage") && files.governance.includes("errorMessage(error)"), "los errores operativos de Supabase siguen convertidos en Error inesperado"]
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  flow: ["consent", "source_approval", "inventory", "human_review", "master_facts"],
  tenantIsolation: true,
  privateContentPersistedInBrowser: false
}, null, 2));
