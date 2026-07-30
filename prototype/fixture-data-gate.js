(function () {
  const params = new URLSearchParams(location.search);
  const localFixture = ["localhost", "127.0.0.1"].includes(location.hostname) && params.get("fixture") === "1";
  window.INSERTIA_FIXTURE_MODE = localFixture;
  if (localFixture) return;
  window.MOCK = {
    opportunities: [], facts: [], sources: [], governance: [], reviewQueue: [], agents: [], platformAgents: [],
    runs: [], platformRuns: [], checklist: [], outline: [], tenants: [], platformCampaigns: [],
    operationsJobs: [], operationsHealth: [], alerts: [], platformAlerts: []
  };
  window.RADAR = { opportunities: [], quality: {}, count: 0 };
  window.MUNICIPAL_RADAR = { opportunities: [] };
  window.PRIVATE_OPEN_OPPORTUNITIES = [];
})();
