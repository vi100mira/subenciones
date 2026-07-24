const JOURNALS = [
  {
    id: "bop_santa_cruz_tenerife",
    name: "BOP de Santa Cruz de Tenerife",
    territoryCodes: new Set(["ES703", "ES706", "ES707", "ES709"]),
    indexUrl: "https://www.bopsantacruzdetenerife.es/bopsc2/main1.php",
    hostnames: new Set(["bopsantacruzdetenerife.es", "www.bopsantacruzdetenerife.es"])
  }
];

function territoryCode(value) {
  return String(value || "").trim().split(/\s+/)[0].toUpperCase();
}

export function officialJournalSeedsFor(opportunity) {
  const code = territoryCode(opportunity?.territory);
  return JOURNALS.filter((journal) => journal.territoryCodes.has(code)).map((journal) => ({
    value: journal.indexUrl,
    label: journal.name,
    journalId: journal.id
  }));
}

export function isKnownOfficialJournal(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return JOURNALS.some((journal) => journal.hostnames.has(hostname));
  } catch {
    return false;
  }
}
