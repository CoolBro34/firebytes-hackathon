// Protects staff /api routes and leaves the four existing public API routes open. Depends on no app module.
/** @param {string} expected @param {string} supplied @returns {boolean} Compares every character position to avoid early-exit string comparisons. */
export function staffCodeMatches(expected, supplied) {
  if (typeof expected !== "string" || typeof supplied !== "string") return false;
  let mismatch = expected.length ^ supplied.length;
  const length = Math.max(expected.length, supplied.length);
  for (let i = 0; i < length; i++) mismatch |= (expected.charCodeAt(i) || 0) ^ (supplied.charCodeAt(i) || 0);
  return mismatch === 0;
}

/** @param {string} pathname @param {string} method @returns {boolean} Keeps the same four API routes public when STAFF_CODE is enabled. */
export function isPublicApiRequest(pathname, method) {
  return (pathname === "/api/capabilities" && method === "GET") ||
    (pathname === "/api/ping" && method === "GET") ||
    (pathname === "/api/alumni/submit" && method === "POST") ||
    (pathname === "/api/public/programs" && method === "GET");
}
