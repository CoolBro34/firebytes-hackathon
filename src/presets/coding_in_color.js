// PRESET: Coding in Color — Instagram posts -> family newsletter, plus anonymous retention tracking.
// Alumni updates are voluntary and consent-based; first name is optional and contact data is kept only with consent. All demo content is FAKE.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today
// Organization copy is passed into AI drafts and shown in newsletter footers.
const ORG = { name: "Coding in Color", mission: "Coding in Color is on a mission to deliver educational resources for students who currently do not have access to computer science courses in their communities nor schools." };
// This list keeps session choices aligned with the nonprofit's current program names.
const PROGRAMS = ["AI Academy: Spark", "AI Academy: Amplify", "AI Academy: Reboot", "Hackathons", "Summer Camps"];
const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : "");
const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Pure selection and label formatting, also used by the dependency-free gallery tests.
function alumniWallItems(updates) {
  const rows = Array.isArray(updates) ? updates : [];
  const shared = rows.filter(row => row && row.consentShare === true);
  const newest = (a, b) => (Date.parse(b.submittedAt || "") || 0) - (Date.parse(a.submittedAt || "") || 0);
  const approved = shared.filter(row => row.status === "featured" || row.status === "reviewed").slice().sort(newest);
  const selected = approved.slice(0, 12);
  if (selected.length < 3) {
    const newUpdates = shared.filter(row => row.status === "new").slice().sort(newest);
    selected.push(...newUpdates.slice(0, 3 - selected.length));
  }
  return selected.map(row => {
    const firstName = String(row.firstName || "").trim().split(/\s+/)[0];
    const programs = Array.isArray(row.programs) ? row.programs.join(", ") : String(row.programs || "");
    const firstProgram = programs.split(",")[0].trim();
    return {
      firstName,
      nowDoing: String(row.nowDoing || ""),
      field: String(row.field || ""),
      school: String(row.school || ""),
      story: String(row.story || ""),
      programs,
      submittedAt: String(row.submittedAt || ""),
      label: `${firstName || "Alum"} · ${firstProgram || "Program"}`
    };
  });
}

