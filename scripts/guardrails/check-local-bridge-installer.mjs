import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";

const root = "prototype/local-bridge/20260731r1";
const installer = await fs.readFile(`${root}/install-insertia-local-bridge.ps1`, "utf8");
const connector = await fs.readFile(`${root}/connector.mjs`, "utf8");
const runner = await fs.readFile(`${root}/run-folder-inventory.mjs`, "utf8");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex").toUpperCase();

assert.match(installer, /20260731r1/);
assert.match(installer, new RegExp(digest(connector)));
assert.match(installer, new RegExp(digest(runner)));
assert.doesNotMatch(installer, /20260731\/connector\.mjs/);
assert.doesNotMatch(connector, /python|SUPABASE_SERVICE_ROLE|service_role/i);
assert.match(connector, /run-folder-inventory\.mjs/);
console.log(JSON.stringify({ assertions: 6, status: "passed" }, null, 2));
