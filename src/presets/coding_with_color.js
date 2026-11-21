// PRESET: Coding with Color — student engagement + donor impact. ALL people and schools below are FAKE demo data.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today
const HOURS_PER_SESSION = 2;     // each class session is 2 hours
const PERIOD = "Fall 2026";      // label used on the donor report
const PROGRAMS = ["Intro to Web Dev", "Python Foundations", "Game Design", "App Lab"];
const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : "");
const daysSince = date => (date ? Math.round((new Date(d(0) + "T00:00:00") - new Date(date + "T00:00:00")) / 86400000) : "");
const growth = r => (r.skillNow !== "" && r.skillStart !== "" && r.skillNow != null && r.skillStart != null ? Number(r.skillNow) - Number(r.skillStart) : "");
// Risk rules (one place, used by flags, reasons and the report): active students only
const risk = r => {
  if (r.status !== "active") return "";
  const rate = pct(r.sessionsAttended, r.sessionsOffered), away = daysSince(r.lastSession);
  if ((away !== "" && away >= 14) || (rate !== "" && rate < 60)) return "flag-bad";
  if ((away !== "" && away >= 7) || (rate !== "" && rate < 75)) return "flag-warn";
  return "";
};
const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = x => Math.round(x * 10) / 10;
// Impact numbers, computed from the student list (shared by dashboard cards and donor report)
const impact = rows => {
  const served = rows.length, active = rows.filter(r => r.status === "active").length;
  const kept = rows.filter(r => r.status === "active" || r.status === "graduated").length;
  const rates = rows.map(r => pct(r.sessionsAttended, r.sessionsOffered)).filter(x => x !== "");
  const growths = rows.map(growth).filter(x => x !== "");
  return {
    studentsServed: served, activeStudents: active,
    retentionRate: served ? Math.round((kept / served) * 100) : 0,
    avgAttendance: Math.round(avg(rates)),
    learningHours: rows.reduce((s, r) => s + Number(r.sessionsAttended || 0) * HOURS_PER_SESSION, 0),
    avgSkillGrowth: round1(avg(growths)),
    projectsShipped: rows.reduce((s, r) => s + Number(r.projects || 0), 0),
    atRisk: rows.filter(r => risk(r) === "flag-bad").length
  };
};

