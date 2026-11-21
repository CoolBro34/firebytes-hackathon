// Shared HTTP primitives used by every /api route. Depends only on standard Workers runtime APIs.
const REQUIRED = {
  // order: ["customer", "total"],     // fields that must be present on POST
};
/** @param {string} entity @param {object} rec @param {boolean} creating @returns {string|null} Applies the starter API's required-field rules. */
export function validate(entity, rec, creating) {
  for (const f of (REQUIRED[entity] || [])) {
    if (creating && (rec[f] === undefined || rec[f] === "" || rec[f] === null)) return f + " is required";
  }
  return null;                                     // put custom business rules here
}

export const ENTITY_RE = /^[a-z][a-z0-9_]{0,40}$/;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
/** @param {unknown} obj @param {number} [status] @returns {Response} Returns JSON with the API's shared no-store headers. */
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
/** @returns {string} Makes the same compact random identifier used by KV records. */
export const newId = () => "r_" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

/** @param {Request} request @returns {Promise<object|null>} Accepts only JSON objects, matching the original API contract. */
export async function readBody(request) {
  try { const b = await request.json(); return (b && typeof b === "object" && !Array.isArray(b)) ? b : null; }
  catch (e) { return null; }
}
