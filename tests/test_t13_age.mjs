// T13: age confirmation on alumni submissions. Adults confirm 18+; under-18s need a parent/guardian email.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { default: worker } = await import(pathToFileURL(path.join(here, "..", "worker.js")).href);

const store = new Map();
const env = { DATA: { get: async k => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); }, delete: async k => { store.delete(k); }, list: async () => ({ keys: [...store.keys()].map(name => ({ name })) }) } };
const base = { programs: ["Hackathons"], nowDoing: "high school", story: "Still in high school and building games every weekend now." };
let ip = 0;
const submit = body => worker.fetch(new Request("https://x.test/api/alumni/submit", {
  method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "10.0.0." + (++ip) }, body: JSON.stringify(body)
}), env, {});
const rows = async () => JSON.parse(store.get("e:update") || "[]");

let r = await submit(base);
assert.equal(r.status, 400, "missing age confirmation is rejected");
r = await submit({ ...base, ageConfirm: "maybe" });
assert.equal(r.status, 400, "unknown age value is rejected");
r = await submit({ ...base, ageConfirm: "minor-with-permission" });
assert.equal(r.status, 400, "minor without parent email is rejected");
r = await submit({ ...base, ageConfirm: "minor-with-permission", parentEmail: "not-an-email" });
assert.equal(r.status, 400, "minor with invalid parent email is rejected");
assert.equal((await rows()).length, 0, "nothing stored for rejected submissions");

r = await submit({ ...base, ageConfirm: "minor-with-permission", parentEmail: "  Parent@Example.TEST " });
assert.equal(r.status, 200, "minor with parent email is accepted");
let saved = (await rows()).at(-1);
assert.equal(saved.ageConfirm, "minor-with-permission");
assert.equal(saved.parentEmail, "parent@example.test", "parent email is trimmed and lowercased");

r = await submit({ ...base, ageConfirm: "adult", parentEmail: "parent@example.test" });
assert.equal(r.status, 200, "adult is accepted");
saved = (await rows()).at(-1);
assert.equal(saved.ageConfirm, "adult");
assert.equal(saved.parentEmail, "", "parent email is dropped for adults");

console.log("T13 TESTS PASSED");