// Lazy OGL gallery. All card art is drawn from consented text in memory; no photo is uploaded or saved.
const GALLERY = {
  create(container, options) {
    let destroyed = false, renderer = null, raf = 0, observer = null, activeCanvas = null;
    const listeners = [];
    const add = (target, type, fn, config) => {
      target.addEventListener(type, fn, config);
      listeners.push([target, type, fn, config]);
    };
    const stopWebGL = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (observer) observer.disconnect();
      observer = null;
      while (listeners.length) {
        const [target, type, fn, config] = listeners.pop();
        target.removeEventListener(type, fn, config);
      }
      if (renderer) {
        try { renderer.gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch (e) { }
        renderer = null;
      }
      if (activeCanvas) activeCanvas.remove();
      activeCanvas = null;
    };
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      stopWebGL();
      container.replaceChildren();
    };
    const screenReaderList = cards => {
      const list = document.createElement("ul");
      list.className = "cic-gallery-sr-only";
      list.setAttribute("aria-label", "Consented alumni stories");
      cards.forEach(card => {
        const item = document.createElement("li");
        item.textContent = `${card.label}. ${card.firstName || "A Coding in Color alum"}. ${card.nowDoing}. ${[card.field, card.school].filter(Boolean).join(" · ")}. Programs: ${card.programs}. ${card.story.slice(0, 110)}`;
        list.appendChild(item);
      });
      return list;
    };
    const drawCards = cards => cards.map((card, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 800; canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable");
      ctx.fillStyle = index % 2 ? "#0A8F27" : "#000000";
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = "#ffffff";
      ctx.font = "500 30px Poppins, Arial, sans-serif";
      ctx.fillText("‹ IN ›", 54, 64);
      ctx.font = "500 22px Poppins, Arial, sans-serif";
      ctx.fillText(card.firstName || "A Coding in Color alum", 54, 124, 680);
      ctx.font = "500 54px Archivo, Poppins, Arial, sans-serif";
      const headline = card.nowDoing ? card.nowDoing.charAt(0).toUpperCase() + card.nowDoing.slice(1) : "Alumni story";
      wrapCanvasText(ctx, headline, 54, 215, 690, 66, 2);
      ctx.font = "300 24px Poppins, Arial, sans-serif";
      const schoolLine = [card.field, card.school].filter(Boolean).join(" · ");
      if (schoolLine) wrapCanvasText(ctx, schoolLine, 54, 335, 690, 34, 1);
      let chipX = 54, chipY = schoolLine ? 374 : 350;
      ctx.font = "400 18px Poppins, Arial, sans-serif";
      card.programs.split(",").map(value => value.trim()).filter(Boolean).slice(0, 6).forEach(program => {
        const width = Math.min(660, ctx.measureText(program).width + 24);
        if (chipX + width > 746) { chipX = 54; chipY += 42; }
        ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.strokeRect(chipX, chipY, width, 34);
        ctx.fillStyle = "#ffffff"; ctx.fillText(program, chipX + 12, chipY + 23, width - 20);
        chipX += width + 10;
      });
      ctx.font = "300 22px Poppins, Arial, sans-serif";
      wrapCanvasText(ctx, excerpt(card.story), 54, 490, 690, 32, 2);
      return { ...card, canvas, image: canvas.toDataURL("image/png"), artAlt: `${card.firstName || "A Coding in Color alum"}: ${headline}. ${schoolLine}. ${card.programs}. ${excerpt(card.story)}` };
    });
    const renderStatic = cards => {
      if (destroyed) return;
      stopWebGL();
      container.classList.add("cic-wall-static");
      container.setAttribute("aria-label", "Consented alumni stories");
      const row = document.createElement("div"); row.className = "cic-wall-row";
      cards.forEach(card => {
        const figure = document.createElement("figure"); figure.className = "cic-wall-figure";
        const image = document.createElement("img"); image.src = card.image; image.alt = card.artAlt;
        const caption = document.createElement("figcaption"); caption.textContent = card.label;
        figure.append(image, caption); row.appendChild(figure);
      });
      container.replaceChildren(row, screenReaderList(cards));
    };
    const renderEmpty = () => {
      if (destroyed) return;
      const message = document.createElement("p");
      message.className = "cic-wall-empty";
      message.textContent = "No consented alumni stories yet. Share the student page link to collect some. ";
      const link = document.createElement("a"); link.href = "/"; link.textContent = "Student share page";
      message.appendChild(link); container.replaceChildren(message);
    };
    const startWebGL = async (cards, ogl) => {
      const { Renderer, Camera, Transform, Plane, Program, Mesh, Texture, Vec2 } = ogl;
      if (typeof ResizeObserver === "undefined") throw new Error("ResizeObserver is unavailable");
      const images = await Promise.all(cards.map(card => new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = card.image;
      })));
      if (destroyed) return;
      const height = Math.max(1, container.clientHeight);
      renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
      const gl = renderer.gl;
      activeCanvas = gl.canvas;
      activeCanvas.setAttribute("aria-hidden", "true");
      activeCanvas.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;";
      const srList = screenReaderList(cards);
      container.replaceChildren(activeCanvas, srList);
      const camera = new Camera(gl, { fov: 45, near: 0.1, far: 100 });
      camera.position.z = 20;
      const scene = new Transform();
      const geometry = new Plane(gl, { widthSegments: 20, heightSegments: 10 });
      const vertex = `precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform float uTime; uniform float uSpeed; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.z=(sin(p.x*4.0+uTime)*1.5+cos(p.y*2.0+uTime)*1.5)*(0.1+uSpeed*0.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
      const fragment = `precision highp float; uniform vec2 uImageSizes; uniform vec2 uPlaneSizes; uniform sampler2D tMap; uniform float uBorderRadius; varying vec2 vUv; float roundedBoxSDF(vec2 p,vec2 b,float r){vec2 d=abs(p)-b;return length(max(d,vec2(0.0)))+min(max(d.x,d.y),0.0)-r;} void main(){vec2 ratio=vec2(min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.0),min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.0));vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5,vUv.y*ratio.y+(1.0-ratio.y)*0.5);vec4 color=texture2D(tMap,uv);float d=roundedBoxSDF(vUv-0.5,vec2(0.5-uBorderRadius),uBorderRadius);float alpha=1.0-smoothstep(-0.002,0.002,d);gl_FragColor=vec4(color.rgb,alpha);}`;
      const titleFragment = `precision highp float; uniform sampler2D tMap; varying vec2 vUv; void main(){vec4 color=texture2D(tMap,vUv);if(color.a<0.1)discard;gl_FragColor=color;}`;
      const unit = (2 * camera.position.z * Math.tan(Math.PI / 8)) / height;
      const cardHeight = height * 0.62, cardWidth = cardHeight * 4 / 3, titleHeight = 34, spacing = cardWidth + height * 0.09;
      const radius = (height * height + options.bend * options.bend) / (2 * options.bend);
      const entries = cards.map((card, index) => {
        const texture = new Texture(gl); texture.image = images[index]; texture.needsUpdate = true;
        const program = new Program(gl, { vertex, fragment, transparent: true, depthTest: false, depthWrite: false, uniforms: {
          tMap: { value: texture }, uImageSizes: { value: new Vec2(800, 600) }, uPlaneSizes: { value: new Vec2(cardWidth, cardHeight) },
          uBorderRadius: { value: options.borderRadius }, uTime: { value: Math.random() * 100 }, uSpeed: { value: 0 }
        } });
        const mesh = new Mesh(gl, { geometry, program }); mesh.setParent(scene);
        const titleCanvas = document.createElement("canvas"); titleCanvas.width = 800; titleCanvas.height = 100;
        const ctx = titleCanvas.getContext("2d"); ctx.clearRect(0, 0, 800, 100); ctx.fillStyle = options.textColor;
        let fontSize = 28; ctx.textAlign = "center";
        do { ctx.font = fontSize === 28 ? options.font : `500 ${fontSize}px Poppins, Arial, sans-serif`; fontSize--; } while (ctx.measureText(card.label).width > 750 && fontSize > 17);
        ctx.fillText(card.label, 400, 64, 760);
        const titleTexture = new Texture(gl); titleTexture.image = titleCanvas; titleTexture.needsUpdate = true;
        const titleProgram = new Program(gl, { vertex: `precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, fragment: titleFragment, transparent: true, depthTest: false, depthWrite: false, uniforms: { tMap: { value: titleTexture } } });
        const title = new Mesh(gl, { geometry: new Plane(gl), program: titleProgram }); title.setParent(scene);
        return { mesh, title, index };
      });
      const scroll = { current: 0, target: 0 }, pointer = { active: false, start: 0, target: 0 };
      const setSizes = () => {
        if (!renderer) return;
        const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
        renderer.setSize(w, h); camera.perspective({ aspect: w / h });
      };
      const onWheel = event => { event.preventDefault(); scroll.target += (event.deltaY || event.deltaX) * options.scrollSpeed * 0.2; };
      const onMouseDown = event => { pointer.active = true; pointer.start = event.clientX; pointer.target = scroll.target; container.style.cursor = "grabbing"; };
      const onMouseMove = event => { if (pointer.active) scroll.target = pointer.target + (pointer.start - event.clientX) * options.scrollSpeed * 0.025; };
      const onRelease = () => { if (pointer.active) scroll.target = Math.round(scroll.target / spacing) * spacing; pointer.active = false; container.style.cursor = "grab"; };
      const onTouchStart = event => { if (event.touches.length) { pointer.active = true; pointer.start = event.touches[0].clientX; pointer.target = scroll.target; } };
      const onTouchMove = event => { if (pointer.active && event.touches.length) { event.preventDefault(); scroll.target = pointer.target + (pointer.start - event.touches[0].clientX) * options.scrollSpeed * 0.025; } };
      const onKey = event => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault(); scroll.target += (event.key === "ArrowRight" ? 1 : -1) * spacing;
        }
      };
      add(container, "wheel", onWheel, { passive: false });
      add(container, "mousedown", onMouseDown); add(container, "mousemove", onMouseMove); add(window, "mouseup", onRelease);
      add(container, "touchstart", onTouchStart, { passive: true }); add(container, "touchmove", onTouchMove, { passive: false });
      add(window, "touchend", onRelease); add(window, "touchcancel", onRelease); add(container, "keydown", onKey);
      container.style.cursor = "grab";
      setSizes(); observer = new ResizeObserver(setSizes); observer.observe(container);
      let previous = 0;
      const frame = () => {
        if (destroyed || !renderer) return;
        scroll.current += (scroll.target - scroll.current) * options.scrollEase;
        const speed = Math.min(2, Math.abs(scroll.current - previous) / Math.max(1, spacing)); previous = scroll.current;
        const total = spacing * entries.length;
        entries.forEach(entry => {
          let x = ((entry.index * spacing - scroll.current + total / 2) % total + total) % total - total / 2;
          const safeX = Math.max(-radius * 0.999, Math.min(radius * 0.999, x));
          const arc = radius - Math.sqrt(radius * radius - safeX * safeX);
          const y = -arc;
          entry.mesh.position.set(x * unit, y * unit, 0); entry.mesh.rotation.z = -Math.sign(x) * Math.asin(safeX / radius);
          entry.mesh.scale.set(cardWidth * unit, cardHeight * unit, 1);
          entry.mesh.program.uniforms.uPlaneSizes.value.set(cardWidth, cardHeight);
          entry.mesh.program.uniforms.uTime.value += 0.04;
          entry.mesh.program.uniforms.uSpeed.value = speed;
          entry.title.position.set(x * unit, (y - cardHeight / 2 - titleHeight / 2 - 8) * unit, 0.1);
          entry.title.rotation.z = entry.mesh.rotation.z;
          entry.title.scale.set(cardWidth * unit, titleHeight * unit, 1);
        });
        renderer.render({ scene, camera }); raf = requestAnimationFrame(frame);
      };
      frame();
    };
    return {
      destroy,
      mount(updates) {
        void (async () => {
          try {
            await document.fonts.ready;
            if (destroyed) return;
            const items = alumniWallItems(updates);
            if (!items.length) { renderEmpty(); return; }
            const cards = drawCards(items);
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { renderStatic(cards); return; }
            const ogl = await import("https://cdn.jsdelivr.net/npm/ogl@0.0.116/+esm");
            if (destroyed) return;
            try { await startWebGL(cards, ogl); }
            catch (error) { stopWebGL(); renderStatic(cards); }
          } catch (error) {
            if (!destroyed) {
              try { renderStatic(drawCards(alumniWallItems(updates))); }
              catch (fallbackError) { renderEmpty(); }
            }
          }
        })();
      }
    };
  }
};

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  words.forEach(word => {
    const next = line ? line + " " + word : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
    else line = next;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => {
    if (index === maxLines - 1 && lines.length > maxLines) value = value.slice(0, Math.max(0, value.length - 1)) + "…";
    ctx.fillText(value, x, y + index * lineHeight, maxWidth);
  });
}
function excerpt(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > 110 ? value.slice(0, 109).trimEnd() + "…" : value;
}

