import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(path.join(root, "src/index.html"), "utf8");
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
assert.ok(!/<aside\b|class="side"|\.side\s*\{/.test(html), "staff sidebar navigation should be removed");
assert.match(html, /<nav class="nav" id="nav" aria-label="Staff portal"><\/nav>/, "top navbar is present");
assert.ok(html.includes('navOrder: ["dashboard", "update", "x/newsletter", "session"]'), "configured route order includes dashboard, alumni, newsletter, and sessions");
assert.ok(html.includes('id: "dashboard"') && html.includes('id: "settings"'), "dashboard and settings routes are present");
assert.ok(html.includes('k === "update" ? "ALUMNI"') && html.includes('k === "session" ? "SESSIONS"'), "entity navigation uses the specified labels");
assert.ok(html.includes('v.id === "newsletter" ? "NEWSLETTER"'), "newsletter navigation uses the specified label");
assert.ok(html.includes('label: "SETTINGS"'), "settings navigation is present");
assert.match(html, /href="#\/\$\{i\.id\}"/, "navigation routes use hash links");
const heroStart = html.indexOf("function codingColorDashboardHero(");
const heroEnd = html.indexOf("\nfunction wireDashboardNeuralLines", heroStart);
assert.ok(heroStart >= 0 && heroEnd > heroStart, "dashboard hero renderer is included in the built staff app");
const renderHero = new Function("CONFIG", "esc", "pct", "excerpt", `${html.slice(heroStart, heroEnd)}; return codingColorDashboardHero;`)(
  { demoNotice: "Test demo", entities: {} },
  value => String(value ?? "").replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char])),
  (a, b) => b ? Math.round(Number(a) / Number(b) * 100) : "",
  value => String(value || "").slice(0, 64)
);
const hero = renderHero({ update: [], session: [], post: [] });
for (const href of ['href="#/update"', 'href="#/x/newsletter"', 'href="#/session"', 'href="#attention"', 'href="/"']) assert.ok(hero.includes(href), `rendered dashboard satellite uses ${href}`);
assert.ok(hero.includes('target="_blank" rel="noopener"'), "student page satellite opens in a new tab");
for (const token of ["#0a0a0a", "#a78b71", "#c9b8a0", "#e8d5b7", "Playfair Display", "Inter", "radial-gradient", "backdrop-filter:blur(10px)"]) {
  assert.ok(html.toLowerCase().includes(token.toLowerCase()), `design system includes ${token}`);
}
assert.ok(!/#(?:2563eb|7c3aed)\b/i.test(css), "staff CSS contains no blue or purple palette tokens");
console.log("T11 TESTS PASSED");
