(function () {
  let lastRunSignature;
  let lastRecommendationSignature;
  let blockedSessionSignature = "";

  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "entity" && value?.tenantId ? value : null;
  }

  async function matchState() {
    const current = session();
    if (!current) return { recommendations: [], latestRun: null, reviewSummary: null };
    const response = await fetch("/api/tenant-match-runs", {
      headers: { "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const message = response.status === 401
        ? "La sesion ha caducado. Sal y vuelve a acceder para recuperar el encaje."
        : payload?.error || `Error HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload.data || { recommendations: [], latestRun: null, reviewSummary: null };
  }

  function localRows() {
    return [...new Map([
      ...(window.RADAR_PLATFORM_OPPORTUNITIES || window.RADAR?.opportunities || []),
      ...(window.MUNICIPAL_RADAR?.opportunities || []),
      ...(window.PRIVATE_OPEN_OPPORTUNITIES || []),
      ...(window.MOCK?.opportunities || [])
    ].map((item) => [String(item.id), item])).values()];
  }

  function reasonText(recommendation) {
    return (recommendation.reasons_json || []).map((reason) => reason.text).filter(Boolean).slice(0, 2).join(" ")
      || (recommendation.risks_json || []).map((risk) => risk.text).filter(Boolean)[0]
      || "Pendiente de revisión humana.";
  }

  function syncPendingRow(recommendation, opportunity, version) {
    let source = "Fuente oficial pendiente de conciliar";
    try { source = new URL(version?.official_url || version?.source_url).hostname; } catch { /* La URL se mostrara como no disponible. */ }
    return {
      id: `sync-${recommendation.id}`,
      title: opportunity?.title || "Convocatoria pendiente de identificar",
      organism: opportunity?.funder_name || source,
      source,
      sourceScope: "Publica oficial",
      sourceId: opportunity?.canonical_key || recommendation.id,
      score: Number(recommendation.score || 0),
      deadline: version?.deadline_text || "Plazo pendiente de comprobar",
      deadlineStatus: version?.deadline_status || "uncertain",
      deadlineConfidence: version?.deadline_confidence || "Baja",
      theme: "Incidencia de sincronizacion",
      territory: opportunity?.territory || "Territorio por comprobar",
      officialUrl: version?.official_url || version?.source_url || "",
      actionable: false,
      entityFit: { status: "sync_pending", reason: "No se ha encontrado una correspondencia unica en el corpus actual." },
      matchRecommendation: recommendation,
      syncIssue: { recommendationId: recommendation.id, canonicalKey: opportunity?.canonical_key || "", versionId: version?.id || "" }
    };
  }

  function apply(items) {
    if (!items.length || !window.RADAR) return false;
    if (!window.RADAR_PLATFORM_OPPORTUNITIES) window.RADAR_PLATFORM_OPPORTUNITIES = [...(window.RADAR.opportunities || [])];
    const rows = localRows();
    const reconciliation = window.RecommendationReconciliation?.createIndex(rows);
    const syncPending = [];
    let reconciledByUrl = 0;
    const annotated = items.map((recommendation) => {
      const resolved = window.RecommendationReconciliation?.resolve(recommendation, reconciliation || { byCanonical: new Map(), byUrl: new Map() });
      const opportunity = resolved?.opportunity;
      const version = resolved?.version;
      const local = resolved?.row;
      if (!local) {
        syncPending.push(syncPendingRow(recommendation, opportunity, version));
        return null;
      }
      if (resolved.method === "official_url") reconciledByUrl += 1;
      const approvedBases = recommendation.bases_interpretation;
      const candidate = recommendation.decision_status === "preselected" || (recommendation.recommendation_status !== "low_fit" && recommendation.decision_status !== "dismissed");
      return {
        ...local,
        proposalConstraints: approvedBases?.proposalConstraints?.draftingGate === "constraints_verified" ? approvedBases.proposalConstraints : version?.evidence_json?.proposal_constraints || local.proposalConstraints,
        requirementsContract: approvedBases?.requirementsContract || version?.evidence_json?.requirements_contract || local.requirementsContract || null,
        basesInterpretation: approvedBases || null,
        officialRequirements: {
          eligibility: version?.eligibility_text || "",
          criteria: version?.criteria_text || "",
          requiredDocuments: version?.required_documents_text || "",
          submissionChannel: version?.submission_channel_text || ""
        },
        score: recommendation.score,
        entityFit: { status: candidate ? "candidate" : "discarded", reason: recommendation.decision_reason ? `Decisión humana: ${recommendation.decision_reason}.` : reasonText(recommendation) },
        matchRecommendation: recommendation
      };
    }).filter(Boolean);
    const active = annotated.filter((item) => item.entityFit.status === "candidate" && item.deadlineStatus !== "closed");
    const discarded = annotated.filter((item) => item.entityFit.status === "discarded" && item.deadlineStatus !== "closed");
    const archived = annotated.filter((item) => item.deadlineStatus === "closed").map((item) => ({ ...item, entityFit: { status: "archived", reason: "Versión archivada por plazo cerrado." } }));
    const lowFit = discarded.filter((item) => item.matchRecommendation.decision_status !== "dismissed" && item.matchRecommendation.recommendation_status === "low_fit");
    const humanDismissed = discarded.filter((item) => item.matchRecommendation.decision_status === "dismissed");
    const current = session();
    window.RADAR_ENTITY_CONTEXT = { name: current?.label || "Entidad actual" };
    window.RADAR_ENTITY_DISCARDED = discarded;
    window.RADAR_DEADLINE_ARCHIVED = archived;
    window.RADAR_SYNC_PENDING = syncPending;
    window.RADAR.opportunities = active;
    window.RADAR.count = active.length;
    window.RADAR.quality = {
      ...(window.RADAR.quality || {}),
      entityCandidateCount: active.length,
      entityDiscardedCount: discarded.length,
      entityLowFitCount: lowFit.length,
      entityHumanDismissedCount: humanDismissed.length,
      entityArchivedClosedCount: archived.length,
      entityMappedMatchCount: annotated.length,
      entityAutoReconciledByUrlCount: reconciledByUrl,
      entityUnmappedMatchCount: syncPending.length,
      entityMatchTotal: items.length,
      entityFitRule: "Recomendaciones persistidas desde perfil aprobado y evidencia oficial versionada."
    };
    window.TENANT_RECOMMENDATIONS_APPLIED = true;
    const preselected = annotated.filter((item) => item.matchRecommendation.decision_status === "preselected" && item.matchRecommendation.candidacy_stage !== "abandoned");
    const activeCandidate = preselected.find((item) => !["none", "abandoned"].includes(item.matchRecommendation.candidacy_stage));
    localStorage.setItem("workspace-candidates-v1", JSON.stringify({ activeId: activeCandidate?.id || "", selectedIds: preselected.map((item) => item.id) }));
    return true;
  }

  function showMatchAvailability(message) {
    const card = [...document.querySelectorAll("#agent-grid .agent-card")]
      .find((item) => item.querySelector("strong")?.textContent.trim() === "Asistente de encaje");
    if (!card) return;
    let note = card.querySelector(".match-availability-note");
    if (!message) { note?.remove(); return; }
    if (!note) {
      note = document.createElement("p");
      note.className = "agent-readiness match-availability-note";
      card.append(note);
    }
    note.textContent = message;
  }

  function publishRunState(run) {
    const signature = JSON.stringify([run?.id || null, run?.status || null, run?.updated_at || null, run?.usage_json || null, run?.error || null]);
    if (signature === lastRunSignature) return false;
    lastRunSignature = signature;
    window.TENANT_MATCH_STATE = run || null;
    window.dispatchEvent(new CustomEvent("tenant-match-state", { detail: run || null }));
    if (run?.status !== "review_required" || !run.id || sessionStorage.getItem(`match-complete:${run.id}`)) return true;
    const total = Number(run.usage_json?.opportunities || 0);
    if (typeof showToast === "function") showToast(`Encaje calculado: ${total} oportunidades analizadas. Revisa los resultados.`);
    sessionStorage.setItem(`match-complete:${run.id}`, "shown");
    return true;
  }

  function publishLoadState(state, message = "") {
    const changed = window.TENANT_MATCH_LOAD_STATE !== state || window.TENANT_MATCH_LOAD_ERROR !== message;
    window.TENANT_MATCH_LOAD_STATE = state;
    window.TENANT_MATCH_LOAD_ERROR = message;
    if (changed) window.dispatchEvent(new CustomEvent("tenant-match-load-state", { detail: { state, message } }));
    return changed;
  }

  async function refresh() {
    const currentSession = session();
    if (!currentSession) return;
    const sessionSignature = [currentSession.tenantId, currentSession.userId, currentSession.issuedAt].join(":");
    if (blockedSessionSignature === sessionSignature) return;
    if (window.TENANT_RECOMMENDATIONS_APPLIED) publishLoadState("ready");
    else if (!window.TENANT_MATCH_LOAD_STATE) publishLoadState("loading");
    try {
      const state = await matchState();
      const items = state.recommendations || [];
      window.TENANT_MATCH_REVIEW_SUMMARY = state.reviewSummary || null;
      publishRunState(state.latestRun);
      showMatchAvailability("");
      const signature = JSON.stringify([currentSession.tenantId, state.reviewSummary, ...items.map((item) => [item.id, item.updated_at, item.score, item.human_review_status, item.decision_status, item.candidacy_stage])]);
      if (signature === lastRecommendationSignature) return publishLoadState("ready");
      lastRecommendationSignature = signature;
      const applied = apply(items);
      publishLoadState("ready");
      if (applied) window.dispatchEvent(new CustomEvent("tenant-recommendations-applied"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo recuperar el encaje";
      if (error?.status === 401) blockedSessionSignature = sessionSignature;
      showMatchAvailability(`Encaje no disponible: ${message}`);
      publishLoadState("error", message);
    }
  }

  window.addEventListener("role-session-applied", () => { blockedSessionSignature = ""; setTimeout(refresh, 0); });
  window.refreshTenantMatchState = refresh;
  setTimeout(refresh, 0);
  setInterval(() => { if (["#view-dashboard", "#view-agents", "#view-opportunities"].includes(location.hash)) refresh(); }, 5000);
})();
