import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { default: worker } = await import(pathToFileURL(path.join(here, "..", "worker.js")).href);
const newsletter = { subject: "News", preheader: "Updates", intro: "Hello", sections: [{ heading: "Build", body: "Students made apps", link: "https://example.test/original" }], cta: "Join us" };
const translated = { subject: "Noticias", preheader: "Novedades", intro: "Hola", sections: [{ heading: "Crear", body: "Estudiantes hicieron aplicaciones", link: "https://evil.test/replacement" }], cta: "Acompáñenos" };
class MemoryKV { constructor() { this.map = new Map(); } async get(key) { return this.map.get(key) || null; } async put(key, value) { this.map.set(key, value); } }
function envWith(run, staff = false) { return { DATA: new MemoryKV(), ...(staff ? { STAFF_CODE: "private-test-code" } : {}), AI: { async run(model, input) { return run(model, input); } } }; }
async function call(body, env, { origin = "https://example.test", code } = {}) {
  const headers = { "content-type": "application/json" };
  if (origin !== null) headers.origin = origin;
  if (code) headers["x-staff-code"] = code;
  return worker.fetch(new Request("https://example.test/api/newsletter/translate", { method: "POST", headers, body: JSON.stringify(body) }), env);
}
const body = { newsletter, lang: "es" };

for (const response of [
  { response: JSON.stringify({ ...translated, sections: [{ heading: "Crear", body: "Estudiantes hicieron aplicaciones" }] }) },
  { response: `Here is the translation: ${JSON.stringify(translated)} Thank you.` },
  { response: translated }
]) {
  const env = envWith(async () => response);
  const result = await call(body, env);
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).sections[0], { heading: "Crear", body: "Estudiantes hicieron aplicaciones", link: newsletter.sections[0].link });
}
let result = await call(body, envWith(async () => ({ response: { ...translated, sections: [] } })));
assert.equal(result.status, 502);
result = await call({ ...body, lang: "fr" }, envWith(async () => ({ response: translated })));
assert.equal(result.status, 400);
result = await call(body, {});
assert.equal(result.status, 404);
result = await call(body, envWith(async () => ({ response: translated })), { origin: "https://foreign.test" });
assert.equal(result.status, 403);
const locked = envWith(async () => ({ response: translated }), true);
result = await call(body, locked);
assert.equal(result.status, 401);
result = await call(body, locked, { code: "private-test-code" });
assert.equal(result.status, 200);
console.log("T9 TESTS PASSED");
