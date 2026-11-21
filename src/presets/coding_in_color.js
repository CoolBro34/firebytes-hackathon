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

// Staff gallery includes private stories; status chips are display-only metadata.
function staffGalleryItems(updates, filter = "all") {
  const rows = Array.isArray(updates) ? updates : [];
  return rows.filter(row => row && (filter === "hidden" ? row.status === "hidden" : row.status !== "hidden" && (filter === "all" || row.status === filter)))
    .slice().sort((a, b) => (Date.parse(b.submittedAt || "") || 0) - (Date.parse(a.submittedAt || "") || 0))
    .map(row => {
      const item = alumniWallItems([row])[0] || {
        firstName: String(row.firstName || "").trim().split(/\s+/)[0], nowDoing: String(row.nowDoing || ""),
        field: String(row.field || ""), school: String(row.school || ""), story: String(row.story || ""),
        programs: Array.isArray(row.programs) ? row.programs.join(", ") : String(row.programs || ""), submittedAt: String(row.submittedAt || ""),
        label: `${String(row.firstName || "").trim().split(/\s+/)[0] || "Alum"} · ${(Array.isArray(row.programs) ? row.programs.join(", ") : String(row.programs || "")).split(",")[0].trim() || "Program"}`
      };
      item.id = row.id; item.status = row.status; item.private = row.consentShare !== true;
      item.tag = row.status === "new" ? "NEW" : row.status === "featured" ? "FEATURED" : "REVIEWED";
      item.record = row;
      return item;
    });
}