// The generic dashboard is engine-owned, so add this preset card only after its charts exist.
function watchDashboardForAlumniWall() {
  const dashboard = document.querySelector("#main");
  if (!dashboard || typeof MutationObserver === "undefined") return;
  const addWall = () => {
    const stats = dashboard.querySelector("#stats"), charts = dashboard.querySelector("#charts");
    if (!stats || !charts || !charts.children.length || dashboard.querySelector("#alumniWallCard")) return;
    const section = document.createElement("section"); section.id = "alumniWallCard"; section.className = "card"; section.style.marginBottom = "14px";
    const styles = document.createElement("style");
    styles.textContent = ".cic-wall-host{position:relative;height:420px;background:#000;overflow:hidden;border-radius:0}.cic-gallery-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.cic-wall-row{display:flex;align-items:center;gap:28px;height:100%;overflow-x:auto;padding:18px 22px;scroll-snap-type:x mandatory}.cic-wall-figure{flex:0 0 min(74vw,330px);margin:0;scroll-snap-align:center;color:#fff;text-align:center;font:500 14px Poppins,Arial,sans-serif}.cic-wall-figure img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:contain}.cic-wall-figure figcaption{padding:8px 4px 0}.cic-wall-empty{color:#fff;text-align:center;padding:80px 18px;margin:0;font:400 15px Poppins,Arial,sans-serif}.cic-wall-empty a{color:#fff;font-weight:500;text-underline-offset:3px}@media(max-width:640px){.cic-wall-host{height:300px}.cic-wall-figure{flex-basis:76vw}}";
    const heading = document.createElement("h2"); heading.textContent = "Alumni wall"; heading.style.margin = "0 0 4px";
    const subline = document.createElement("p"); subline.className = "sub"; subline.textContent = "Consented stories from former students. Drag or scroll to explore.";
    const host = document.createElement("div"); host.id = "alumniWall"; host.className = "cic-wall-host";
    host.tabIndex = 0; host.setAttribute("role", "region"); host.setAttribute("aria-label", "Alumni wall, use left and right arrow keys");
    const loading = document.createElement("p"); loading.textContent = "Loading alumni stories…"; loading.style.cssText = "color:#fff;padding:24px"; host.appendChild(loading);
    const review = document.createElement("p"); review.style.margin = "12px 0 0";
    const link = document.createElement("a"); link.href = "#/update"; link.textContent = "Review all alumni updates →"; review.appendChild(link);
    section.append(styles, heading, subline, host, review);
    dashboard.insertBefore(section, stats);
    const wall = GALLERY.create(host, { bend: 3, textColor: "#ffffff", borderRadius: 0.04, font: "500 28px Poppins, sans-serif", scrollSpeed: 2, scrollEase: 0.05 });
    window._cleanup = wall.destroy;
    Store.list("update").then(updates => wall.mount(updates)).catch(() => wall.mount([]));
  };
  const observer = new MutationObserver(addWall);
  observer.observe(dashboard, { childList: true, subtree: true });
  addWall();
}
watchDashboardForAlumniWall();

