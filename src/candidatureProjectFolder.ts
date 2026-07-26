import { createHash } from "node:crypto";
import { draftContentHash } from "./draftDocumentVersion.js";
import type { DraftDocumentPlanItem, GeneratedDraftDocument } from "./candidatureDocx.js";

export type ProjectFolderFile = {
  id: string;
  kind: "generated" | "tenant" | "official";
  title: string;
  mimeType: string;
  dataClass: string;
  originLabel: string;
  status: "pending" | "in_progress" | "reviewed_for_work" | "final_approved" | "unavailable_local";
  available: boolean;
  version: number | null;
  updatedAt: string | null;
  sha256: string | null;
  documentId?: string;
  sourceConnectionId?: string;
};

export type ProjectFolderCheck = {
  id: string;
  title: string;
  requirementRefs: string[];
  evidenceRefs: string[];
  missingInputs: string[];
  status: ProjectFolderFile["status"];
  files: ProjectFolderFile[];
};

type Selection = {
  id: string;
  selection_status: "proposed" | "confirmed" | "excluded";
  updated_at?: string;
  evidence_json?: string[];
  document?: { id: string; title: string; mime_type: string; data_class: string; source_connection_id: string; source_sha256: string; stored: boolean } | null;
};

type WorkingExport = { scope: "document" | "check" | "all"; scope_ref: string; snapshot_hash: string };

type FolderInput = {
  recommendationId: string;
  canonicalKey: string;
  run: { id: string; output_json: any; created_at?: string; updated_at?: string } | null;
  review: { status?: string } | null;
  draftVersion: { id: string; version_number: number; content_json: any; created_at?: string } | null;
  selections: Selection[];
  workingExports: WorkingExport[];
};

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function checkId(item: DraftDocumentPlanItem, index: number) {
  return `check-${digest([item.title, item.requirementRefs, index]).slice(0, 12)}`;
}

export function currentFolderContent(input: Pick<FolderInput, "run" | "draftVersion">) {
  return input.draftVersion?.content_json || input.run?.output_json || null;
}

