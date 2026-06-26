import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const lineBudgets = {
  "AGENTS.md": 120,
  "prototype/index.html": 420,
  "prototype/styles.css": 850,
  "prototype/app.js": 360,
  "src/supabaseAdmin.ts": 160,
  "src/logger.ts": 120,
  "docs/security/credentials-and-logging.md": 180,
  "api/source-connections.ts": 160,
  "api/source-blob-upload.ts": 160,
  "api/ingestion-dispatch.ts": 140,
  "backend/app/storage/sqlite.py": 320,
  "backend/app/services/ingestion.py": 160
};

function countLines(content) {
  return content ? content.split(/\r?\n/).length : 0;
}

const failures = [];

console.log("Line Budget Report");
for (const [relativePath, budget] of Object.entries(lineBudgets)) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing budgeted file: ${relativePath}`);
    continue;
  }

  const lines = countLines(fs.readFileSync(absolutePath, "utf8"));
  const over = lines - budget;
  console.log(`- ${relativePath}: ${lines}/${budget} -> ${over > 0 ? `OVER +${over}` : "OK"}`);
  if (over > 0) failures.push(`${relativePath} exceeded budget (${lines}/${budget})`);
}

if (failures.length > 0) {
  console.error("\nLine budget check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nLine budget check passed.");
