// Acceptance test for task T1 (written by the architect; Codex must not edit this file).
// Pulls attentionHTML() out of src/index.html and runs it against fake CONFIG data.
// Run: node tests/test_attention.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "src/index.html"), "utf8");

function extractFn(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function ${name} not found in src/index.html`);
  let i = src.indexOf("{", start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error("unbalanced braces");
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const make = CONFIG => new Function("CONFIG", "esc", extractFn(html, "attentionHTML") + "\nreturn attentionHTML;")(CONFIG, esc);

let fails = 0;
const check = (name, cond) => { console.log((cond ? "ok   " : "FAIL ") + name); if (!cond) fails++; };
const count = (s, sub) => s.split(sub).length - 1;

const flagged = { label: "Things", singular: "Thing", icon: "📦", titleField: "name",
  rowClass: r => r.f || "", attentionReason: r => r.why || "" };

// 1
check("empty data -> ''", make({ entities: { a: flagged } })({}) === "");
// 2
check("no rowClass -> ''", make({ entities: { a: { label: "A", singular: "A", titleField: "name" } } })({ a: [{ id: 1, name: "x", f: "flag-bad" }] }) === "");
// 3
{
  const out = make({ entities: { a: flagged } })({ a: [
    { id: 1, name: "WarnOne", f: "flag-warn" }, { id: 2, name: "BadOne", f: "flag-bad" },
    { id: 3, name: "Fine" }, { id: 4, name: "BadTwo", f: "flag-bad", why: "overdue 3 days" } ] });
  check("count shows 3", /class="att-count">\s*3\s*</.test(out));
  check("bad before warn, order kept", out.indexOf("BadOne") < out.indexOf("BadTwo") && out.indexOf("BadTwo") < out.indexOf("WarnOne"));
  check("unflagged excluded", !out.includes("Fine"));
  check("reason shown", out.includes('class="att-why"') && out.includes("overdue 3 days"));
  check("link to entity", out.includes('href="#/a"'));
  check("classes att-bad/att-warn", count(out, 'class="att-bad"') === 2 && count(out, 'class="att-warn"') === 1);
}
// 4
{
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: i, name: "R" + i, f: "flag-warn" }));
  const out = make({ entities: { a: flagged } })({ a: rows });
  check("max 8 items", count(out, "<li") === 8);
  check("+2 more", out.includes("+2 more"));
}
// 5
{
  const out = make({ entities: { a: flagged } })({ a: [{ id: 1, name: "<script>", f: "flag-bad", why: "<b>x" }] });
  check("title escaped", out.includes("&lt;script&gt;") && !out.includes("<script>"));
  check("reason escaped", out.includes("&lt;b&gt;x"));
}
// 6
{
  const boom = { ...flagged, rowClass: r => { if (r.id === 1) throw new Error("x"); return "flag-bad"; }, attentionReason: () => { throw new Error("y"); } };
  let out, threw = false;
  try { out = make({ entities: { a: boom } })({ a: [{ id: 1, name: "A" }, { id: 2, name: "B" }] }); } catch { threw = true; }
  check("throwing callbacks don't escape", !threw && out.includes("B") && !out.includes(">A<") && !out.includes("att-why"));
}
// 7 untitled
{
  const out = make({ entities: { a: flagged } })({ a: [{ id: 1, name: "", f: "flag-bad" }] });
  check("(untitled) fallback", out.includes("(untitled)"));
}
// 8 wired into dashboard + CSS present
check("viewDashboard calls attentionHTML", extractFn(html, "viewDashboard").includes("attentionHTML("));
check("CSS for .att-list present", /\.att-list\s*\{/.test(html));

console.log(fails ? `\n${fails} FAILED` : "\nT1 ATTENTION TESTS PASSED");
process.exit(fails ? 1 : 0);