export function buildProjectFolder(input: FolderInput) {
  const content = currentFolderContent(input);
  const documents = (Array.isArray(content?.documents) ? content.documents : []) as GeneratedDraftDocument[];
  const plan = (Array.isArray(content?.documentPlan) ? content.documentPlan : []) as DraftDocumentPlanItem[];
  const documentByRef = new Map(documents.map((document) => [document.documentRef, document]));
  const hasGranularConsolidation = documents.some((document: any) => document.consolidation?.status === "consolidated");
  const consolidated = (document: any) => document?.consolidation?.status === "consolidated"
    || (!hasGranularConsolidation && input.review?.status === "approved");
  const activeSelections = input.selections.filter((selection) => selection.selection_status !== "excluded" && selection.document);
  const assignedSelections = new Set<string>();
  const draftHash = content ? draftContentHash(content) : "none";
  const snapshotHash = digest({ draftHash, selections: activeSelections.map((selection) => [selection.id, selection.selection_status, selection.document?.source_sha256]) });
  const reviewed = (scope: WorkingExport["scope"], scopeRef: string) => input.workingExports.some((item) =>
    item.snapshot_hash === snapshotHash && ((item.scope === scope && item.scope_ref === scopeRef) || item.scope === "all"));
  const generatedStatus = (document: any, scope: WorkingExport["scope"], scopeRef: string): ProjectFolderFile["status"] =>
    consolidated(document) ? "final_approved" : reviewed(scope, scopeRef) ? "reviewed_for_work" : "in_progress";
  const tenantFile = (selection: Selection): ProjectFolderFile => {
    const document = selection.document!;
    const available = Boolean(document.stored);
    const status: ProjectFolderFile["status"] = selection.selection_status === "proposed" ? "pending"
      : !available ? "unavailable_local" : reviewed("document", selection.id) ? "reviewed_for_work" : "in_progress";
    return { id: selection.id, kind: "tenant", title: document.title, mimeType: document.mime_type, dataClass: document.data_class,
      originLabel: selection.selection_status === "proposed" ? "Propuesto por el asistente" : "Confirmado desde Base común",
      status, available, version: null, updatedAt: selection.updated_at || null, sha256: document.source_sha256,
      documentId: document.id, sourceConnectionId: document.source_connection_id };
  };

  const checks: ProjectFolderCheck[] = plan.map((item, index) => {
    const id = checkId(item, index);
    const files: ProjectFolderFile[] = item.draftDocumentRefs.map((reference) => documentByRef.get(reference)).filter(Boolean).map((document) => ({
      id: document!.documentRef, kind: "generated" as const, title: document!.title,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", dataClass: "internal",
      originLabel: "Generado para esta candidatura", status: generatedStatus(document, "document", document!.documentRef), available: true,
      version: input.draftVersion?.version_number || 1, updatedAt: input.draftVersion?.created_at || input.run?.updated_at || input.run?.created_at || null,
      sha256: digest(document)
    }));
    for (const selection of activeSelections) {
      if (assignedSelections.has(selection.id) || !item.requirementRefs.some((reference) => selection.evidence_json?.includes(reference))) continue;
      assignedSelections.add(selection.id); files.push(tenantFile(selection));
    }
    if (!files.length && item.preparation === "official_template_required") files.push({
      id: `official-${id}`, kind: "official", title: item.title, mimeType: "application/octet-stream", dataClass: "public",
      originLabel: "Plantilla oficial pendiente", status: "pending", available: false, version: null, updatedAt: null, sha256: null
    });
    const available = files.filter((file) => file.available);
    const generated = files.filter((file) => file.kind === "generated");
    const status: ProjectFolderCheck["status"] = generated.length && generated.every((file) => file.status === "final_approved") && !item.missingInputs.length
      ? "final_approved" : reviewed("check", id) ? "reviewed_for_work"
        : !files.length || item.missingInputs.length ? "pending" : "in_progress";
    return { id, title: item.title, requirementRefs: item.requirementRefs, evidenceRefs: item.evidenceRefs, missingInputs: item.missingInputs, status, files };
  });

  const unmatchedSelections = activeSelections.filter((selection) => !assignedSelections.has(selection.id));
  if (unmatchedSelections.length) {
    const id = "tenant-evidence";
    const files: ProjectFolderFile[] = unmatchedSelections.map(tenantFile);
    const available = files.filter((file) => file.available);
    checks.push({ id, title: "Evidencia adicional de la entidad", requirementRefs: [], evidenceRefs: [],
      missingInputs: files.filter((file) => !file.available).map((file) => `${file.title}: original no archivado`),
      status: reviewed("check", id) ? "reviewed_for_work" : available.length ? "in_progress" : "unavailable_local", files });
  }

  if (!checks.length) checks.push({ id: "project-start", title: "Preparar el paquete documental", requirementRefs: [], evidenceRefs: [],
    missingInputs: ["Genera o incorpora el primer fichero desde Documentos"], status: "pending", files: [] });

  const totalFiles = checks.reduce((sum, check) => sum + check.files.length, 0);
  const availableFiles = checks.flatMap((check) => check.files).filter((file) => file.available).length;
  const consolidatedFiles = checks.flatMap((check) => check.files).filter((file) => file.status === "final_approved").length;
  const completedChecks = checks.filter((check) => ["final_approved", "reviewed_for_work"].includes(check.status)).length;
  return {
    recommendationId: input.recommendationId, canonicalKey: input.canonicalKey, snapshotHash,
    runId: input.run?.id || null, draftVersionId: input.draftVersion?.id || null,
    versionLabel: input.draftVersion ? `Versión humana ${input.draftVersion.version_number}` : input.run ? "Versión generada 1" : "Sin versión generada",
    updatedAt: input.draftVersion?.created_at || input.run?.updated_at || input.run?.created_at || null,
    checks, summary: { totalChecks: checks.length, completedChecks,
      reviewChecks: checks.filter((check) => check.status === "in_progress").length,
      pendingChecks: checks.length - completedChecks - checks.filter((check) => check.status === "in_progress").length,
      totalFiles, availableFiles, consolidatedFiles },
    policy: { workingCopyReviewRequired: true, submissionAllowed: false }
  };
}