// Lazy OGL gallery. All card art is drawn from consented text in memory; no photo is uploaded or saved.
const GALLERY = {
  create(container, options) {
    let destroyed = false, renderer = null, raf = 0, observer = null, activeCanvas = null, currentCards = [], moveBy = () => {}, centeredIndex = () => 0;
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
      container.removeEventListener("keydown", galleryKey);
      container.replaceChildren();
    };
    const openCentered = () => { if (currentCards.length && options.onOpen) options.onOpen(currentCards[centeredIndex()]); };
    const galleryKey = event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); moveBy(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key === "Enter" && options.onOpen) { event.preventDefault(); openCentered(); }
    };
    container.addEventListener("keydown", galleryKey);
    const screenReaderList = cards => {
      const list = document.createElement("ul");
      list.className = "cic-gallery-sr-only";
      list.setAttribute("aria-label", options.srLabel || "Consented alumni stories");
      cards.forEach(card => {
        const item = document.createElement("li");
        item.textContent = `${card.label}. ${card.tag ? card.tag + ". " : ""}${card.private ? "Private. " : ""}${card.firstName || "A Coding in Color alum"}. ${card.nowDoing}. ${[card.field, card.school].filter(Boolean).join(" · ")}. Programs: ${card.programs}. ${card.story.slice(0, 110)}`;
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
      ctx.font = "500 30px Archivo, Poppins, Arial, sans-serif";
      const headline = card.nowDoing ? card.nowDoing.charAt(0).toUpperCase() + card.nowDoing.slice(1) : "Alumni story";
      wrapCanvasText(ctx, headline, 54, 250, 690, 70, 2);
      ctx.font = "400 21px Poppins, Arial, sans-serif";
      const firstProgram = card.programs.split(",")[0].trim();
      if (firstProgram) ctx.fillText(firstProgram, 54, 380, 690);
      ctx.font = "300 22px Poppins, Arial, sans-serif";
      wrapCanvasText(ctx, excerpt(card.story, 60), 54, 455, 690, 32, 2);
      if (card.tag || card.private) {
        ctx.font = "500 20px Poppins, Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${card.private ? "🔒 Private  " : ""}${card.tag || ""}`, 746, 64, 500);
      }
      return { ...card, canvas, image: canvas.toDataURL("image/png"), artAlt: `${card.firstName || "A Coding in Color alum"}: ${headline}. ${[card.field, card.school].filter(Boolean).join(", ") || "Coding in Color alum"}. ${card.programs}. ${excerpt(card.story)}` };
    });
    const renderStatic = cards => {
      if (destroyed) return;
      stopWebGL();
      container.classList.add("cic-wall-static");
      container.setAttribute("aria-label", options.srLabel || "Consented alumni stories");
      const row = document.createElement("div"); row.className = "cic-wall-row";
      cards.forEach(card => {
        const figure = document.createElement("figure"); figure.className = "cic-wall-figure";
        const image = document.createElement("img"); image.src = card.image; image.alt = card.artAlt;
        const caption = document.createElement("figcaption"); caption.textContent = card.label;
        figure.append(image, caption); row.appendChild(figure);
      });
      container.replaceChildren(row, screenReaderList(cards));
      const step = Math.min(container.clientWidth * 0.25, 210) + 14;
      moveBy = direction => { row.scrollBy({ left: direction * step, behavior: "smooth" }); };
      centeredIndex = () => {
        const figures = [...row.querySelectorAll("figure")];
        if (!figures.length) return 0;
        const center = row.scrollLeft + row.clientWidth / 2;
        return figures.reduce((best, figure, index) => {
          const distance = Math.abs(figure.offsetLeft + figure.offsetWidth / 2 - center);
          return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity }).index;
      };
    };
    const renderEmpty = () => {
      if (destroyed) return;
      const message = document.createElement("p");
      message.className = "cic-wall-empty";
      message.textContent = options.emptyMessage || "No consented alumni stories yet. Share the student page link to collect some. ";
      if (!options.emptyMessage) { const link = document.createElement("a"); link.href = "/"; link.textContent = "Student share page"; message.appendChild(link); }
      container.replaceChildren(message);
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
      const cardHeight = height * 0.36, cardWidth = cardHeight * 4 / 3, titleHeight = 34, spacing = cardWidth + height * 0.025;
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
      moveBy = direction => { scroll.target += direction * spacing; };
      centeredIndex = () => ((Math.round(scroll.current / spacing) % cards.length) + cards.length) % cards.length;
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
      add(container, "wheel", onWheel, { passive: false });
      add(container, "mousedown", onMouseDown); add(container, "mousemove", onMouseMove); add(window, "mouseup", onRelease);
      add(container, "touchstart", onTouchStart, { passive: true }); add(container, "touchmove", onTouchMove, { passive: false });
      add(window, "touchend", onRelease); add(window, "touchcancel", onRelease);
      container.style.cursor = "grab";
      setSizes(); observer = new ResizeObserver(setSizes); observer.observe(container);
      moveBy = direction => { scroll.target += direction * spacing; };
      centeredIndex = () => ((Math.round(scroll.current / spacing) % cards.length) + cards.length) % cards.length;
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
      openCentered,
      mount(updates) {
        void (async () => {
          try {
            await document.fonts.ready;
            if (destroyed) return;
            const items = options.items ? options.items(updates) : alumniWallItems(updates);
            currentCards = items;
            if (!items.length) { renderEmpty(); return; }
            const cards = drawCards(items);
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { renderStatic(cards); return; }
            const ogl = await import("https://cdn.jsdelivr.net/npm/ogl@0.0.116/+esm");
            if (destroyed) return;
            try { await startWebGL(cards, ogl); }
            catch (error) { stopWebGL(); renderStatic(cards); }
          } catch (error) {
            console.warn("Alumni gallery fell back:", error);
            if (!destroyed) {
              try { renderStatic(drawCards(options.items ? options.items(updates) : alumniWallItems(updates))); }
              catch (fallbackError) { console.warn("Alumni gallery fallback failed:", fallbackError); renderEmpty(); }
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
function excerpt(text, limit = 110) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? value.slice(0, limit - 1).trimEnd() + "…" : value;
}


function codingColorDashboardHero(data) {
  const updates = data.update || [], sessions = data.session || [], posts = data.post || [];
  const newest = (a, b) => (Date.parse(b.submittedAt || b.date || "") || 0) - (Date.parse(a.submittedAt || a.date || "") || 0);
  const consented = updates.filter(row => row.consentShare === true).slice().sort(newest);
  const latestStory = consented[0], waiting = posts.filter(row => !row.used), recentPost = posts.slice().sort(newest)[0];
  const newUpdates = updates.filter(row => row.status === "new");
  const active = updates.filter(row => ["college / university", "community college", "internship", "working in tech", "working (other field)"].includes(row.nowDoing));
  const alumniRate = updates.length ? Math.round(active.length / updates.length * 100) : 0;
  const heads = sessions.reduce((sum, row) => sum + Number(row.headcount || 0), 0), returning = sessions.reduce((sum, row) => sum + Number(row.returning || 0), 0);
  const returningRate = heads ? Math.round(returning / heads * 100) : 0;
  const lowSession = sessions.slice().sort((a, b) => (Number(a.headcount) ? Number(a.returning) / Number(a.headcount) : 0) - (Number(b.headcount) ? Number(b.returning) / Number(b.headcount) : 0))[0];
  const attention = [];
  for (const [name, entity] of Object.entries(CONFIG.entities)) for (const row of data[name] || []) {
    try { if (typeof entity.rowClass === "function" && ["flag-bad", "flag-warn"].includes(entity.rowClass(row))) attention.push({ title: row[entity.titleField] || entity.titleFallback || "Update" }); } catch (e) { }
  }
  const weekAgo = Date.now() - 7 * 86400000, updatesThisWeek = updates.filter(row => (Date.parse(row.submittedAt || "") || 0) >= weekAgo).length;
  const stat = (value, label) => `<div class="core-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  const satellite = (klass, href, label, title, note, target = "") => `<a class="neural-satellite ${klass}" href="${href}" ${target} aria-label="${esc(label + ": " + title)}"><div class="sat-title">${esc(label)}</div><div class="sat-value">${esc(title)}</div><div class="sat-note">${esc(note)}</div></a>`;
  return `<section class="neural-hero" aria-label="Coding in Color staff overview"><div class="neural-stage" id="neuralStage">
    <svg class="neural-lines" id="neuralLines" aria-hidden="true" focusable="false"><defs><linearGradient id="nodeGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#c9b8a0" stop-opacity=".9"/><stop offset="100%" stop-color="#a78b71" stop-opacity=".1"/></linearGradient></defs>${["alumni", "newsletter", "sessions", "attention", "student"].map(id => `<path class="node-line" data-node="${id}"/><path class="node-line flow" data-node="${id}"/>`).join("")}</svg>
    <div class="live-notice"><span class="live-pill"><i class="live-dot" aria-hidden="true"></i><b class="live-word">LIVE</b><span>${newUpdates.length} new alumni update${newUpdates.length === 1 ? "" : "s"} to review</span></span></div>
    ${satellite("sat-1", "#/update", "Alumni updates", latestStory ? `${latestStory.firstName ? String(latestStory.firstName).split(/\s+/)[0] : "Alum"} · ${latestStory.status || "shared"}` : "Your alumni stories", latestStory ? excerpt(latestStory.story, 72) : "Review voluntary stories from the community.")}
    ${satellite("sat-2", "#/x/newsletter", "Newsletter", `${waiting.length} posts waiting`, recentPost ? `Latest: ${excerpt(recentPost.title, 64)}` : "Build a family update from your posts.")}
    ${satellite("sat-3", "#/session", "Sessions", `${returningRate}% returning`, lowSession ? `Focus: ${excerpt(lowSession.program, 32)} · ${pct(lowSession.returning, lowSession.headcount) || 0}%` : "Log anonymous headcounts and return rates.")}
    ${satellite("sat-4", "#attention", "Needs attention", `${attention.length} item${attention.length === 1 ? "" : "s"}`, attention[0] ? `Next: ${excerpt(attention[0].title, 54)}` : "No items need follow-up right now.")}
    ${satellite("sat-5", "/", "Student share page", "Share your story", `${updatesThisWeek} update${updatesThisWeek === 1 ? "" : "s"} this week`, 'target="_blank" rel="noopener"')}
    <div class="neural-core" id="neuralCore" aria-label="Live overview summary"><span class="badge demo-chip" title="${esc(CONFIG.demoNotice || "Staff overview")}">Demo data</span><div class="core-label">CODING IN COLOR · LIVE OVERVIEW</div><div class="core-metrics">${stat(updates.length, "alumni updates")}${stat(alumniRate + "%", "college or working")}${stat(returningRate + "%", "returning students")}${stat(waiting.length, "posts waiting")}</div></div>
  </div><h1 class="hero-headline">Every student's <span class="gold">story</span>,<br>all in <span class="gold">one place</span>.</h1><div class="hero-ctas"><a class="cta-outline" href="#/update">Review alumni updates</a><a class="cta-solid" href="#/x/newsletter">Build the newsletter</a></div></section>`;
}

function wireDashboardNeuralLines() {
  const stage = document.querySelector("#neuralStage"), core = document.querySelector("#neuralCore"), svg = document.querySelector("#neuralLines");
  if (!stage || !core || !svg) return;
  const update = () => {
    const bounds = stage.getBoundingClientRect(), center = core.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${Math.round(bounds.width)} ${Math.round(bounds.height)}`);
    const cx = center.left + center.width / 2 - bounds.left, cy = center.top + center.height / 2 - bounds.top;
    stage.querySelectorAll(".neural-satellite").forEach(card => {
      const label = card.getAttribute("aria-label") || "", target = label.startsWith("Alumni") ? "alumni" : label.startsWith("Newsletter") ? "newsletter" : label.startsWith("Sessions") ? "sessions" : label.startsWith("Needs") ? "attention" : "student";
      const box = card.getBoundingClientRect(), x = box.left + box.width / 2 - bounds.left, y = box.top + box.height / 2 - bounds.top;
      const dx = x - cx, dy = y - cy, bend = Math.max(36, Math.min(110, Math.abs(dx) * .24));
      const d = `M ${cx} ${cy} C ${cx + (dx < 0 ? -bend : bend)} ${cy + dy * .12}, ${x - (dx < 0 ? -bend : bend)} ${y - dy * .12}, ${x} ${y}`;
      stage.querySelectorAll(`.node-line[data-node="${target}"]`).forEach(path => path.setAttribute("d", d));
    });
  };
  let frame = 0;
  const schedule = () => { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { frame = 0; update(); }); };
  const spaceToActivate = event => { if (event.key === " ") { event.preventDefault(); event.currentTarget.click(); } };
  const satellites = [...stage.querySelectorAll(".neural-satellite")];
  satellites.forEach(card => card.addEventListener("keydown", spaceToActivate));
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  if (observer) observer.observe(stage);
  window.addEventListener("resize", schedule);
  const onVisibility = () => stage.classList.toggle("is-paused", document.hidden);
  document.addEventListener("visibilitychange", onVisibility); onVisibility(); update();
  return () => { if (frame) cancelAnimationFrame(frame); observer && observer.disconnect(); satellites.forEach(card => card.removeEventListener("keydown", spaceToActivate)); window.removeEventListener("resize", schedule); document.removeEventListener("visibilitychange", onVisibility); };
}

// The generic dashboard is engine-owned, so add this preset card only after its charts exist.
function watchDashboardForAlumniWall() {
  const dashboard = document.querySelector("#main");
  if (!dashboard || typeof MutationObserver === "undefined") return;
  const addWall = () => {
    const stats = dashboard.querySelector("#stats"), charts = dashboard.querySelector("#charts");
    if (!stats || !charts || !charts.children.length || dashboard.querySelector("#alumniWallCard")) return;
    const section = document.createElement("section"); section.id = "alumniWallCard"; section.className = "card"; section.style.marginBottom = "14px";
    ensureWallCSS();
    const styles = document.createElement("style");
    styles.textContent = "";
    const heading = document.createElement("h2"); heading.textContent = "Alumni wall"; heading.style.margin = "0 0 4px";
    const subline = document.createElement("p"); subline.className = "sub"; subline.textContent = "Consented stories from former students. Drag or scroll to explore.";
    const host = document.createElement("div"); host.id = "alumniWall"; host.className = "cic-wall-host";
    host.tabIndex = 0; host.setAttribute("role", "region"); host.setAttribute("aria-label", "Alumni wall, use left and right arrow keys");
    const loading = document.createElement("p"); loading.textContent = "Loading alumni stories…"; loading.style.cssText = "color:#ddd;padding:24px"; host.appendChild(loading);
    const review = document.createElement("p"); review.style.margin = "12px 0 0";
    const link = document.createElement("a"); link.href = "#/update"; link.textContent = "Review all alumni updates →"; review.appendChild(link);
    section.append(styles, heading, subline, host, review);
    dashboard.insertBefore(section, dashboard.querySelector("#charts"));
    const wall = GALLERY.create(host, { bend: 3.5, textColor: "#f5f2ee", borderRadius: 0.08, font: "500 26px Inter, sans-serif", scrollSpeed: 2.5, scrollEase: 0.03 });
    const priorCleanup = window._cleanup;
    window._cleanup = () => { if (priorCleanup) priorCleanup(); wall.destroy(); };
    Store.list("update").then(updates => wall.mount(updates)).catch(() => wall.mount([]));
  };
  const observer = new MutationObserver(addWall);
  observer.observe(dashboard, { childList: true, subtree: true });
  addWall();
}
watchDashboardForAlumniWall();

function renderStaffAlumniGallery(name, main, api) {
  if (name !== "update") return;
  ensureWallCSS();
  const styles = document.createElement("style");
  styles.textContent = ".cic-staff-gallery{margin:0 0 18px}.cic-staff-gallery .cic-wall-host{height:60vh;min-height:360px}.cic-gallery-filters{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.cic-gallery-filters button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#eee;border-radius:12px;padding:8px 14px;cursor:pointer}.cic-gallery-filters button[aria-pressed=true]{background:#a78b71;color:#0a0a0a}.cic-open-story{margin-top:10px}@media(max-width:640px){.cic-staff-gallery .cic-wall-host{height:60vh;min-height:360px}}";
  const section = document.createElement("section"); section.className = "cic-staff-gallery";
  const pageHeading = main.querySelector("h1"); if (pageHeading) pageHeading.textContent = "Alumni updates";
  const filters = document.createElement("div"); filters.className = "cic-gallery-filters"; filters.setAttribute("role", "group"); filters.setAttribute("aria-label", "Filter alumni updates");
  const host = document.createElement("div"); host.className = "cic-wall-host"; host.tabIndex = 0; host.setAttribute("role", "region"); host.setAttribute("aria-label", "Alumni updates gallery, use left and right arrows to browse and Enter to edit");
  const open = document.createElement("button"); open.type = "button"; open.className = "btn primary cic-open-story"; open.textContent = "Open this story";
  section.append(styles, filters, host, open);
  const toolbar = main.querySelector(".toolbar"); if (toolbar) main.insertBefore(section, toolbar);
  let filter = "all", wall = null, updates = [];
  const show = async () => {
    if (wall) wall.destroy();
    const items = staffGalleryItems(updates, filter);
    wall = GALLERY.create(host, {
      items: rows => staffGalleryItems(rows, filter), emptyMessage: "No alumni updates match this filter.", srLabel: "Alumni updates including private stories",
      bend: 3.5, textColor: "#f5f2ee", borderRadius: 0.08, font: "500 26px Inter, sans-serif", scrollSpeed: 2.5, scrollEase: 0.03,
      onOpen: item => item && api.openForm("update", item.record, async () => { updates = await api.list("update"); show(); })
    });
    wall.mount(updates);
    open.onclick = () => wall && wall.openCentered();
  };
  ["all", "new", "reviewed", "featured", "hidden"].forEach(value => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = value[0].toUpperCase() + value.slice(1); button.setAttribute("aria-pressed", value === filter ? "true" : "false");
    button.onclick = () => { filter = value; filters.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button))); show(); };
    filters.appendChild(button);
  });
  window._cleanup = () => { if (wall) wall.destroy(); };
  api.list("update").then(rows => { updates = rows; show(); }).catch(() => { updates = []; show(); });
}

/* Shared gallery CSS, injected once into <head> so every page that mounts a gallery gets the base layout. */
const WALL_BASE_CSS = ".cic-wall-host{position:relative;height:380px;background:#151412;box-shadow:0 40px 100px rgba(0,0,0,.35);overflow:hidden;border-radius:40px}.cic-gallery-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.cic-wall-row{display:flex;align-items:center;gap:14px;height:100%;overflow-x:auto;padding:18px 22px;scroll-snap-type:x mandatory}.cic-wall-figure{flex:0 0 min(25vw,210px);margin:0;scroll-snap-align:center;color:#f5f2ee;text-align:center;font:500 26px Inter,Arial,sans-serif}.cic-wall-figure img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:contain;border-radius:8px;box-shadow:0 16px 32px rgba(0,0,0,.12)}.cic-wall-figure figcaption{padding:8px 4px 0}.cic-wall-empty{color:#f5f2ee;text-align:center;padding:80px 18px;margin:0;font:400 15px Inter,Arial,sans-serif}.cic-wall-empty a{color:#e8d5b7;font-weight:600;text-underline-offset:3px}@media(max-width:640px){.cic-wall-host{height:280px;border-radius:28px}.cic-wall-figure{flex-basis:42vw;font-size:16px}}";
function ensureWallCSS() {
  if (document.getElementById("cic-wall-css")) return;
  const tag = document.createElement("style"); tag.id = "cic-wall-css"; tag.textContent = WALL_BASE_CSS; document.head.appendChild(tag);
}

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
  emailHTML(n, lang = "en") {
    const e = s => esc(s), P = "#0A8F27", es = lang === "es";
    return `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5">
<div style="display:none;max-height:0;overflow:hidden">${e(n.preheader)}</div>
<div style="background:${P};color:#fff;padding:22px 24px;border-radius:12px 12px 0 0"><div style="font-size:13px;opacity:.85">${e(ORG.name)}</div><div style="font-size:22px;font-weight:bold">${e(n.subject)}</div></div>
<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:22px 24px;border-radius:0 0 12px 12px">
<p style="font-size:16px;margin:0 0 18px">${e(n.intro)}</p>
${n.sections.map(s => `<h2 style="font-size:18px;color:${P};margin:22px 0 6px">${e(s.heading)}</h2><p style="margin:0 0 8px;font-size:15px">${e(s.body)}</p>${s.link ? `<a href="${e(s.link)}" style="color:${P};font-weight:bold;font-size:14px">${es ? "Ver la publicación" : "See the post"} &rarr;</a>` : ""}`).join("\n")}
<div style="margin-top:26px;padding:16px;background:#F3F3F3;border-radius:0;font-size:16px;font-weight:bold;color:#0A8F27">${e(n.cta)}</div>
<p style="margin-top:24px;font-size:12px;color:#6b7280">${e(ORG.mission)}${es ? '<br>"El talento está en todas partes, la oportunidad no."' : ""}<br>${es ? "Recibe este correo porque su familia forma parte de Coding in Color." : "You're getting this because your family is part of " + e(ORG.name) + "."}</p>
</div></div>`;
  },
  plainText(n, lang = "en") { const es = lang === "es"; return [n.subject, "", n.intro, "", ...n.sections.flatMap(s => [s.heading.toUpperCase(), s.body, s.link ? (es ? "Ver la publicación: " : "See the post: ") + s.link : "", ""]), n.cta, "", ORG.mission, ...(es ? ["El talento está en todas partes, la oportunidad no."] : [])].join("\n"); },
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
    let edition = newsletter, lang = "en", translated = null, spanishSaved = false, notice = "";
    const render = () => {
      const html = NL.emailHTML(edition, lang), plain = NL.plainText(edition, lang);
      const htmlDoc = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>${esc(edition.subject)}</title><body style="background:#f3f4f6;padding:20px">${html}</body></html>`;
      $$("#nOut").innerHTML = `<div class="card"><div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn" id="langEn" type="button" aria-pressed="${lang === "en"}" style="border-radius:0">English</button><button class="btn" id="langEs" type="button" aria-pressed="${lang === "es"}" style="border-radius:0" ${ai ? "" : 'disabled title="Spanish edition needs Workers AI (live site)"'}>Español</button></div><div id="translateNotice" class="count" aria-live="polite">${notice}</div><div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn primary" id="cHtml" title="Pastes formatted into Campaign Monitor, Gmail or any email tool">Copy for Campaign Monitor</button><button class="btn" id="cText">Copy plain text</button><button class="btn" id="cDl">Download .html</button><button class="btn" id="cMark">Mark posts as sent</button></div><div style="background:#f3f4f6;padding:16px;border-radius:12px">${html}</div><p class="count">Written by ${api.esc(lang === "es" ? "Workers AI (Español)" : madeWith)}. Review before sending.</p></div>`;
      $$("#langEn").onclick = () => { lang = "en"; edition = newsletter; notice = ""; render(); };
      $$("#langEs").onclick = async () => {
        if (translated) { edition = translated; lang = "es"; notice = ""; render(); await saveSpanish(); return; }
        notice = "Traduciendo…"; render(); $$("#langEs").disabled = true;
        try { translated = await NL.postJSON("/api/newsletter/translate", { newsletter, lang: "es" }); edition = translated; lang = "es"; notice = ""; render(); await saveSpanish(); }
        catch (error) { notice = `${api.esc(error.message)} <button class="btn" id="translateRetry" type="button">Try again</button>`; render(); $$("#translateRetry").onclick = () => $$("#langEs").click(); }
      };
      $$("#cHtml").onclick = async () => { try { await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plain], { type: "text/plain" }) })]); api.toast("Copied for your email tool"); } catch (error) { await navigator.clipboard.writeText(html); api.toast("Copied HTML"); } };
      $$("#cText").onclick = () => navigator.clipboard.writeText(plain).then(() => api.toast("Copied"));
      $$("#cDl").onclick = () => NL.download("newsletter-" + d(0) + (lang === "es" ? "-es" : "") + ".html", htmlDoc);
      $$("#cMark").onclick = async () => { for (const post of usedPosts) await api.update("post", post.id, { ...post, used: true }); api.toast(`${usedPosts.length} posts marked as sent`); };
    };
    const saveSpanish = async () => {
      if (!translated || spanishSaved) return;
      try { await api.create("issue", { subject: translated.subject, period: $$("#nPeriod").value + " (Español)", created: d(0), posts: usedPosts.length + includedAlumni.length, madeWith: "Workers AI (Español)", text: NL.plainText(translated, "es") }); spanishSaved = true; }
      catch (error) { notice = `Spanish edition is ready; saving failed: ${api.esc(error.message)} <button class="btn" id="translateRetry" type="button">Try again</button>`; render(); $$("#translateRetry").onclick = saveSpanish; }
    };
    render();
    await api.create("issue", { subject: newsletter.subject, period: $$("#nPeriod").value, created: d(0), posts: usedPosts.length + includedAlumni.length, madeWith, text: NL.plainText(newsletter) });
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
  theme: "ocean", customTheme: { "--primary": "#a78b71", "--side": "#0a0a0a", "--side-text": "#f5f2ee" },
  currency: "$", storage: "auto", apiBase: "", navEntities: ["update", "session"], navOrder: ["dashboard", "update", "x/newsletter", "session"],
  entityViewHook: renderStaffAlumniGallery,
  dashboardHero: codingColorDashboardHero,
  dashboardAfterRender: wireDashboardNeuralLines,

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
        // Age gate from the student form: "adult" (18+) or "minor-with-permission" (under 18, parent/guardian OK).
        { key: "ageConfirm", label: "Age", type: "select", options: ["adult", "minor-with-permission"], badge: true, default: "adult" },
        { key: "parentEmail", label: "Parent/guardian email (under 18)", type: "email", hideInTable: true },
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
        { firstName: "Alex", programs: "AI Academy: Spark, Hackathons", yearsAttended: "2022-2023", gradYear: "2025", nowDoing: "college / university", field: "Computer Science", school: "Arizona State University", story: "Spark was the first time I trained a model myself. Now I'm a CS sophomore at ASU and I tutor freshmen in Python on Tuesdays.", link: "", proudOf: "Getting into Barrett, the Honors College", imageNotes: "", status: "featured", consentShare: true, consentContact: true, contact: "", submittedAt: new Date(d(-2) + "T09:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Jasmine", programs: "Summer Camps, AI Academy: Spark", yearsAttended: "2021-2022", gradYear: "2023", nowDoing: "internship", field: "Software Engineering", school: "Phoenix health-tech company", story: "I went from summer camp to building the scheduling page for a Phoenix health-tech startup this summer. My manager said my code reviews were the cleanest on the team.", link: "", proudOf: "Shipping a feature real patients use", imageNotes: "", status: "featured", consentShare: true, consentContact: false, contact: "", submittedAt: new Date(d(-5) + "T10:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Marcus", programs: "Hackathons", yearsAttended: "2023-2024", gradYear: "2024", nowDoing: "community college", field: "Cybersecurity", school: "Maricopa Community Colleges", story: "Our hackathon team won second place, and that's when I realized I liked breaking things to make them safer. I'm in the cybersecurity program at Maricopa now.", link: "", proudOf: "Passing my first CompTIA exam", imageNotes: "", status: "reviewed", consentShare: true, consentContact: true, contact: "", submittedAt: new Date(d(-8) + "T11:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Leilani", programs: "AI Academy: Spark", yearsAttended: "2024-2025", gradYear: "2027", nowDoing: "high school", field: "", school: "", story: "I built a chatbot that answers questions about our tribe's language class schedule. My teacher wants the whole school to use it next semester.", link: "", proudOf: "Presenting to my school board", imageNotes: "", status: "new", consentShare: true, consentContact: false, contact: "", submittedAt: new Date(d(-1) + "T12:15:00.000Z").toISOString(), ageConfirm: "minor-with-permission", parentEmail: "parent.leilani@example.test" },
        { firstName: "Diego", programs: "AI Academy: Reboot", yearsAttended: "2022-2023", gradYear: "2019", nowDoing: "working in tech", field: "IT Support", school: "Glendale school district", story: "My mom and I both did Reboot. I used what I learned to switch careers. I'm on an IT help desk now and I just got promoted to lead.", link: "", proudOf: "Being the first in my family in tech", imageNotes: "", status: "featured", consentShare: true, consentContact: true, contact: "", submittedAt: new Date(d(-12) + "T13:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Priya", programs: "Hackathons, Summer Camps", yearsAttended: "2022-2023", gradYear: "2024", nowDoing: "college / university", field: "Data Science", school: "University of Arizona", story: "I'm studying data science at the U of A. I still use the project-planning board Coding in Color taught us for every group project.", link: "", proudOf: "Undergraduate research position", imageNotes: "", status: "reviewed", consentShare: true, consentContact: false, contact: "", submittedAt: new Date(d(-15) + "T14:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Tyrese", programs: "AI Academy: Spark", yearsAttended: "2023-2024", gradYear: "2025", nowDoing: "trade or bootcamp", field: "Web Development", school: "Phoenix coding bootcamp", story: "College wasn't the right fit for me yet, so I'm doing a web development bootcamp. Spark gave me the confidence that I could actually code.", link: "", proudOf: "Launching my first client website", imageNotes: "", status: "reviewed", consentShare: true, consentContact: true, contact: "", submittedAt: new Date(d(-20) + "T15:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "", programs: "Summer Camps", yearsAttended: "2021-2022", gradYear: "2022", nowDoing: "working (other field)", field: "", school: "", story: "I work in retail now, but I still build small games on weekends. I want to come back as a volunteer mentor next summer.", link: "", proudOf: "Finishing my first full game", imageNotes: "", status: "reviewed", consentShare: false, consentContact: false, contact: "", submittedAt: new Date(d(-24) + "T16:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Sofia", programs: "AI Academy: Spark, Hackathons", yearsAttended: "2024-2025", gradYear: "2026", nowDoing: "high school", field: "", school: "", story: "I'm a senior and I've applied to three CS programs. My college essay is about the Coding in Color hackathon where our app failed and we fixed it at 2 a.m.", link: "", proudOf: "Getting into a summer research camp", imageNotes: "", status: "new", consentShare: true, consentContact: false, contact: "", submittedAt: new Date(d(-3) + "T09:15:00.000Z").toISOString(), ageConfirm: "minor-with-permission", parentEmail: "parent.sofia@example.test" },
        { firstName: "Andre", programs: "AI Academy: Amplify", yearsAttended: "2023-2024", gradYear: "", nowDoing: "working in tech", field: "Computer Science Education", school: "Phoenix Union High School District", story: "I'm a teacher. After Amplify I started an AI elective at my school, and 60 students signed up the first semester.", link: "", proudOf: "Starting the first AI elective at my school", imageNotes: "", status: "featured", consentShare: true, consentContact: true, contact: "", submittedAt: new Date(d(-9) + "T10:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Nia", programs: "Hackathons", yearsAttended: "2024-2025", gradYear: "2025", nowDoing: "college / university", field: "Information Systems", school: "Northern Arizona University", story: "Just started at NAU in information systems. I joined the women in tech club the first week because of the friends I made at Coding in Color.", link: "", proudOf: "Scholarship for first-generation students", imageNotes: "", status: "new", consentShare: false, consentContact: false, contact: "", submittedAt: new Date(d(-0) + "T11:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" },
        { firstName: "Ben", programs: "Summer Camps", yearsAttended: "2021-2022", gradYear: "2023", nowDoing: "other", field: "", school: "", story: "Test submission, please ignore.", link: "", proudOf: "", imageNotes: "", status: "hidden", consentShare: false, consentContact: false, contact: "", submittedAt: new Date(d(-30) + "T12:15:00.000Z").toISOString(), ageConfirm: "adult", parentEmail: "" }
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
        { key: "madeWith", label: "Written by", type: "select", options: ["Workers AI", "Workers AI (Español)", "simple template"], badge: true },
        { key: "text", label: "Plain-text version", type: "textarea", hideInTable: true }
      ],
      summary: [{ label: "Newsletters made", fn: "count" }],
      seed: [
        { subject: "October at Coding in Color: hackathon wins + fall sign-ups", period: "October 2026", created: d(-27), posts: 4, madeWith: "Workers AI", text: "October at Coding in Color\n\nOur student hackathon brought 40 builders together, and fall Spark sign-ups are open. Alumni spotlight: Diego went from AI Academy: Reboot to leading an IT help desk." },
        { subject: "Octubre en Coding in Color: hackatón y nuevas inscripciones", period: "October 2026 (Español)", created: d(-27), posts: 4, madeWith: "Workers AI (Español)", text: "Octubre en Coding in Color\n\nNuestro hackatón reunió a 40 estudiantes y ya están abiertas las inscripciones de otoño para Spark." }
      ]
    }
  },

  // Combined newsletter workflow: add Instagram material, build drafts, and navigate to saved records.
  extraViews: [{ id: "newsletter", label: "Newsletter", icon: "📰", render: newsletterView }]
};
