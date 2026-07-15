import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

function gitValue(...args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

const builtAt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date()).replaceAll("-", ".");
const revision = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.GITHUB_SHA?.slice(0, 7) || gitValue("rev-parse", "--short=7", "HEAD") || "local";
const releaseTag = gitValue("describe", "--tags", "--exact-match", "HEAD");
const info = { version: packageJson.version, builtAt, revision, releaseTag };
const output = `window.INSERTIA_BUILD_INFO = ${JSON.stringify(info)};\n`;

await writeFile(new URL("../prototype/build-info.js", import.meta.url), output, "utf8");
