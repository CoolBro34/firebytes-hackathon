// Handles POST /api/alumni/submit and GET /api/public/programs. Depends on HTTP, KV, AI limit and image helpers.
import { json, readBody, newId } from './http.js';
import { load, save } from './storage.js';
import { aiRateLimited } from './ai.js';
import { b64ToBytes, describeImage } from './media.js';

export const ALUMNI_PROGRAMS = ["AI Academy: Spark", "AI Academy: Amplify", "AI Academy: Reboot", "Hackathons", "Summer Camps", "Other / not sure"];
/** Age confirmation choices on the student form. Minors need a parent/guardian email so staff can verify permission. */
export const ALUMNI_AGE_CONFIRM = ["adult", "minor-with-permission"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ALUMNI_NOW_DOING = ["high school", "college / university", "community college", "trade or bootcamp", "internship", "working in tech", "working (other field)", "building my own project", "other"];

/** @param {Request} request @param {object} env @returns {Promise<Response>} Stores only validated fields; the honeypot returns success to avoid signaling bots. */
export async function alumniSubmit(request, env) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "This form can only be submitted from this site." }, 403);
  const body = await readBody(request);
  if (!body) return json({ error: "Please check your form and try again." }, 400);
  if (String(body.website || "").trim()) return json({ ok: true });
  if (await aiRateLimited(request, env)) return json({ error: "Too many submissions. Please try again in a minute." }, 429);
  if (!env.DATA) return json({ error: "Submissions are unavailable right now. Please try again later." }, 503);
  const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const firstName = text(body.firstName, 40).split(/\s+/)[0];
  const yearsAttended = text(body.yearsAttended, 20);
  const gradYear = text(body.gradYear, 20);
  const nowDoing = text(body.nowDoing, 60);
  const field = text(body.field, 80), school = text(body.school, 80);
  const story = text(body.story, 1200), link = text(body.link, 300), proudOf = text(body.proudOf, 300);
  if (!Array.isArray(body.programs) || body.programs.length < 1 || body.programs.length > 6) return json({ error: "Choose 1 to 6 programs." }, 400);
  const programs = body.programs.map(p => text(p, 80));
  if (programs.some(p => !ALUMNI_PROGRAMS.includes(p))) return json({ error: "Choose programs from the list." }, 400);
  if (!ALUMNI_NOW_DOING.includes(nowDoing)) return json({ error: "Choose what you are doing now." }, 400);
  if (gradYear && !/^\d{4}$/.test(gradYear)) return json({ error: "Graduation year must be four digits." }, 400);
  if (story.length < 20) return json({ error: "Please share at least 20 characters in your story." }, 400);
  if (link && !/^https:\/\//i.test(link)) return json({ error: "A link must start with https://." }, 400);
  // Age gate: everyone confirms 18+ or parent/guardian permission; under-18s must give a parent/guardian email.
  const ageConfirm = text(body.ageConfirm, 40);
  if (!ALUMNI_AGE_CONFIRM.includes(ageConfirm)) return json({ error: "Please confirm you are 18 or older, or that a parent or guardian said it's OK." }, 400);
  const parentEmail = ageConfirm === "minor-with-permission" ? text(body.parentEmail, 120).toLowerCase() : "";
  if (ageConfirm === "minor-with-permission" && !EMAIL_RE.test(parentEmail)) return json({ error: "Please enter your parent or guardian's email address." }, 400);
  let imageNotes = "";
  if (body.image) {
    const bytes = b64ToBytes(body.image);
    if (!bytes) return json({ error: "The photo could not be read. Try another JPEG or PNG." }, 400);
    if (bytes.length > 2000000) return json({ error: "Please choose a photo under 2 MB." }, 400);
    const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!png && !jpeg) return json({ error: "Please choose a JPEG or PNG photo." }, 400);
    if (env.AI) {
      try { imageNotes = (await describeImage(env, bytes)).description; }
      catch (e) { return json({ error: "We could not read that photo. You can try again without it." }, 502); }
    }
  }
  const record = {
    id: newId(), submittedAt: new Date().toISOString(), status: "new", firstName,
    programs: [...new Set(programs)].join(", "), yearsAttended, gradYear, nowDoing,
    field, school, story, link, proudOf, imageNotes,
    consentShare: body.consentShare === true, consentContact: body.consentContact === true,
    ageConfirm, parentEmail
  };
  if (record.consentContact) record.contact = text(body.contact, 120);
  await save(env, "update", [...await load(env, "update"), record]);
  return json({ ok: true });
}
