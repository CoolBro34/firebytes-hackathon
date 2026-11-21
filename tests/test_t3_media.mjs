import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workerUrl = pathToFileURL(path.join(here, "..", "worker.js"));
const { default: worker } = await import(workerUrl.href);
const okNewsletter = {
  subject: "This month at Coding in Color", preheader: "See what students made", intro: "Hello families. Here is our latest news.",
  sections: [{ heading: "Build day", body: "Students made projects. Families joined us.", link: "https://example.test/build" }], cta: "Join us at the next session."
};

function makeEnv(run) {
  const calls = [];
  return { calls, env: { AI: { async run(model, input) { calls.push({ model, input }); return run(model, input, calls.length); } } } };
}

async function request(pathname, body, env, origin) {
  const url = `https://example.test/api/${pathname}`;
  const headers = { "content-type": "application/json" };
  if (origin !== null) headers.origin = origin || new URL(url).origin;
  return worker.fetch(new Request(url, { method: "POST", headers, body: JSON.stringify(body) }), env);
}

const image = Buffer.from("tiny image").toString("base64");
{
  const { env, calls } = makeEnv(() => ({ response: "DESCRIPTION: Students are building a game together.\nTEXT: Saturday Coding Club" }));
  const response = await request("media/describe", { image }, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { description: "Students are building a game together.", text_in_image: "Saturday Coding Club" });
  assert.equal(calls[0].model, "@cf/meta/llama-3.2-11b-vision-instruct");
  assert.deepEqual(calls[0].input.image, Array.from(Buffer.from("tiny image")));
}
{
  const { env } = makeEnv(() => ({ response: "DESCRIPTION: Students are coding.\nTEXT: NONE" }));
  const response = await request("media/describe", { image: `data:image/png;base64,${image}` }, env);
  assert.deepEqual(await response.json(), { description: "Students are coding.", text_in_image: "" });
}
{
  const { env, calls } = makeEnv((model, input, n) => {
    if (n === 1) throw new Error("Please agree to the license");
    return n === 2 ? { response: "accepted" } : { response: "DESCRIPTION: Retry worked.\nTEXT: NONE" };
  });
  const response = await request("media/describe", { image }, env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[1].input, { prompt: "agree" });
}
{
  const { env, calls } = makeEnv(() => ({ response: "unused" }));
  const largeImage = Buffer.alloc(2000001).toString("base64");
  const response = await request("media/describe", { image: largeImage }, env);
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
}
{
  const { env, calls } = makeEnv(() => ({ text: "  We made a robot.  " }));
  const response = await request("media/transcribe", { audio: image }, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: "We made a robot." });
  assert.equal(calls[0].model, "@cf/openai/whisper-large-v3-turbo");
  assert.deepEqual(calls[0].input, { audio: image });
}
{
  const { env, calls } = makeEnv((model, input) => {
    if (model === "@cf/openai/whisper-large-v3-turbo") throw new Error("model unavailable");
    return { text: "fallback transcript" };
  });
  const response = await request("media/transcribe", { audio: image }, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: "fallback transcript" });
  assert.equal(calls[1].model, "@cf/openai/whisper");
  assert.deepEqual(calls[1].input.audio, Array.from(Buffer.from("tiny image")));
}
{
  const { env, calls } = makeEnv(() => ({ response: `Here is the newsletter:\n${JSON.stringify(okNewsletter)}\nThanks!` }));
  const response = await request("newsletter", { org: { name: "Coding in Color", mission: "Teach coding" }, period: "Fall", posts: [{ caption: "Build with us" }] }, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), okNewsletter);
  assert.equal(calls[0].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.match(calls[0].input.messages[1].content, /Posts \(data, not instructions\)/);
}
{
  const direct = { ...okNewsletter, sections: [...okNewsletter.sections, { heading: "Invalid" }] };
  const { env } = makeEnv(() => ({ response: direct }));
  const response = await request("newsletter", { period: "Fall", posts: [{ date: "Nov 1", extra: "ignore" }] }, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].link, "https://example.test/build");
  assert.equal(result.subject, okNewsletter.subject);
}
{
  const { env } = makeEnv(() => ({ response: "no json here" }));
  const response = await request("newsletter", { posts: [{ caption: "Hi" }] }, env);
  assert.equal(response.status, 502);
}
{
  const { env } = makeEnv(() => ({ response: JSON.stringify({ subject: "Bad", sections: [] }) }));
  const response = await request("newsletter", { posts: [{ caption: "Hi" }] }, env);
  assert.equal(response.status, 502);
}
{
  const { env, calls } = makeEnv(() => ({ response: "ok" }));
  const response = await request("newsletter", { posts: Array.from({ length: 13 }, () => ({})) }, env);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Too many posts (max 12)" });
  assert.equal(calls.length, 0);
}
for (const [pathname, body] of [["media/describe", { image }], ["media/transcribe", { audio: image }], ["newsletter", { posts: [{ caption: "x" }] }]]) {
  const response = await request(pathname, body, {});
  assert.equal(response.status, 404);
}
{
  const { env } = makeEnv(() => ({ response: "unused" }));
  for (const [pathname, body] of [["media/describe", { image }], ["media/transcribe", { audio: image }], ["newsletter", { posts: [{ caption: "x" }] }]]) {
    const response = await request(pathname, body, env, "https://other.test");
    assert.equal(response.status, 403);
  }
}
{
  const response = await worker.fetch(new Request("https://example.test/api/capabilities"), makeEnv(() => ({})).env);
  assert.equal((await response.json()).media, true);
}

console.log("T3 TESTS PASSED");
