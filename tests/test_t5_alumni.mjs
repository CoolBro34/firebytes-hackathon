import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workerUrl = pathToFileURL(path.join(here, "..", "worker.js"));
const { default: worker } = await import(workerUrl.href);

class MemoryKV {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = "" } = {}) { return { keys: [...this.values.keys()].filter(name => name.startsWith(prefix)).map(name => ({ name })) }; }
}

const calls = [];
const env = {
  DATA: new MemoryKV(), STAFF_CODE: "demo-secret",
  AI: { async run(model, input) { calls.push({ model, input }); return { response: "DESCRIPTION: A colorful student-built robot project.\nTEXT: NONE" }; } }
};
const noCodeEnv = { DATA: new MemoryKV(), AI: env.AI };
const image = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]).toString("base64");
const valid = {
  firstName: "Taylor Student", programs: ["AI Academy: Spark", "Hackathons"], yearsAttended: "2023-2024",
  gradYear: "2025", nowDoing: "college / university", field: "Computer Science", school: "Arizona State University",
  story: "I am studying computer science and building small projects with what I learned.", link: "https://example.test/project",
  proudOf: "Finishing a first project", consentShare: false, consentContact: false, contact: "do-not-keep@example.test"
};

async function call(pathname, { method = "GET", body, headers = {}, targetEnv = env } = {}) {
  const url = `https://example.test${pathname}`;
  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set("content-type", "application/json");
  if (!requestHeaders.has("origin")) requestHeaders.set("origin", new URL(url).origin);
  const request = new Request(url, { method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
  return worker.fetch(request, targetEnv);
}

for (const pathName of ["/", "/share"]) {
  const response = await call(pathName);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Tell us what you're up to/);
}
const staffPage = await call("/staff");
assert.equal(staffPage.status, 200);
assert.match(await staffPage.text(), /cic_staff_code/);

const programResponse = await call("/api/public/programs");
assert.equal(programResponse.status, 200);
const programs = (await programResponse.json()).programs;
assert.deepEqual(programs, ["AI Academy: Spark", "AI Academy: Amplify", "AI Academy: Reboot", "Hackathons", "Summer Camps", "Other / not sure"]);

let response = await call("/api/alumni/submit", { method: "POST", body: valid });
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true });
let stored = JSON.parse(await env.DATA.get("e:update"));
assert.equal(stored.length, 1);
assert.equal(stored[0].status, "new");
assert.equal(stored[0].firstName, "Taylor");
assert.equal(stored[0].programs, "AI Academy: Spark, Hackathons");
assert.equal(stored[0].consentContact, false);
assert.equal("contact" in stored[0], false);
assert.equal("image" in stored[0], false);

response = await call("/api/alumni/submit", { method: "POST", body: { ...valid, website: "filled by a bot" } });
assert.equal(response.status, 200);
assert.equal(JSON.parse(await env.DATA.get("e:update")).length, 1);

response = await call("/api/alumni/submit", { method: "POST", body: { ...valid, programs: ["Made-up program"] } });
assert.equal(response.status, 400);
response = await call("/api/alumni/submit", { method: "POST", body: { ...valid, story: "Too short" } });
assert.equal(response.status, 400);

response = await call("/api/alumni/submit", { method: "POST", body: { ...valid, image } });
assert.equal(response.status, 200);
stored = JSON.parse(await env.DATA.get("e:update"));
assert.equal(stored.length, 2);
assert.match(stored[1].imageNotes, /colorful student-built robot/);
assert.equal("image" in stored[1], false);
assert.equal(calls.length, 1);

response = await call("/api/update");
assert.equal(response.status, 401);
assert.deepEqual(await response.json(), { error: "Staff passcode required" });
response = await call("/api/update", { headers: { "x-staff-code": "demo-secret" } });
assert.equal(response.status, 200);
assert.equal((await response.json()).length, 2);

// Public submission remains available when the staff lock is enabled.
response = await call("/api/alumni/submit", { method: "POST", body: { ...valid, consentContact: true, contact: "student@example.test" } });
assert.equal(response.status, 200);
stored = JSON.parse(await env.DATA.get("e:update"));
assert.equal(stored[2].contact, "student@example.test");

const capabilities = await (await call("/api/capabilities")).json();
assert.equal(capabilities.staffLock, true);
const unlockedEnv = { ...noCodeEnv };
response = await call("/api/update", { targetEnv: unlockedEnv });
assert.equal(response.status, 200);

console.log("T5 TESTS PASSED");
