// PRESET: Coding in Color — Instagram posts -> family newsletter, plus anonymous retention tracking.
// Alumni updates are voluntary and consent-based; first name is optional and contact data is kept only with consent. All demo content is FAKE.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today
const ORG = { name: "Coding in Color", mission: "Coding in Color is on a mission to deliver educational resources for students who currently do not have access to computer science courses in their communities nor schools." };
const PROGRAMS = ["AI Academy: Spark", "AI Academy: Amplify", "AI Academy: Reboot", "Hackathons", "Summer Camps"];
const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : "");
const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/* ---------- small helpers for the newsletter tools (browser side; AI itself runs on the Cloudflare Worker) ---------- */
const NL = {
  async postJSON(path, body) {
    const r = await apiFetch(CONFIG.apiBase + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Request failed (" + r.status + ")");
    return j;
  },
  async caps() { try { const r = await apiFetch(CONFIG.apiBase + "/api/capabilities"); return r.ok ? await r.json() : {}; } catch (e) { return {}; } },
  bytesToB64(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); },
  // Shrink an image to max 1024px JPEG so it uploads fast
  async imageToB64(file) {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  },
  // Pull the audio out of a reel/video, keep the first 2 minutes, convert to 16 kHz mono WAV for speech-to-text
  async videoToWavB64(file) {
    const buf = await file.arrayBuffer(), ctx = new AudioContext();
    const audio = await ctx.decodeAudioData(buf); ctx.close();
    const secs = Math.min(audio.duration, 120), rate = 16000;
    const off = new OfflineAudioContext(1, Math.ceil(secs * rate), rate), src = off.createBufferSource();
    src.buffer = audio; src.connect(off.destination); src.start(0, 0, secs);
    const pcm = (await off.startRendering()).getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2)), w = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
    w(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    return NL.bytesToB64(new Uint8Array(out.buffer));
  },
  // No-AI fallback: a simple newsletter straight from the post captions
  simple(posts, period, alumni = []) {
    const hasSpotlight = alumni.length > 0;
    const sections = posts.slice(0, hasSpotlight ? 4 : 5).map(p => ({ heading: p.title || "Update", body: (p.caption || p.imageNotes || "").slice(0, 500), link: p.link || "" }));
    if (hasSpotlight) {
      const lines = alumni.slice(0, 2).map(a => {
        const story = String(a.story || "").slice(0, 400).trim();
        const sentence = (story.match(/^[\s\S]*?[.!?](?:\s|$)/) || [story])[0].trim();
        return `${a.firstName || "A former student"}: ${sentence && /[.!?]$/.test(sentence) ? sentence : sentence + "."}`;
      });
      sections.push({ heading: "Alumni spotlight", body: lines.join(" "), link: alumni.find(a => a.link)?.link || "" });
    }
    return {
      subject: `What's new at ${ORG.name}: ${period}`.slice(0, 60),
      preheader: `${posts.length} update${posts.length === 1 ? "" : "s"} from our Instagram, in one place`,
      intro: `Here's everything we shared on Instagram for ${period}, in one quick read. Thanks for being part of our community!`,
      sections,
      cta: "We'd love to see you at the next session. Bring a friend!"
    };
  },
  // Email-safe HTML (inline styles) for pasting into Gmail / Mailchimp / any email tool
  emailHTML(n) {
    const e = s => esc(s), P = "#2e7d32";
    return `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5">
<div style="display:none;max-height:0;overflow:hidden">${e(n.preheader)}</div>
<div style="background:${P};color:#fff;padding:22px 24px;border-radius:12px 12px 0 0"><div style="font-size:13px;opacity:.85">${e(ORG.name)}</div><div style="font-size:22px;font-weight:bold">${e(n.subject)}</div></div>
<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:22px 24px;border-radius:0 0 12px 12px">
<p style="font-size:16px;margin:0 0 18px">${e(n.intro)}</p>
${n.sections.map(s => `<h2 style="font-size:18px;color:${P};margin:22px 0 6px">${e(s.heading)}</h2><p style="margin:0 0 8px;font-size:15px">${e(s.body)}</p>${s.link ? `<a href="${e(s.link)}" style="color:${P};font-weight:bold;font-size:14px">See the post &rarr;</a>` : ""}`).join("\n")}
<div style="margin-top:26px;padding:16px;background:#e8f5e9;border-radius:10px;font-size:16px;font-weight:bold;color:#123524">${e(n.cta)}</div>
<p style="margin-top:24px;font-size:12px;color:#6b7280">${e(ORG.mission)}<br>You're getting this because your family is part of ${e(ORG.name)}.</p>
</div></div>`;
  },
  plainText(n) { return [n.subject, "", n.intro, "", ...n.sections.flatMap(s => [s.heading.toUpperCase(), s.body, s.link ? "See the post: " + s.link : "", ""]), n.cta, "", ORG.mission].join("\n"); },
  download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/html" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
};

