import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const port = Number(process.argv[2] || 4178);
const root = path.resolve("prototype");
const mime = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

http.createServer(async (request, response) => {
  if (request.url === "/api/auth-session" && request.method === "POST") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true, data: { role: "superadmin", label: "Verificación local", screen: "opportunities", accessToken: "local-ui-fixture" } }));
    return;
  }

  const requestPath = new URL(request.url || "/", "http://127.0.0.1").pathname;
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, "index.html")) {
    response.writeHead(403).end("Ruta no permitida");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(content);
  } catch {
    response.writeHead(404).end("No encontrado");
  }
}).listen(port, "127.0.0.1", () => console.log(`Fixture UI local en http://127.0.0.1:${port}`));
