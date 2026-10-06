// Disposable in-memory browser test fixture. Never connects to Supabase.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let entries = [];
let insertCalls = 0;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8001");
  if (url.pathname === "/mobile-preview") {
    const width = url.searchParams.get("width") === "320" ? 320 : 390;
    res.setHeader("Content-Type", "text/html");
    res.end(`<title>Mobile test fixture</title><body style="margin:0;background:#ddd"><iframe title="Handy-Testansicht" src="/#uebersicht" style="border:0;width:${width}px;height:1000px"></iframe></body>`);
    return;
  }
  if (url.pathname === "/config.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(`export const config = {supabaseUrl:'https://fixture.supabase.co', publishableKey:'sb_publishable_fixture'}; const originalFetch = window.fetch.bind(window); window.fetch = (url, options) => originalFetch(String(url).replace('https://fixture.supabase.co', location.origin), options);`);
    return;
  }
  if (url.pathname === "/test-state") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ entries, insertCalls })); return; }
  if (url.pathname === "/rest/v1/mitbringsel") {
    let body = ""; for await (const chunk of req) body += chunk;
    const data = body ? JSON.parse(body) : null;
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { res.end(JSON.stringify(entries)); return; }
    if (req.method === "POST") {
      insertCalls++;
      await new Promise(done => setTimeout(done, 800));
      if (data.some(row => row.mitbringsel === "FEHLER")) { res.statusCode = 503; res.end("{}"); return; }
      const added = data.map(row => ({ id: randomUUID(), ...row }));
      entries.push(...added); res.end(JSON.stringify(added)); return;
    }
    const matches = entries.filter(row => row.id === id);
    if (req.method === "PATCH") matches.forEach(row => Object.assign(row, data));
    if (req.method === "DELETE") entries = entries.filter(row => row.id !== id);
    res.end(JSON.stringify(matches)); return;
  }
  try {
    const path = resolve(root, `.${url.pathname === "/" ? "/index.html" : url.pathname}`);
    if (!path.startsWith(root + "/")) throw new Error("outside root");
    res.setHeader("Content-Type", types[extname(path)] || "text/plain");
    let content = await readFile(path);
    if (path.endsWith("index.html")) content = content.toString().replace("<title>", "<title>TEST · ");
    res.end(content);
  } catch { res.statusCode = 404; res.end("Not found"); }
}).listen(8001, "127.0.0.1", () => console.log("Disposable test fixture: http://127.0.0.1:8001"));
