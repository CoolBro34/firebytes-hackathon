// Serves GET /, /share, /staff and the existing staff-app fallback page. Depends on bundled HTML constants.
/** @param {URL} url @returns {Response} Serves the same HTML, content type and cache policy for the existing page routes. */
export function pageResponse(url) {
  if (url.pathname === "/" || url.pathname === "/share") return new Response(SHARE_PAGE_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  return new Response(STAFF_APP_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