/* ---------- Newsletter helpers: format and prepare drafts in the browser; AI calls remain in the Worker. ---------- */
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
    const e = s => esc(s), P = "#0A8F27";
    return `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5">
<div style="display:none;max-height:0;overflow:hidden">${e(n.preheader)}</div>
<div style="background:${P};color:#fff;padding:22px 24px;border-radius:12px 12px 0 0"><div style="font-size:13px;opacity:.85">${e(ORG.name)}</div><div style="font-size:22px;font-weight:bold">${e(n.subject)}</div></div>
<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:22px 24px;border-radius:0 0 12px 12px">
<p style="font-size:16px;margin:0 0 18px">${e(n.intro)}</p>
${n.sections.map(s => `<h2 style="font-size:18px;color:${P};margin:22px 0 6px">${e(s.heading)}</h2><p style="margin:0 0 8px;font-size:15px">${e(s.body)}</p>${s.link ? `<a href="${e(s.link)}" style="color:${P};font-weight:bold;font-size:14px">See the post &rarr;</a>` : ""}`).join("\n")}
<div style="margin-top:26px;padding:16px;background:#F3F3F3;border-radius:0;font-size:16px;font-weight:bold;color:#0A8F27">${e(n.cta)}</div>
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
  // Shown as a "Demo data" badge on the dashboard so judges know the numbers are fictional sample data. Set to "" for real use.
  demoNotice: "All students, sessions and posts here are fictional sample data.",
  appName: "Coding in Color", tagline: "Talent is everywhere, opportunity is not.", logo: "‹IN›",
  theme: "ocean", customTheme: { "--primary": "#0A8F27", "--side": "#000000", "--side-text": "#e5e5e5" },
  currency: "$", storage: "auto", apiBase: "", navEntities: ["update", "session"], navOrder: ["dashboard", "update", "x/newsletter", "session"],

  entities: {
    // Instagram source material. Unsent older events/sign-ups are flagged for staff attention.
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
      // Risk rule: old unsent event and sign-up announcements need a follow-up.
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
    // Anonymous retention counts only; notes must not contain student names.
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
      // Retention risk rules flag return rates below 50% or 70%; counts stay anonymous.
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
    // Voluntary alumni records. New submissions are surfaced for review; feature permission requires consent.
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
      // Risk rule: all newly submitted alumni updates are queued for staff review.
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
    // Saved newsletter drafts; reached from the Newsletter extra view.
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

  // Combined newsletter workflow: add Instagram material, build drafts, and navigate to saved records.
  extraViews: [{ id: "newsletter", label: "Newsletter", icon: "📰", render: newsletterView }]
};
