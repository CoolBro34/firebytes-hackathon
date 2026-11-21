// Routes all Worker requests, from / and /staff pages to every /api endpoint. Depends on all route modules.
import { json } from './http.js';
import { storageApi } from './storage.js';
import { aiHandler } from './ai.js';
import { mediaHandler, newsletterHandler } from './media.js';
import { newsletterTranslateHandler } from './translate.js';
import { alumniSubmit, ALUMNI_PROGRAMS } from './alumni.js';
import { staffCodeMatches, isPublicApiRequest } from './auth.js';
import { pageResponse } from './pages.js';

/** @param {Request} request @param {object} env @param {string[]} parts @returns {Promise<Response>} Dispatches API routes in their original order. */
async function api(request, env, parts) {
  const method = request.method;
  if (parts[0] === "capabilities" && method === "GET") return json({ storage: !!env.DATA, ai: !!(env.AI || env.ANTHROPIC_API_KEY), media: !!env.AI, staffLock: !!env.STAFF_CODE });
  if (parts[0] === "ai" && method === "POST") return aiHandler(request, env);
  if (parts[0] === "ping" && method === "GET") return env.DATA ? json({ ok: true }) : json({ error: "No storage bound" }, 404);
  if (parts[0] === "public" && parts[1] === "programs" && method === "GET") return json({ programs: ALUMNI_PROGRAMS });
  if (parts[0] === "alumni" && parts[1] === "submit" && method === "POST") return alumniSubmit(request, env);
  if (method === "POST" && parts[0] === "media" && (parts[1] === "describe" || parts[1] === "transcribe")) return mediaHandler(request, env, parts);
  if (parts[0] === "newsletter" && parts[1] === "translate" && method === "POST") return newsletterTranslateHandler(request, env);
  if (parts[0] === "newsletter" && method === "POST") return newsletterHandler(request, env);
  return storageApi(request, env, parts);
}

export default {
  /** @param {Request} request @param {object} env @returns {Promise<Response>} Applies the original CORS, auth, API, method and page routing. */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "Content-Type, X-Staff-Code" } });
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      if (env.STAFF_CODE && !isPublicApiRequest(url.pathname, request.method) && !staffCodeMatches(env.STAFF_CODE, request.headers.get("x-staff-code"))) {
        return json({ error: "Staff passcode required" }, 401);
      }
      try { return await api(request, env, url.pathname.split("/").slice(2).filter(Boolean)); }
      catch (e) { return json({ error: "Server error" }, 500); }
    }
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed" }, 405);
    return pageResponse(url);
  }
};
