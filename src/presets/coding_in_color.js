// PRESET: Coding in Color — Instagram posts -> family newsletter, plus anonymous retention tracking.
// No student names or personal data are stored anywhere (the org can't keep student data). All demo content is FAKE.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today
const ORG = { name: "Coding in Color", mission: "Coding in Color is on a mission to deliver educational resources for students who currently do not have access to computer science courses in their communities nor schools." };
const PROGRAMS = ["AI Academy: Spark", "AI Academy: Amplify", "AI Academy: Reboot", "Hackathons", "Summer Camps"];
const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : "");
const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/* ---------- small helpers for the newsletter tools (browser side; AI itself runs on the Cloudflare Worker) ---------- */
const NL = {
  async postJSON(path, body) {
    const r = await fetch(CONFIG.apiBase + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Request failed (" + r.status + ")");
    return j;
  },
  async caps() { try { const r = await fetch(CONFIG.apiBase + "/api/capabilities"); return r.ok ? await r.json() : {}; } catch (e) { return {}; } },
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
  simple(posts, period) {
    return {
      subject: `What's new at ${ORG.name}: ${period}`.slice(0, 60),
      preheader: `${posts.length} update${posts.length === 1 ? "" : "s"} from our Instagram, in one place`,
      intro: `Here's everything we shared on Instagram for ${period}, in one quick read. Thanks for being part of our community!`,
      sections: posts.slice(0, 5).map(p => ({ heading: p.title || "Update", body: (p.caption || p.imageNotes || "").slice(0, 500), link: p.link || "" })),
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

const CONFIG = {
  appName: "Coding in Color", tagline: "Talent is everywhere. Accessibility isn't.", logo: "🎨",
  theme: "ocean", customTheme: { "--primary": "#2e7d32", "--side": "#123524", "--side-text": "#d1fae5" },
  currency: "$", storage: "auto", apiBase: "",

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

  extraViews: [
    {
      id: "addpost", label: "Add IG post", icon: "➕",
      async render(el, api) {
        const caps = await NL.caps(), ai = !!caps.media;
        el.innerHTML = `<h1>➕ Add an Instagram post</h1>
          <p class="sub">Paste the caption, drop in the photos and/or the reel. ${ai ? "Cloudflare Workers AI reads the text in the images, describes them, and transcribes the reel." : "AI extraction runs on the live site (Cloudflare Workers AI). Here you can still type notes yourself."}</p>
          <div class="card" style="display:grid;gap:12px;max-width:760px">
            <label>Short title <input id="pTitle" placeholder="e.g. Spring sign-ups open" style="width:100%"></label>
            <div style="display:flex;gap:12px;flex-wrap:wrap"><label>Posted <input id="pDate" type="date" value="${d(0)}"></label>
              <label>Type <select id="pKind">${["event", "sign-up", "showcase", "news", "reminder"].map(k => `<option>${k}</option>`).join("")}</select></label>
              <label style="flex:1;min-width:220px">Instagram link <input id="pLink" placeholder="https://instagram.com/p/..." style="width:100%"></label></div>
            <label>Caption <textarea id="pCap" rows="4" style="width:100%" placeholder="Paste the post caption"></textarea></label>
            <div style="display:flex;gap:12px;flex-wrap:wrap"><label>Photos / flyers <input id="pImgs" type="file" accept="image/*" multiple></label>
              <label>Reel / video <input id="pVid" type="file" accept="video/*,audio/*"></label></div>
            ${ai ? '<button class="btn" id="pRun">✨ Read images &amp; reel with AI</button>' : ""}
            <div id="pLog" class="count"></div>
            <label>From the images <textarea id="pImgNotes" rows="3" style="width:100%"></textarea></label>
            <label>Said in the reel <textarea id="pTrans" rows="3" style="width:100%"></textarea></label>
            <div><button class="btn primary" id="pSave">Save post</button></div>
          </div>`;
        const $$ = s => el.querySelector(s), log = m => { $$("#pLog").textContent = m; };
        if (ai) $$("#pRun").onclick = async () => {
          const imgs = [...$$("#pImgs").files], vid = $$("#pVid").files[0], notes = [];
          if (!imgs.length && !vid) return api.toast("Add a photo or a reel first", true);
          $$("#pRun").disabled = true;
          try {
            for (let i = 0; i < imgs.length; i++) {
              log(`Reading image ${i + 1} of ${imgs.length}…`);
              const r = await NL.postJSON("/api/media/describe", { image: await NL.imageToB64(imgs[i]) });
              notes.push([r.description, r.text_in_image ? "Text in image: " + r.text_in_image : ""].filter(Boolean).join(" "));
            }
            if (notes.length) $$("#pImgNotes").value = notes.join("\n");
            if (vid) {
              log("Pulling the audio out of the reel…"); const wav = await NL.videoToWavB64(vid);
              log("Transcribing the reel…"); $$("#pTrans").value = (await NL.postJSON("/api/media/transcribe", { audio: wav })).text;
            }
            log("Done. Check the text below, edit anything, then save.");
          } catch (e) { log("⚠️ " + e.message + " (you can still type the notes yourself)"); }
          $$("#pRun").disabled = false;
        };
        $$("#pSave").onclick = async () => {
          const cap = $$("#pCap").value.trim(), title = $$("#pTitle").value.trim() || cap.split(/[.!?\n]/)[0].slice(0, 60);
          if (!title && !cap) return api.toast("Add a caption or a title", true);
          await api.create("post", { title: title || "Instagram post", date: $$("#pDate").value, kind: $$("#pKind").value, link: $$("#pLink").value.trim(),
            caption: cap, imageNotes: $$("#pImgNotes").value.trim(), transcript: $$("#pTrans").value.trim(), used: false });
          api.toast("Post saved"); location.hash = "#/x/newsletter";
        };
      }
    },
    {
      id: "newsletter", label: "Newsletter", icon: "📰",
      async render(el, api) {
        const caps = await NL.caps(), ai = !!caps.media;
        const posts = (await api.list("post")).sort((a, b) => String(b.date).localeCompare(String(a.date)));
        const month = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
        el.innerHTML = `<h1>📰 Build this month's newsletter</h1>
          <p class="sub">Families miss Instagram posts. Pick the posts, and ${ai ? "Workers AI" : "the template"} turns them into one email they'll actually read.</p>
          <div class="card"><div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:10px"><label>Covers <input id="nPeriod" value="${api.esc(month)}"></label>
            <button class="btn primary" id="nGo">${ai ? "✨ Write newsletter with AI" : "Build newsletter"}</button>${ai ? '<button class="btn" id="nSimple">Simple version (no AI)</button>' : ""}</div>
            ${posts.length ? `<table><tbody>${posts.map(p => `<tr><td style="width:30px"><input type="checkbox" data-id="${api.esc(p.id)}" ${p.used ? "" : "checked"}></td><td><b>${api.esc(p.title)}</b><div class="count">${api.esc(api.fmt.date(p.date))} · ${api.esc(p.kind || "")}${p.used ? " · already sent" : ""}</div></td></tr>`).join("")}</tbody></table>` : '<div class="empty">No posts yet. Add one first.</div>'}</div>
          <div id="nOut" style="margin-top:16px"></div>`;
        const $$ = s => el.querySelector(s);
        const picked = () => [...el.querySelectorAll("input[data-id]:checked")].map(b => posts.find(p => p.id === b.dataset.id)).filter(Boolean);
        const show = async (n, chosen, madeWith) => {
          const html = NL.emailHTML(n), text = NL.plainText(n);
          $$("#nOut").innerHTML = `<div class="card"><div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            <button class="btn primary" id="cHtml">Copy for email</button><button class="btn" id="cText">Copy plain text</button><button class="btn" id="cDl">Download .html</button><button class="btn" id="cMark">Mark posts as sent</button></div>
            <div style="background:#f3f4f6;padding:16px;border-radius:12px">${html}</div><p class="count">Written by ${api.esc(madeWith)}. Review before sending.</p></div>`;
          await api.create("issue", { subject: n.subject, period: $$("#nPeriod").value, created: d(0), posts: chosen.length, madeWith, text });
          $$("#cHtml").onclick = async () => { try { await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]); api.toast("Copied. Paste into Gmail or Mailchimp"); } catch (e) { await navigator.clipboard.writeText(html); api.toast("Copied HTML"); } };
          $$("#cText").onclick = () => navigator.clipboard.writeText(text).then(() => api.toast("Copied"));
          $$("#cDl").onclick = () => NL.download("newsletter-" + d(0) + ".html", `<!doctype html><meta charset="utf-8"><title>${esc(n.subject)}</title><body style="background:#f3f4f6;padding:20px">${html}</body>`);
          $$("#cMark").onclick = async () => { for (const p of chosen) await api.update("post", p.id, { ...p, used: true }); api.toast(`${chosen.length} posts marked as sent`); };
        };
        const build = async useAI => {
          const chosen = picked(); if (!chosen.length) return api.toast("Pick at least one post", true);
          if (!useAI) return show(NL.simple(chosen, $$("#nPeriod").value), chosen, "simple template");
          $$("#nOut").innerHTML = '<div class="card"><p class="count">✨ Workers AI is reading the posts and writing your newsletter…</p></div>';
          try {
            const n = await NL.postJSON("/api/newsletter", { org: ORG, period: $$("#nPeriod").value,
              posts: chosen.slice(0, 12).map(p => ({ date: p.date || "", caption: p.caption || p.title || "", imageNotes: p.imageNotes || "", transcript: p.transcript || "", link: p.link || "" })) });
            show(n, chosen, "Workers AI");
          } catch (e) { $$("#nOut").innerHTML = `<div class="card"><p style="color:var(--danger)">${api.esc(e.message)}</p><p class="count">Tip: try again, or use the simple version.</p></div>`; }
        };
        if (posts.length) { $$("#nGo").onclick = () => build(ai); if (ai) $$("#nSimple").onclick = () => build(false); }
      }
    }
  ]
};
