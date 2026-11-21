import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "src/presets/coding_in_color.js"), "utf8");
const start = source.indexOf("function alumniWallItems(");
const end = source.indexOf("\n}\n\n// Lazy OGL gallery", start);
assert.ok(start >= 0 && end > start, "alumniWallItems must remain a standalone pure function");
const alumniWallItems = new Function(`${source.slice(start, end + 2)}; return alumniWallItems;`)();
const record = (firstName, status, consentShare, day, extra = {}) => ({
  firstName, status, consentShare, submittedAt: `2026-11-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  nowDoing: "college / university", programs: "Hackathons, Summer Camps", story: "A consented alumni story.", ...extra
});

const selected = alumniWallItems([
  record("Old", "featured", true, 1), record("Recent review", "reviewed", true, 9),
  record("Private", "featured", false, 10), record("Hidden", "hidden", true, 11),
  record("New consented", "new", true, 12), record("No consent", "new", false, 13)
]);
assert.deepEqual(selected.map(item => item.firstName), ["Recent", "Old", "New"]);
assert.equal(selected[0].label, "Recent · Hackathons");
assert.equal(selected[0].programs, "Hackathons, Summer Camps");
assert.ok(selected.every(item => !Object.hasOwn(item, "contact")));
console.log("ok   only consented approved stories, with consented new stories as top-up");

const enoughApproved = alumniWallItems([
  record("A", "featured", true, 1), record("B", "reviewed", true, 4), record("C", "featured", true, 3),
  record("Newest new", "new", true, 14)
]);
assert.deepEqual(enoughApproved.map(item => item.firstName), ["B", "C", "A"]);
console.log("ok   reviewed/featured first and new omitted once three approved stories exist");

const many = Array.from({ length: 15 }, (_, index) => record(`Name${index}`, index % 2 ? "reviewed" : "featured", true, index + 1));
const capped = alumniWallItems(many);
assert.equal(capped.length, 12);
assert.equal(capped[0].firstName, "Name14");
assert.equal(capped.at(-1).firstName, "Name3");
console.log("ok   newest first and capped at twelve");

const anonymous = alumniWallItems([record("  ", "featured", true, 10, { programs: "Summer Camps" })]);
assert.equal(anonymous[0].firstName, "");
assert.equal(anonymous[0].label, "Alum · Summer Camps");
console.log("ok   blank first name uses Alum label");
console.log("T8 TESTS PASSED");
