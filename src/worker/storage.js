// Handles /api/ping, entity CRUD, /api/_reset and /api/_export through KV. Depends on http.js helpers.
import { json, readBody, newId, validate, ENTITY_RE } from './http.js';

/** @param {object} env @param {string} entity @returns {Promise<object[]>} Loads one entity list from KV; malformed values retain the existing empty-list fallback. */
export async function load(env, entity) {
  const raw = await env.DATA.get("e:" + entity);
  try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}
/** @param {object} env @param {string} entity @param {object[]} rows @returns {Promise<void>} Stores the complete entity array under its existing KV key. */
export const save = (env, entity, rows) => env.DATA.put("e:" + entity, JSON.stringify(rows));

/** @param {Request} request @param {object} env @param {string[]} parts @returns {Promise<Response>} Handles export, reset, and generic entity CRUD without changing response semantics. */
export async function storageApi(request, env, parts) {
  const method = request.method;
  if (!env.DATA) return json({ error: "No storage bound" }, 404);

  if (parts[0] === "_export" && method === "GET") {
    const list = await env.DATA.list({ prefix: "e:" });
    const out = {};
    for (const k of list.keys) out[k.name.slice(2)] = await load(env, k.name.slice(2));
    return json(out);
  }
  if (parts[0] === "_reset" && method === "POST") {
    const body = await readBody(request);
    if (!body) return json({ error: "Body must be an object of arrays" }, 400);
    const existing = await env.DATA.list({ prefix: "e:" });
    for (const k of existing.keys) await env.DATA.delete(k.name);
    for (const [entity, rows] of Object.entries(body)) {
      if (!ENTITY_RE.test(entity) || !Array.isArray(rows)) continue;
      await save(env, entity, rows.filter(r => r && typeof r === "object").map(r => ({ ...r, id: String(r.id || newId()) })));
    }
    return json({ ok: true });
  }

  const entity = parts[0], id = parts[1];
  if (!ENTITY_RE.test(entity || "") || parts.length > 2) return json({ error: "Not found" }, 404);

  if (!id && method === "GET") return json(await load(env, entity));
  if (!id && method === "POST") {
    const body = await readBody(request);
    if (!body) return json({ error: "Body must be a JSON object" }, 400);
    const msg = validate(entity, body, true);
    if (msg) return json({ error: msg }, 400);
    const rows = await load(env, entity), rec = { ...body, id: newId() };
    rows.push(rec); await save(env, entity, rows);
    return json(rec, 201);
  }
  if (id) {
    const rows = await load(env, entity), i = rows.findIndex(r => r.id === id);
    if (i < 0) return json({ error: entity + " '" + id + "' not found" }, 404);
    if (method === "GET") return json(rows[i]);
    if (method === "DELETE") { rows.splice(i, 1); await save(env, entity, rows); return json({ ok: true }); }
    if (method === "PUT") {
      const body = await readBody(request);
      if (!body) return json({ error: "Body must be a JSON object" }, 400);
      const merged = { ...rows[i], ...body, id };
      const msg = validate(entity, merged, false);
      if (msg) return json({ error: msg }, 400);
      rows[i] = merged; await save(env, entity, rows);
      return json(merged);
    }
  }
  return json({ error: "Method not allowed" }, 405);
}
