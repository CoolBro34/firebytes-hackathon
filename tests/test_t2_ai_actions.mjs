import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workerUrl = pathToFileURL(path.join(here, "..", "worker.js"));
const { default: worker } = await import(workerUrl.href);
const calls = [];
const env = {
  AI: {
    async run(model, input) {
      calls.push({ model, input });
      return { response: "ok text" };
    }
  }
};

const donorRecord = {
  period: "Fall 2026", studentsServed: 18, activeStudents: 13, retentionRate: 72,
  avgAttendance: 81, learningHours: 640, avgSkillGrowth: 1.6, projectsShipped: 41,
  programs: "Intro to Web Dev, Python Foundations, Game Design", story: ""
};
const checkinRecord = {
  name: "Jaylen M.", program: "Python Foundations", attendanceRate: 54,
  daysSinceLastSession: 19, lastProject: ""
};

async function post(action, record) {
  const url = "https://example.test/api/ai";
  return worker.fetch(new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", origin: new URL(url).origin },
    body: JSON.stringify({ action, record, org: { name: "Coding with Color", about: "x" } })
  }), env);
}

for (const [action, record] of [["donor_update", donorRecord], ["checkin", checkinRecord]]) {
  const response = await post(action, record);
  assert.equal(response.status, 200, `${action} status`);
  assert.equal((await response.json()).text, "ok text", `${action} text`);
}

const donorInput = calls[0].input.messages;
const checkinInput = calls[1].input.messages;
assert.match(donorInput[0].content.toLowerCase(), /never invent/);
assert.ok(donorInput[1].content.includes('"retentionRate":72'));
assert.match(checkinInput[0].content.toLowerCase(), /under 45 words/);

const unknownUrl = "https://example.test/api/ai";
const unknown = await worker.fetch(new Request(unknownUrl, {
  method: "POST",
  headers: { "content-type": "application/json", origin: new URL(unknownUrl).origin },
  body: JSON.stringify({ action: "unknown", record: {}, org: { name: "Coding with Color", about: "x" } })
}), env);
assert.equal(unknown.status, 400);

console.log("T2 TESTS PASSED");
