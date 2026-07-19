export async function recordAgentRunAudit(supabase, run, action, actorLabel, detail = {}) {
  const { error } = await supabase.from("audit_events").insert({
    tenant_id: run.tenant_id,
    actor_user_id: run.requested_by || null,
    actor_label: actorLabel,
    action,
    target_type: "agent_run",
    target_id: run.id,
    detail_json: detail
  });
  if (error) throw error;
}
