import type { SupabaseClient } from "@supabase/supabase-js";

export const tenantPlanCatalog = {
  public: {
    label: "Radar público", referenceMonthlyEur: 0,
    features: ["dashboard", "opportunities", "entity"], agentKeys: ["grant_search"]
  },
  social_team: {
    label: "Equipo social", referenceMonthlyEur: 29,
    features: ["dashboard", "opportunities", "entity", "agents", "audit"],
    agentKeys: ["grant_search", "entity_research", "match_agent", "alert_agent"]
  },
  mission_full: {
    label: "Misión integral", referenceMonthlyEur: 79,
    features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit"],
    agentKeys: ["grant_search", "entity_research", "match_agent", "document_review", "draft_agent", "alert_agent"]
  }
} as const;

export function resolveTenantPlan(motivations: unknown) {
  const values = motivations && typeof motivations === "object" ? motivations as Record<string, unknown> : {};
  const configured = values.commercial_plan && typeof values.commercial_plan === "object"
    ? values.commercial_plan as Record<string, unknown> : {};
  const requestedCode = String(configured.code || "");
  const code = requestedCode in tenantPlanCatalog
    ? requestedCode as keyof typeof tenantPlanCatalog
    : values.social_pricing && values.pilot_scope ? "mission_full" : "public";
  const spec = tenantPlanCatalog[code];
  const requestedBillingMode = String(configured.billing_mode || "");
  const billingMode = ["free", "sponsored", "contracted"].includes(requestedBillingMode)
    ? requestedBillingMode : code === "public" ? "free" : values.pilot_scope ? "sponsored" : "contracted";
  const configuredFee = Number(configured.current_monthly_eur);
  const currentMonthlyEur = billingMode === "sponsored" || billingMode === "free"
    ? 0 : Number.isFinite(configuredFee) && configuredFee >= 0 ? configuredFee : spec.referenceMonthlyEur;
  return {
    code, label: spec.label, billingMode, currentMonthlyEur,
    referenceMonthlyEur: spec.referenceMonthlyEur,
    billingStatus: billingMode === "sponsored" ? "Piloto patrocinado" : billingMode === "free" ? "Gratuito" : "Contratado",
    features: [...spec.features], agentKeys: [...spec.agentKeys],
    note: "El plan habilita sus funciones; solo el uso de datos internos o conectores privados exige autorización específica. Toda exportación conserva revisión humana."
  };
}

export async function requireTenantAgentEntitlement(supabase: SupabaseClient, tenantId: string, agentKey: string) {
  const { data, error } = await supabase.from("tenant_configs")
    .select("motivations_json").eq("tenant_id", tenantId).single();
  if (error) throw error;
  if (!resolveTenantPlan(data?.motivations_json).agentKeys.some((included) => included === agentKey)) {
    throw new Error("Asistente no incluido en el plan contratado");
  }
}
