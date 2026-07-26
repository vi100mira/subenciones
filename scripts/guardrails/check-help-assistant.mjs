import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const knowledge = fs.readFileSync("prototype/help-assistant-knowledge.js", "utf8");
const runtime = fs.readFileSync("prototype/help-assistant.js", "utf8");
const styles = fs.readFileSync("prototype/stitch-theme.css", "utf8");
const html = fs.readFileSync("prototype/index.html", "utf8");

const topicIds = ["overview", "registration", "profile", "radar", "matching", "bases", "candidature", "common_library", "common_to_candidature", "document_consolidation", "project_folder", "document_viewer", "document_agent_access", "drafting", "progressive_knowledge", "changes", "async", "privacy", "audit"];
for (const topic of topicIds) {
  assert(knowledge.includes(`id: "${topic}"`), `Falta el tema pedagógico ${topic}`);
}
assert(runtime.includes('role="dialog"') && runtime.includes('aria-modal="false"') && runtime.includes("aria-live=\"polite\""));
assert(runtime.includes("No escribas credenciales") && knowledge.includes("no firma") && knowledge.includes("no presenta"));
assert(knowledge.includes("Curador de conocimiento") || knowledge.includes("el curador propone conocimiento"), "La guía no explica el curador documental");
assert(knowledge.includes("No entrena un modelo compartido") && knowledge.includes("no cruza datos entre tenants"), "La guía confunde conocimiento progresivo con entrenamiento compartido");
assert(!runtime.includes("fetch(") && !runtime.includes("localStorage") && !runtime.includes("window.MOCK"), "La guía local no debe acceder a red o datos tenant");
assert(styles.includes(".help-assistant-launcher") && styles.includes(".help-assistant-panel") && styles.includes("bottom: 84px"));
assert(html.includes("help-assistant-knowledge.js") && html.includes("help-assistant.js"));

const guideWindow = { addEventListener() {} };
const guideContext = vm.createContext({
  window: guideWindow,
  location: { hash: "#view-knowledge" },
  document: { readyState: "loading", addEventListener() {} },
  console
});
vm.runInContext(knowledge, guideContext);
vm.runInContext(runtime, guideContext);
assert.equal(guideWindow.INSERTIA_HELP_TOPICS.length, topicIds.length, "El catálogo contiene temas no verificados");
assert.deepEqual(
  Array.from(guideWindow.INSERTIA_HELP_ASSISTANT.contextTopicIds()),
  ["common_library", "common_to_candidature", "document_viewer"],
  "Base común no muestra sugerencias contextuales propias"
);

const cases = [
  {
    query: "¿Cómo vinculo un documento de Base común a una candidatura concreta?",
    topic: "common_to_candidature",
    includes: ["Vincular original", "Candidatura de destino"]
  },
  {
    query: "¿Cómo creo una copia editable sin modificar el original de Base común?",
    topic: "common_to_candidature",
    includes: ["Crear copia editable", "nunca se modifica"]
  },
  {
    query: "¿Cómo guardo y consolido un documento y qué ocurre si lo vuelvo a editar?",
    topic: "document_consolidation",
    includes: ["Guardar y consolidar documento", "Reabrir para corregir"]
  },
  {
    query: "¿Cómo envío un documento consolidado a revisión de Base común?",
    topic: "common_to_candidature",
    includes: ["Enviar a revisión de Base común", "aprobarlo"]
  },
  {
    query: "¿Dónde descargo un fichero, un check o toda la carpeta de proyecto?",
    topic: "project_folder",
    includes: ["Descargar este check", "Descargar disponibles"]
  },
  {
    query: "¿Qué ocurre si el tenant no tiene contratado el agente documental?",
    topic: "document_agent_access",
    includes: ["solo lectura", "consultas de IA"]
  },
  {
    query: "¿Por qué el visor local abre el original directamente y cómo conserva el scroll?",
    topic: "document_viewer",
    includes: ["Reintentar apertura", "scroll"]
  }
];

for (const testCase of cases) {
  const ranked = Array.from(guideWindow.INSERTIA_HELP_ASSISTANT.rankedTopicIds(testCase.query));
  assert.equal(ranked[0], testCase.topic, `Tema incorrecto para: ${testCase.query}`);
  const answer = guideWindow.INSERTIA_HELP_ASSISTANT.answer(testCase.query);
  for (const fragment of testCase.includes) assert(answer.includes(fragment), `Falta «${fragment}» en: ${testCase.query}`);
}

console.log(JSON.stringify({ topics: topicIds.length, featureQuestions: cases.length, externalData: false, floating: true, accessible: true, status: "passed" }, null, 2));
