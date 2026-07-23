const baseUrl = process.env.ONBOARDING_E2E_BASE_URL || "";
const writeEnabled = process.env.ONBOARDING_E2E_WRITE === "1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (!baseUrl) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        skipped: true,
        reason: "Define ONBOARDING_E2E_BASE_URL para probar una API local o preview."
      },
      null,
      2
    )
  );
  process.exit(0);
}

const accessToken = process.env.ONBOARDING_E2E_ACCESS_TOKEN || "";
const tenantId = process.env.ONBOARDING_E2E_TENANT_ID || "";
const demoResponse = await fetch(`${baseUrl}/api/demo-tenant-status`, {
  headers: accessToken && tenantId ? { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId } : {}
});
if (!accessToken || !tenantId) {
  assert(demoResponse.status === 401, `demo-tenant-status debe exigir sesión; devolvió HTTP ${demoResponse.status}`);
} else {
  assert(demoResponse.ok, `GET demo-tenant-status fallo con HTTP ${demoResponse.status}`);
  const demoPayload = await demoResponse.json();
  assert(demoPayload.ok, "demo-tenant-status no devolvio ok=true");
  assert(demoPayload.data?.organization?.slug === "novaterra-demo", "Demo tenant inesperado");
}

let writeResult = "omitido";
if (writeEnabled) {
  const unique = Date.now();
  const response = await fetch(`${baseUrl}/api/onboarding-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityName: `Entidad E2E ${unique}`,
      websiteUrl: "https://example.org",
      requesterEmail: `solicitante+${unique}@example.org`,
      adminEmail: `admin+${unique}@example.org`,
      territory: "Comunitat Valenciana",
      publicWebConsent: true
    })
  });
  const payload = await response.json();
  assert(response.status === 201, `POST onboarding-request fallo con HTTP ${response.status}`);
  assert(payload.ok && payload.data?.request?.status === "requested", "Solicitud no quedo en requested");
  writeResult = "solicitud demo registrada";
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      demoTenant: accessToken && tenantId ? "novaterra-demo autenticado" : "protegido sin sesión",
      write: writeResult
    },
    null,
    2
  )
);