async function newsletterView(el, api) {
  const caps = await NL.caps(), ai = !!caps.media;
  const posts = (await api.list("post")).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const alumni = (await api.list("update")).filter(a => a.status === "featured" && a.consentShare === true);
  const month = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
  el.innerHTML = `<h1>📰 Newsletter</h1><p class="sub">Share Coding in Color updates and consented alumni stories with families.</p>
    <details class="card" style="margin-bottom:14px"><summary style="cursor:pointer;font-weight:700;min-height:32px">➕ Add an Instagram post</summary>
      <p class="count">Paste the caption, add photos and/or a reel. ${ai ? "Workers AI can read the images and transcribe the reel." : "You can enter the image notes and transcript yourself."}</p>
      <div style="display:grid;gap:12px;max-width:760px">
        <label>Short title <input id="pTitle" placeholder="e.g. AI Academy project showcase" style="width:100%"></label>
        <div style="display:flex;gap:12px;flex-wrap:wrap"><label>Posted <input id="pDate" type="date" value="${d(0)}"></label>
          <label>Type <select id="pKind">${["event", "sign-up", "showcase", "news", "reminder"].map(k => `<option>${k}</option>`).join("")}</select></label>
          <label style="flex:1;min-width:220px">Instagram link <input id="pLink" placeholder="https://instagram.com/p/..." style="width:100%"></label></div>
        <label>Caption <textarea id="pCap" rows="4" style="width:100%" placeholder="Paste the post caption"></textarea></label>
        <div style="display:flex;gap:12px;flex-wrap:wrap"><label>Photos / flyers <input id="pImgs" type="file" accept="image/*" multiple></label><label>Reel / video <input id="pVid" type="file" accept="video/*,audio/*"></label></div>
        ${ai ? '<button class="btn" id="pRun" type="button">✨ Read images &amp; reel with AI</button>' : ""}
        <div id="pLog" class="count" aria-live="polite"></div>
        <label>From the images <textarea id="pImgNotes" rows="3" style="width:100%"></textarea></label><label>Said in the reel <textarea id="pTrans" rows="3" style="width:100%"></textarea></label>
        <div><button class="btn primary" id="pSave" type="button">Save post</button></div>
      </div>
    </details>
    <section class="card"><h2>Build this month's newsletter</h2><div class="toolbar"><label>Covers <input id="nPeriod" value="${api.esc(month)}"></label><button class="btn primary" id="nGo">${ai ? "✨ Write newsletter with AI" : "Build newsletter"}</button>${ai ? '<button class="btn" id="nSimple">Simple version (no AI)</button>' : ""}<span class="spacer"></span><a href="#/post">All posts</a><a href="#/issue">Past newsletters</a></div>
      ${posts.length ? `<table><tbody>${posts.map(p => `<tr><td style="width:38px"><input type="checkbox" data-post-id="${api.esc(p.id)}" ${p.used ? "" : "checked"} aria-label="Include ${api.esc(p.title)}"></td><td><b>${api.esc(p.title)}</b><div class="count">${api.esc(api.fmt.date(p.date))} · ${api.esc(p.kind || "")}${p.used ? " · already sent" : ""}</div></td></tr>`).join("")}</tbody></table>` : '<div class="empty">No Instagram posts yet. You can still build from featured alumni stories.</div>'}
      ${alumni.length ? `<p class="count">${alumni.length} consented featured alumni update${alumni.length === 1 ? "" : "s"} will be considered for an Alumni spotlight.</p>` : ""}
    </section><div id="nOut" style="margin-top:16px"></div>`;
  const $$ = selector => el.querySelector(selector), log = message => { $$("#pLog").textContent = message; };
  if (ai) $$("#pRun").onclick = async () => {
    const images = [...$$("#pImgs").files], video = $$("#pVid").files[0], notes = [];
    if (!images.length && !video) return api.toast("Add a photo or a reel first", true);
    $$("#pRun").disabled = true;
    try {
      for (let i = 0; i < images.length; i++) {
        log(`Reading image ${i + 1} of ${images.length}…`);
        const result = await NL.postJSON("/api/media/describe", { image: await NL.imageToB64(images[i]) });
        notes.push([result.description, result.text_in_image ? "Text in image: " + result.text_in_image : ""].filter(Boolean).join(" "));
      }
      if (notes.length) $$("#pImgNotes").value = notes.join("\n");
      if (video) {
        log("Pulling the audio out of the reel…"); const wav = await NL.videoToWavB64(video);
        log("Transcribing the reel…"); $$("#pTrans").value = (await NL.postJSON("/api/media/transcribe", { audio: wav })).text;
      }
      log("Done. Check the text below, edit anything, then save.");
    } catch (error) { log("⚠️ " + error.message + " (you can still type the notes yourself)"); }
    $$("#pRun").disabled = false;
  };
  $$("#pSave").onclick = async () => {
    const caption = $$("#pCap").value.trim(), title = $$("#pTitle").value.trim() || caption.split(/[.!?\n]/)[0].slice(0, 60);
    if (!title && !caption) return api.toast("Add a caption or a title", true);
    try {
      await api.create("post", { title: title || "Instagram post", date: $$("#pDate").value, kind: $$("#pKind").value, link: $$("#pLink").value.trim(), caption,
        imageNotes: $$("#pImgNotes").value.trim(), transcript: $$("#pTrans").value.trim(), used: false });
      api.toast("Post saved"); window.dispatchEvent(new Event("hashchange"));
    } catch (error) { log(error.message); }
  };
  const picked = () => [...el.querySelectorAll("input[data-post-id]:checked")].map(box => posts.find(post => post.id === box.dataset.postId)).filter(Boolean);
  const renderResult = async (newsletter, usedPosts, includedAlumni, madeWith) => {
    const html = NL.emailHTML(newsletter), plain = NL.plainText(newsletter);
    $$("#nOut").innerHTML = `<div class="card"><div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn primary" id="cHtml">Copy for email</button><button class="btn" id="cText">Copy plain text</button><button class="btn" id="cDl">Download .html</button><button class="btn" id="cMark">Mark posts as sent</button></div><div style="background:#f3f4f6;padding:16px;border-radius:12px">${html}</div><p class="count">Written by ${api.esc(madeWith)}. Review before sending.</p></div>`;
    await api.create("issue", { subject: newsletter.subject, period: $$("#nPeriod").value, created: d(0), posts: usedPosts.length + includedAlumni.length, madeWith, text: plain });
    $$("#cHtml").onclick = async () => { try { await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plain], { type: "text/plain" }) })]); api.toast("Copied. Paste into Gmail or Mailchimp"); } catch (error) { await navigator.clipboard.writeText(html); api.toast("Copied HTML"); } };
    $$("#cText").onclick = () => navigator.clipboard.writeText(plain).then(() => api.toast("Copied"));
    $$("#cDl").onclick = () => NL.download("newsletter-" + d(0) + ".html", `<!doctype html><meta charset="utf-8"><title>${esc(newsletter.subject)}</title><body style="background:#f3f4f6;padding:20px">${html}</body>`);
    $$("#cMark").onclick = async () => { for (const post of usedPosts) await api.update("post", post.id, { ...post, used: true }); api.toast(`${usedPosts.length} posts marked as sent`); };
  };
  const build = async useAI => {
    const selected = picked(), includedAlumni = alumni.slice(0, 2);
    if (!selected.length && !includedAlumni.length) return api.toast("Pick at least one post or feature an alumni update", true);
    const usedPosts = selected.slice(0, Math.max(0, 12 - includedAlumni.length));
    if (!useAI) return renderResult(NL.simple(usedPosts, $$("#nPeriod").value, includedAlumni), usedPosts, includedAlumni, "simple template");
    $$("#nOut").innerHTML = '<div class="card"><p class="count">✨ Workers AI is reading the posts and writing your newsletter…</p></div>';
    try {
      const alumniPosts = includedAlumni.map(person => ({ date: person.submittedAt || "", caption: `Alumni spotlight: ${person.firstName || "a former student"}: ${String(person.story || "").slice(0, 400)}`, imageNotes: "", transcript: "", link: person.link || "" }));
      const instagramPosts = usedPosts.map(post => ({ date: post.date || "", caption: post.caption || post.title || "", imageNotes: post.imageNotes || "", transcript: post.transcript || "", link: post.link || "" }));
      const newsletter = await NL.postJSON("/api/newsletter", { org: ORG, period: $$("#nPeriod").value, posts: instagramPosts.concat(alumniPosts) });
      await renderResult(newsletter, usedPosts, includedAlumni, "Workers AI");
    } catch (error) { $$("#nOut").innerHTML = `<div class="card"><p style="color:var(--danger)">${api.esc(error.message)}</p><p class="count">Tip: try again, or use the simple version.</p></div>`; }
  };
  $$("#nGo").onclick = () => build(ai);
  if (ai) $$("#nSimple").onclick = () => build(false);
}