const CONFIG = {
  appName: "Coding with Color", tagline: "Every student seen. Every win counted.", logo: "🎨",
  theme: "ocean", customTheme: { "--primary": "#7c3aed", "--side": "#1e1b4b", "--side-text": "#ddd6fe" },
  currency: "$", storage: "auto", apiBase: "",

  entities: {
    student: {
      label: "Students", singular: "Student", icon: "🧑🏾‍💻", titleField: "name",
      fields: [
        { key: "name", label: "Student (first name + initial)", type: "text", required: true, placeholder: "e.g. Amara T." },
        { key: "program", label: "Program", type: "select", options: PROGRAMS, badge: true, default: PROGRAMS[0] },
        { key: "grade", label: "Grade", type: "select", options: ["6-8", "9-10", "11-12", "College"], default: "9-10" },
        { key: "status", label: "Status", type: "select", options: ["active", "paused", "graduated", "withdrew"], badge: true, default: "active" },
        { key: "joined", label: "Joined", type: "date", default: d(0), hideInTable: true },
        { key: "sessionsOffered", label: "Sessions held", type: "number", default: 0, min: 0, hideInTable: true },
        { key: "sessionsAttended", label: "Sessions attended", type: "number", default: 0, min: 0, hideInTable: true },
        { key: "attendance", label: "Attendance %", type: "computed", format: "number", compute: r => pct(r.sessionsAttended, r.sessionsOffered) },
        { key: "lastSession", label: "Last session", type: "date" },
        { key: "daysAway", label: "Days since", type: "computed", format: "number", compute: r => (r.status === "active" ? daysSince(r.lastSession) : "") },
        { key: "skillStart", label: "Skill at start (1-5)", type: "number", min: 1, default: 1, hideInTable: true },
        { key: "skillNow", label: "Skill now (1-5)", type: "number", min: 1, default: 1, hideInTable: true },
        { key: "growth", label: "Skill growth", type: "computed", format: "number", compute: growth },
        { key: "projects", label: "Projects", type: "number", default: 0, min: 0 },
        { key: "mentor", label: "Mentor", type: "text" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: risk,
      attentionReason: r => {
        const rate = pct(r.sessionsAttended, r.sessionsOffered), away = daysSince(r.lastSession), bits = [];
        if (away !== "" && away >= 7) bits.push(`${away} days since last session`);
        if (rate !== "" && rate < 75) bits.push(`${rate}% attendance`);
        return bits.join(" · ");
      },
      aiActions: [{ id: "checkin", label: "✨ Check-in text" }],
      summary: [
        { label: "Students served", fn: "count", hint: PERIOD },
        { label: "Retention %", fn: "custom", compute: rows => impact(rows).retentionRate, hint: "still active or graduated" },
        { label: "Avg attendance %", fn: "custom", compute: rows => impact(rows).avgAttendance, hint: "sessions attended ÷ held" },
        { label: "Learning hours", fn: "custom", compute: rows => impact(rows).learningHours, hint: `${HOURS_PER_SESSION} h per session attended` },
        { label: "Avg skill growth", fn: "custom", compute: rows => impact(rows).avgSkillGrowth, hint: "levels gained on a 1-5 scale" },
        { label: "At risk now", fn: "custom", compute: rows => impact(rows).atRisk, hint: "14+ days away or under 60%" }
      ],
      charts: [
        { title: "Students by program", type: "bar", groupBy: "program" },
        { title: "Student status", type: "doughnut", groupBy: "status" }
      ],
      seed: [
        { name: "Amara T.", program: "Intro to Web Dev", grade: "9-10", status: "active", joined: d(-70), sessionsOffered: 20, sessionsAttended: 19, lastSession: d(-2), skillStart: 1, skillNow: 4, projects: 5, mentor: "Ms. Okafor", notes: "Built a portfolio site for her mom's braiding business." },
        { name: "Jaylen M.", program: "Python Foundations", grade: "11-12", status: "active", joined: d(-70), sessionsOffered: 20, sessionsAttended: 11, lastSession: d(-19), skillStart: 2, skillNow: 3, projects: 2, mentor: "Mr. Reyes", notes: "Started a part-time job on Thursdays." },
        { name: "Sofia R.", program: "Game Design", grade: "6-8", status: "active", joined: d(-63), sessionsOffered: 18, sessionsAttended: 17, lastSession: d(-2), skillStart: 1, skillNow: 3, projects: 4, mentor: "Dev P." },
        { name: "Kwame A.", program: "App Lab", grade: "College", status: "active", joined: d(-56), sessionsOffered: 16, sessionsAttended: 12, lastSession: d(-9), skillStart: 3, skillNow: 4, projects: 3, mentor: "Ms. Okafor" },
        { name: "Priya N.", program: "Python Foundations", grade: "9-10", status: "graduated", joined: d(-120), sessionsOffered: 24, sessionsAttended: 23, lastSession: d(-30), skillStart: 1, skillNow: 5, projects: 7, mentor: "Mr. Reyes", notes: "Now a teaching assistant for the next cohort." },
        { name: "Marcus L.", program: "Intro to Web Dev", grade: "11-12", status: "active", joined: d(-70), sessionsOffered: 20, sessionsAttended: 10, lastSession: d(-5), skillStart: 1, skillNow: 2, projects: 1, mentor: "Dev P." },
        { name: "Imani W.", program: "Game Design", grade: "9-10", status: "active", joined: d(-63), sessionsOffered: 18, sessionsAttended: 16, lastSession: d(-2), skillStart: 2, skillNow: 4, projects: 4, mentor: "Dev P." },
        { name: "Diego H.", program: "App Lab", grade: "College", status: "withdrew", joined: d(-56), sessionsOffered: 8, sessionsAttended: 4, lastSession: d(-35), skillStart: 2, skillNow: 2, projects: 0, mentor: "Ms. Okafor", notes: "Moved out of state." },
        { name: "Aaliyah B.", program: "Intro to Web Dev", grade: "6-8", status: "active", joined: d(-70), sessionsOffered: 20, sessionsAttended: 18, lastSession: d(-2), skillStart: 1, skillNow: 3, projects: 3, mentor: "Ms. Okafor" },
        { name: "Tyrese J.", program: "Python Foundations", grade: "11-12", status: "active", joined: d(-70), sessionsOffered: 20, sessionsAttended: 14, lastSession: d(-8), skillStart: 1, skillNow: 3, projects: 2, mentor: "Mr. Reyes" },
        { name: "Mei L.", program: "Game Design", grade: "6-8", status: "graduated", joined: d(-120), sessionsOffered: 24, sessionsAttended: 22, lastSession: d(-28), skillStart: 1, skillNow: 4, projects: 6, mentor: "Dev P." },
        { name: "Andre K.", program: "App Lab", grade: "College", status: "active", joined: d(-56), sessionsOffered: 16, sessionsAttended: 15, lastSession: d(-2), skillStart: 2, skillNow: 4, projects: 3, mentor: "Ms. Okafor" },
        { name: "Zara O.", program: "Python Foundations", grade: "9-10", status: "paused", joined: d(-70), sessionsOffered: 20, sessionsAttended: 9, lastSession: d(-21), skillStart: 1, skillNow: 2, projects: 1, mentor: "Mr. Reyes", notes: "Family emergency; plans to return in spring." },
        { name: "Nia C.", program: "Intro to Web Dev", grade: "9-10", status: "active", joined: d(-42), sessionsOffered: 12, sessionsAttended: 6, lastSession: d(-16), skillStart: 1, skillNow: 2, projects: 1, mentor: "Dev P." },
        { name: "Elijah S.", program: "Game Design", grade: "11-12", status: "active", joined: d(-63), sessionsOffered: 18, sessionsAttended: 15, lastSession: d(-2), skillStart: 2, skillNow: 4, projects: 3, mentor: "Dev P." },
        { name: "Luz M.", program: "App Lab", grade: "11-12", status: "active", joined: d(-56), sessionsOffered: 16, sessionsAttended: 14, lastSession: d(-2), skillStart: 1, skillNow: 3, projects: 2, mentor: "Ms. Okafor" }
      ]
    },
    story: {
      label: "Impact stories", singular: "Story", icon: "💬", titleField: "student",
      fields: [
        { key: "student", label: "Student (first name + initial)", type: "text", required: true },
        { key: "program", label: "Program", type: "select", options: PROGRAMS, badge: true, default: PROGRAMS[0] },
        { key: "quote", label: "Quote", type: "textarea", required: true },
        { key: "project", label: "Project it's about", type: "text" },
        { key: "consent", label: "Family OK'd sharing with donors", type: "checkbox" },
        { key: "date", label: "Date", type: "date", default: d(0) }
      ],
      rowClass: r => (r.consent ? "" : "flag-warn"),
      attentionReason: () => "needs sharing consent before it can go in the donor report",
      seed: [
        { student: "Amara T.", program: "Intro to Web Dev", quote: "I used to think coding was for other people. Now my mom's business has a website and I made it.", project: "Braiding studio website", consent: true, date: d(-6) },
        { student: "Priya N.", program: "Python Foundations", quote: "I came in not knowing what a variable was. Now I'm helping teach the new cohort.", project: "Bus-time text bot", consent: true, date: d(-30) },
        { student: "Sofia R.", program: "Game Design", quote: "My little brother plays my game every day. He wants to join next year.", project: "Desert runner game", consent: false, date: d(-3) }
      ]
    }
  },

  extraViews: [
    {
      id: "attendance", label: "Take attendance", icon: "✅",
      async render(el, api) {
        const all = await api.list("student"), active = all.filter(s => s.status === "active");
        const progs = PROGRAMS.filter(p => active.some(s => s.program === p));
        el.innerHTML = `<h1>✅ Take attendance</h1><p class="sub">One tap per student. Updates attendance %, last session, and the risk flags.</p>
          <div class="card"><label>Program <select id="prog">${progs.map(p => `<option>${api.esc(p)}</option>`).join("")}</select></label>
          <div id="roster" style="margin:14px 0"></div><button class="btn primary" id="saveAtt">Save today's session</button></div>`;
        const draw = () => {
          const p = el.querySelector("#prog").value;
          el.querySelector("#roster").innerHTML = active.filter(s => s.program === p).map(s =>
            `<label style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><input type="checkbox" data-id="${api.esc(s.id)}" checked> <b>${api.esc(s.name)}</b> <span class="count">${api.esc(pct(s.sessionsAttended, s.sessionsOffered))}% so far</span></label>`).join("") || '<div class="empty">No active students in this program</div>';
        };
        el.querySelector("#prog").onchange = draw; draw();
        el.querySelector("#saveAtt").onclick = async () => {
          const p = el.querySelector("#prog").value, boxes = [...el.querySelectorAll("#roster input[data-id]")];
          let here = 0;
          for (const b of boxes) {
            const s = active.find(x => x.id === b.dataset.id), came = b.checked;
            const upd = { ...s, sessionsOffered: Number(s.sessionsOffered || 0) + 1, sessionsAttended: Number(s.sessionsAttended || 0) + (came ? 1 : 0) };
            if (came) { upd.lastSession = d(0); here++; }
            await api.update("student", s.id, upd);
          }
          api.toast(`Saved: ${here} of ${boxes.length} present in ${p}`);
          location.hash = "#/dashboard";
        };
      }
    },
    {
      id: "report", label: "Donor report", icon: "📈",
      async render(el, api) {
        const rows = await api.list("student"), stories = (await api.list("story")).filter(s => s.consent);
        const m = impact(rows);
        const big = (v, label) => `<div class="card stat"><div class="value">${api.esc(v)}</div><div class="label">${api.esc(label)}</div></div>`;
        const byProg = PROGRAMS.map(p => { const r = rows.filter(s => s.program === p); return [p, r.length, impact(r)]; }).filter(x => x[1]);
        el.innerHTML = `<div class="toolbar noprint" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="aiUpd" hidden>✨ Draft donor update</button><button class="btn primary" onclick="print()">Print / save PDF</button></div>
          <h1>Coding with Color: ${api.esc(PERIOD)} impact</h1>
          <p class="sub">${api.esc(m.studentsServed)} young coders of color, ${api.esc(m.learningHours)} hours of hands-on learning. Live numbers from our program records.</p>
          <div class="grid stats">${big(m.studentsServed, "students served")}${big(m.retentionRate + "%", "retention")}${big(m.avgAttendance + "%", "average attendance")}${big(m.learningHours, "learning hours")}${big("+" + m.avgSkillGrowth, "avg skill levels gained (1-5)")}${big(m.projectsShipped, "projects shipped")}</div>
          <div class="card"><h3>By program</h3><table><thead><tr><th class="noclick">Program</th><th class="noclick num">Students</th><th class="noclick num">Retention</th><th class="noclick num">Attendance</th><th class="noclick num">Skill growth</th><th class="noclick num">Projects</th></tr></thead>
          <tbody>${byProg.map(([p, n, x]) => `<tr><td>${api.esc(p)}</td><td class="num">${n}</td><td class="num">${x.retentionRate}%</td><td class="num">${x.avgAttendance}%</td><td class="num">+${x.avgSkillGrowth}</td><td class="num">${x.projectsShipped}</td></tr>`).join("")}</tbody></table></div>
          <div class="card" style="margin-top:14px"><h3>In their words</h3>${stories.length ? stories.map(s => `<blockquote style="margin:12px 0;padding-left:14px;border-left:4px solid var(--primary)">“${api.esc(s.quote)}”<br><span class="count">One ${api.esc(s.program)} student${s.project ? " · " + api.esc(s.project) : ""}</span></blockquote>`).join("") : '<div class="empty">No stories with family consent yet</div>'}</div>
          <p class="count" style="margin-top:14px">Student names are never shown to donors. Stories appear only with family consent.</p>`;
        // Optional AI draft (runs on the Cloudflare Worker; button only shows when AI is enabled there)
        if (Store.ai) {
          const b = el.querySelector("#aiUpd"); b.hidden = false;
          b.onclick = () => {
            const record = { period: PERIOD, studentsServed: m.studentsServed, activeStudents: m.activeStudents, retentionRate: m.retentionRate, avgAttendance: m.avgAttendance,
              learningHours: m.learningHours, avgSkillGrowth: m.avgSkillGrowth, projectsShipped: m.projectsShipped, programs: byProg.map(x => x[0]).join(", "), story: stories[0] ? stories[0].quote : "" };
            const fake = { aiActions: [{ id: "donor_update", label: "✨ Donor update draft" }] };
            CONFIG.entities._report = fake; runAI("_report", "donor_update", record); delete CONFIG.entities._report;
          };
        }
      }
    }
  ]
};
