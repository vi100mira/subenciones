(function () {
  const panel = document.querySelector("#onboarding-request-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">Alta segura</p><h2>Solicitar alta de entidad</h2></div><span class="badge review">Sin publicar</span></div>
      <form class="inline-form" id="onboarding-request-form">
        <label><span>Entidad</span><input name="entityName" value="Novaterra demo" required /></label>
        <label><span>Web publica</span><input name="websiteUrl" value="https://www.novaterra.org.es" /></label>
        <label><span>Email solicitante</span><input name="requesterEmail" type="email" required /></label>
        <label><span>Email admin entidad</span><input name="adminEmail" type="email" required /></label>
        <label><span>Territorio</span><input name="territory" value="Comunitat Valenciana" /></label>
        <label><span><input name="publicWebConsent" type="checkbox" /> Autoriza solo analisis de web publica</span></label>
        <button class="primary-action" type="submit">Registrar solicitud</button>
      </form>
      <div id="onboarding-request-status" class="plain-note"><strong>Estado</strong><span>La solicitud crea una peticion revisable. No crea usuarios, no conecta Drive y no aprueba datos.</span></div>`;
  }

  const form = document.querySelector("#onboarding-request-form");
  const status = document.querySelector("#onboarding-request-status");
  if (!form || !status) return;

  function setStatus(title, detail) {
    status.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      entityName: data.get("entityName"),
      websiteUrl: data.get("websiteUrl"),
      requesterEmail: data.get("requesterEmail"),
      adminEmail: data.get("adminEmail"),
      territory: data.get("territory"),
      publicWebConsent: data.get("publicWebConsent") === "on"
    };

    setStatus("Registrando", "Guardando solicitud en Supabase.");

    try {
      const response = await fetch("/api/onboarding-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo registrar la solicitud");
      const request = result.data.request;
      setStatus("Solicitud registrada", `${request.entity_name} queda en estado ${request.status}. Referencia: ${request.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado";
      setStatus("No conectado", `${message}. En desarrollo local, este formulario necesita ejecutarse con Vercel Functions.`);
    }
  });
})();