const CONFIG = {
  appName: "Coding in Color", tagline: "Developing the future digital workforce through digital skilling, computer science and artificial intelligence education in Arizona", logo: "🎨",
  theme: "ocean", customTheme: { "--primary": "#2e7d32", "--side": "#123524", "--side-text": "#d1fae5" },
  currency: "$", storage: "auto", apiBase: "", navEntities: ["update", "session"], navOrder: ["dashboard", "update", "x/newsletter", "session"],

  entities: {
    post: {
      label: "Instagram posts", singular: "Post", icon: "📸", titleField: "title",
      fields: [
        { key: "title", label: "Short title", type: "text", required: true, placeholder: "e.g. Spring sign-ups open" },
        { key: "date", label: "Posted", type: "date", default: d(0) },
        { key: "kind", label: "Type", type: "select", options: ["event", "sign-up", "showcase", "news", "reminder"], badge: true, default: "news" },
        { key: "link", label: "Instagram link", type: "text", placeholder: "https://instagram.com/p/...", hideInTable: true },
        { key: "caption", label: "Caption", type: "textarea" },
        { key: "imageNotes", label: "From the images (AI)", type: "textarea", hideInTable: true },
        { key: "transcript", label: "Said in the reel (AI)", type: "textarea", hideInTable: true },
        { key: "used", label: "In a newsletter", type: "checkbox" }
      ],
      rowClass: r => (!r.used && r.date && r.date <= d(-14) && (r.kind === "event" || r.kind === "sign-up")) ? "flag-warn" : "",
      attentionReason: () => "event/sign-up post from 2+ weeks ago that never went out in a newsletter",
      summary: [
        { label: "Posts waiting", fn: "countIf", test: r => !r.used, hint: "not in a newsletter yet" }
      ],
      charts: [{ title: "Posts by type", type: "doughnut", groupBy: "kind" }],
      seed: [
        { title: "Spark spring cohort sign-ups open", date: d(-3), kind: "sign-up", link: "https://instagram.com/p/demo1", caption: "AI Academy: Spark spring cohort sign-ups are OPEN for high school students! Free, hands-on AI projects, no experience needed. Link in bio to register. Spots are limited!", imageNotes: "A green flyer for AI Academy: Spark. Text in image: SPRING COHORT · HIGH SCHOOL · FREE · SIGN UP NOW", transcript: "", used: false },
        { title: "Hackathon showcase recap", date: d(-6), kind: "showcase", link: "https://instagram.com/p/demo2", caption: "So proud of our student hackers! Teams built apps and games in one day and presented them to families. Thank you to every parent who came out!", imageNotes: "Students presenting projects on laptops to a room of families.", transcript: "We came in with an idea this morning and now we have a working app.", used: false },
        { title: "Schedule change this Saturday", date: d(-1), kind: "reminder", link: "https://instagram.com/p/demo3", caption: "Heads up: this Saturday's Spark session moves to 1-3 PM (instead of 10-12) because of the holiday weekend. Same room, same laptops!", imageNotes: "Text graphic. Text in image: SATURDAY SESSION MOVED · 1-3 PM", transcript: "", used: false },
        { title: "Winter hackathon: register your team", date: d(-17), kind: "event", link: "https://instagram.com/p/demo4", caption: "Our winter student hackathon is coming! Build a game or app with a team and meet mentors from Arizona tech companies. Registration link in bio.", imageNotes: "Flyer with a laptop and code brackets. Text in image: WINTER HACKATHON · STUDENTS · REGISTER IN BIO", transcript: "", used: false },
        { title: "AI Academy: Reboot for parents", date: d(-24), kind: "news", link: "https://instagram.com/p/demo5", caption: "Parents and guardians: AI Academy: Reboot is a free virtual program with weekly live sessions on computer, AI and everyday digital skills.", imageNotes: "", transcript: "", used: true }
      ]
    },
    session: {
      label: "Sessions", singular: "Session", icon: "🗓️", titleField: "program",
      fields: [
        { key: "date", label: "Date", type: "date", default: d(0), required: true },
        { key: "program", label: "Program", type: "select", options: PROGRAMS, badge: true, default: PROGRAMS[0] },
        { key: "headcount", label: "Students (count only)", type: "number", min: 0, default: 0, required: true },
        { key: "returning", label: "Of those, came last time", type: "number", min: 0, default: 0 },
        { key: "returnRate", label: "Returning %", type: "computed", format: "number", compute: r => pct(r.returning, r.headcount) },
        { key: "families", label: "Families/parents present", type: "number", min: 0, default: 0 },
        { key: "notes", label: "Notes (no names)", type: "textarea", hideInTable: true }
      ],
      rowClass: r => { const p = pct(r.returning, r.headcount); return p === "" ? "" : p < 50 ? "flag-bad" : p < 70 ? "flag-warn" : ""; },
      attentionReason: r => `${fmt.date(r.date)}: only ${pct(r.returning, r.headcount)}% came back from the previous session`,
      summary: [
        { label: "Avg students / session", fn: "custom", compute: rows => Math.round(avg(rows.map(r => Number(r.headcount) || 0))), hint: "headcounts only, no names stored" },
        { label: "Returning %", fn: "custom", compute: rows => { const h = rows.reduce((s, r) => s + Number(r.headcount || 0), 0); return pct(rows.reduce((s, r) => s + Number(r.returning || 0), 0), h) || 0; }, hint: "students who also came last time" },
        { label: "Family visits", fn: "sum", field: "families", hint: "parents & guardians at sessions" }
      ],
      charts: [{ title: "Sessions logged by program", type: "bar", groupBy: "program" }],
      seed: [
        { date: d(-28), program: "AI Academy: Spark", headcount: 24, returning: 19, families: 6 },
        { date: d(-21), program: "AI Academy: Spark", headcount: 21, returning: 16, families: 4 },
        { date: d(-14), program: "AI Academy: Spark", headcount: 17, returning: 13, families: 3 },
        { date: d(-7), program: "AI Academy: Spark", headcount: 15, returning: 7, families: 2, notes: "Lower turnout; the schedule change was only posted on Instagram." },
        { date: d(-25), program: "AI Academy: Reboot", headcount: 12, returning: 11, families: 5 },
        { date: d(-18), program: "AI Academy: Reboot", headcount: 12, returning: 11, families: 4 },
        { date: d(-11), program: "Hackathons", headcount: 13, returning: 12, families: 6, notes: "Demo data: family members joined the project showcase." },
        { date: d(-20), program: "Hackathons", headcount: 9, returning: 6, families: 1 },
                { date: d(-6), program: "Hackathons", headcount: 16, returning: 13, families: 9 }
      ]
    },
    update: {
      label: "Alumni updates", singular: "Alumni update", icon: "🎓", titleField: "firstName", titleFallback: "(anonymous)",
      fields: [
        { key: "firstName", label: "First name", type: "text" },
        { key: "programs", label: "Programs attended", type: "text" },
        { key: "yearsAttended", label: "Years attended", type: "text" },
        { key: "gradYear", label: "Graduation year", type: "text" },
        { key: "nowDoing", label: "What they are doing now", type: "select", options: ["high school", "college / university", "community college", "trade or bootcamp", "internship", "working in tech", "working (other field)", "building my own project", "other"] },
        { key: "field", label: "Field", type: "text" },
        { key: "school", label: "School or organization", type: "text" },
        { key: "story", label: "Story", type: "textarea", hideInTable: true },
        { key: "link", label: "Link", type: "text" },
        { key: "proudOf", label: "Something they are proud of", type: "textarea" },
        { key: "imageNotes", label: "Photo description", type: "textarea", hideInTable: true },
        { key: "status", label: "Status", type: "select", options: ["new", "reviewed", "featured", "hidden"], badge: true, default: "new" },
        { key: "consentShare", label: "Share consent", type: "checkbox" },
        { key: "canFeature", label: "Can feature", type: "computed", compute: r => r.consentShare ? "yes" : "no" },
        { key: "consentContact", label: "Contact consent", type: "checkbox" },
        { key: "contact", label: "Contact (consent only)", type: "text", hideInTable: true },
        { key: "submittedAt", label: "Submitted", type: "text" }
      ],
      rowClass: r => r.status === "new" ? "flag-warn" : "",
      attentionReason: () => "new alumni update to review",
      aiActions: [{ id: "spotlight", label: "✨ Spotlight blurb" }],
      summary: [
        { label: "Alumni updates", fn: "count" },
        { label: "% in college or working", fn: "custom", format: "percent", hint: "college, internships and work", compute: rows => { const active = rows.filter(r => ["college / university", "community college", "internship", "working in tech", "working (other field)"].includes(r.nowDoing)).length; return rows.length ? active / rows.length * 100 : 0; } },
        { label: "% in tech/CS", fn: "custom", format: "percent", hint: "tech work or a computer-related field of study", compute: rows => { const active = rows.filter(r => r.nowDoing === "working in tech" || /computer science|software|information technology|\bIT\b|artificial intelligence|data science/i.test(r.field || "")).length; return rows.length ? active / rows.length * 100 : 0; } },
        { label: "New to review", fn: "countIf", test: r => r.status === "new" }
      ],
      charts: [{ title: "Where alumni are now", type: "doughnut", groupBy: "nowDoing" }, { title: "Updates by program", type: "bar", groupBy: "programs", splitComma: true }],
      seed: [
        { firstName: "Alex", programs: "AI Academy: Spark", yearsAttended: "2022-2023", gradYear: "2025", nowDoing: "college / university", field: "Computer Science", school: "Arizona State University", story: "Studying computer science at Arizona State University and gaining confidence by building projects.", link: "", proudOf: "Starting a computer science degree", imageNotes: "", status: "featured", consentShare: true, consentContact: false, submittedAt: new Date(d(-30) + "T12:00:00.000Z").toISOString() },
        { firstName: "Sam", programs: "Hackathons, AI Academy: Spark", yearsAttended: "2023-2024", gradYear: "2024", nowDoing: "community college", field: "Information Technology", school: "Maricopa Community Colleges", story: "Taking information technology classes at a Maricopa community college and practicing with small projects.", link: "", proudOf: "Keeping up with college coursework", imageNotes: "", status: "new", consentShare: false, consentContact: false, submittedAt: new Date(d(-25) + "T12:00:00.000Z").toISOString() },
        { firstName: "Jordan", programs: "Summer Camps", yearsAttended: "2021-2022", gradYear: "2023", nowDoing: "internship", field: "Software development", school: "Phoenix technology company", story: "Completed an internship with a Phoenix technology company and learned how a software team works together.", link: "", proudOf: "Contributing to a team project", imageNotes: "", status: "reviewed", consentShare: false, consentContact: false, submittedAt: new Date(d(-22) + "T12:00:00.000Z").toISOString() },
        { firstName: "Kai", programs: "Hackathons", yearsAttended: "2023-2024", gradYear: "", nowDoing: "building my own project", field: "Web development", school: "", story: "Building an app that helps neighbors share useful resources and learning more each time it changes.", link: "", proudOf: "Turning an idea into a working demo", imageNotes: "", status: "featured", consentShare: true, consentContact: false, submittedAt: new Date(d(-18) + "T12:00:00.000Z").toISOString() },
        { firstName: "Maya", programs: "AI Academy: Spark, Hackathons", yearsAttended: "2024-2025", gradYear: "2027", nowDoing: "high school", field: "", school: "", story: "Still in high school and working with a team on projects for student hackathons.", link: "", proudOf: "Presenting a project with my team", imageNotes: "", status: "new", consentShare: false, consentContact: false, submittedAt: new Date(d(-14) + "T12:00:00.000Z").toISOString() },
        { firstName: "Riley", programs: "AI Academy: Reboot", yearsAttended: "2022-2023", gradYear: "2022", nowDoing: "trade or bootcamp", field: "IT support", school: "", story: "Exploring a technical training path and using digital skills in hands-on practice.", link: "", proudOf: "Sticking with a new learning goal", imageNotes: "", status: "hidden", consentShare: false, consentContact: false, submittedAt: new Date(d(-10) + "T12:00:00.000Z").toISOString() },
        { firstName: "", programs: "AI Academy: Amplify", yearsAttended: "2021-2022", gradYear: "2021", nowDoing: "working in tech", field: "Information technology", school: "", story: "Working in technology and using problem-solving skills to support community projects.", link: "", proudOf: "Helping a team solve a tricky problem", imageNotes: "", status: "new", consentShare: true, consentContact: false, submittedAt: new Date(d(-5) + "T12:00:00.000Z").toISOString() },
        { firstName: "Devin", programs: "Summer Camps, Hackathons", yearsAttended: "2022-2023", gradYear: "2024", nowDoing: "working (other field)", field: "", school: "", story: "Working in a new field and keeping a personal coding project moving in free time.", link: "", proudOf: "Making time to keep learning", imageNotes: "", status: "featured", consentShare: true, consentContact: true, contact: "", submittedAt: new Date(d(-2) + "T12:00:00.000Z").toISOString() }
      ]
    },
    issue: {
      label: "Newsletters", singular: "Newsletter", icon: "📰", titleField: "subject",
      fields: [
        { key: "subject", label: "Subject", type: "text", required: true },
        { key: "period", label: "Covers", type: "text" },
        { key: "created", label: "Created", type: "date", default: d(0) },
        { key: "posts", label: "Posts included", type: "number", min: 0 },
        { key: "madeWith", label: "Written by", type: "select", options: ["Workers AI", "simple template"], badge: true },
        { key: "text", label: "Plain-text version", type: "textarea", hideInTable: true }
      ],
      summary: [{ label: "Newsletters made", fn: "count" }],
      seed: []
    }
  },

  extraViews: [{ id: "newsletter", label: "Newsletter", icon: "📰", render: newsletterView }]
};
