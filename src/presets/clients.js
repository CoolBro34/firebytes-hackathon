// PRESET: Client intake & follow-up (case tracking). Overdue follow-ups are flagged. Use FAKE data only.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today

const CONFIG = {
  appName: "Follow-Up Desk", tagline: "No one falls through the cracks", logo: "📋",
  theme: "mono", customTheme: { "--primary": "#0f766e", "--side": "#0b2b2a" }, currency: "$", storage: "auto", apiBase: "",
  entities: {
    client: {
      label: "Clients", singular: "Client", icon: "🧑‍🤝‍🧑", titleField: "name",
      fields: [
        { key: "name", label: "Client (first name + initial)", type: "text", required: true },
        { key: "need", label: "Need", type: "select", options: ["housing", "food", "utilities", "employment", "health access", "legal help"], badge: true, default: "food" },
        { key: "status", label: "Status", type: "select", options: ["new", "in progress", "waiting", "resolved"], badge: true, default: "new" },
        { key: "intake", label: "Intake", type: "date", default: d(0) },
        { key: "nextFollowUp", label: "Follow up by", type: "date" },
        { key: "caseworker", label: "Caseworker", type: "text" },
        { key: "daysToFollow", label: "Days to follow-up", type: "computed", format: "number", compute: r => r.nextFollowUp && r.status !== "resolved" ? Math.round((new Date(r.nextFollowUp + "T00:00:00") - new Date(d(0) + "T00:00:00")) / 86400000) : "" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: r => (r.status !== "resolved" && r.nextFollowUp && r.nextFollowUp < d(0)) ? "flag-bad" : (r.status !== "resolved" && r.nextFollowUp === d(0)) ? "flag-warn" : "",
      aiActions: [{ id: "summary", label: "✨ Summarize notes" }, { id: "reminder", label: "✨ Draft reminder text" }],
      summary: [
        { label: "Open cases", fn: "countIf", test: r => r.status !== "resolved" },
        { label: "Follow-ups overdue", fn: "countIf", test: r => r.status !== "resolved" && r.nextFollowUp && r.nextFollowUp < d(0), hint: "past their date" },
        { label: "Due today", fn: "countIf", test: r => r.status !== "resolved" && r.nextFollowUp === d(0) },
        { label: "Resolved", fn: "count", where: { status: ["resolved"] } }
      ],
      charts: [{ title: "Cases by need", type: "bar", groupBy: "need" }, { title: "Cases by status", type: "doughnut", groupBy: "status" }],
      seed: [
        { name: "Maria G.", need: "housing", status: "in progress", intake: d(-12), nextFollowUp: d(-2), caseworker: "Jordan", notes: "Eviction notice received; landlord willing to negotiate. Needs rent assistance paperwork." },
        { name: "Tom N.", need: "food", status: "new", intake: d(0), nextFollowUp: d(0), caseworker: "Alex", notes: "Family of four; prefers evening pickup." },
        { name: "Aisha K.", need: "employment", status: "waiting", intake: d(-8), nextFollowUp: d(3), caseworker: "Jordan", notes: "Resume done; waiting for interview confirmation." },
        { name: "Devon B.", need: "utilities", status: "in progress", intake: d(-5), nextFollowUp: d(1), caseworker: "Sam", notes: "Shutoff date next Friday; applied for energy assistance." },
        { name: "Priya S.", need: "legal help", status: "resolved", intake: d(-20), nextFollowUp: "", caseworker: "Alex", notes: "Referred to legal aid; case opened." },
        { name: "Luis R.", need: "health access", status: "new", intake: d(-1), nextFollowUp: d(-1), caseworker: "Sam", notes: "Needs clinic appointment; no phone, call neighbor." }
      ]
    }
  },
  extraViews: [
    {
      id: "due", label: "Due today", icon: "⏰",
      async render(el, api) {
        const rows = (await api.list("client")).filter(c => c.status !== "resolved" && c.nextFollowUp && c.nextFollowUp <= d(0)).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));
        el.innerHTML = `<h1>⏰ Follow-ups due</h1><p class="sub">Today and overdue, oldest first</p>
          <div class="card">${rows.length ? "<table><tbody>" + rows.map(c => `<tr><td><b>${api.esc(c.name)}</b></td><td>${api.esc(c.need)}</td><td>${api.esc(api.fmt.date(c.nextFollowUp))}${c.nextFollowUp < d(0) ? ' <span class="badge" style="background:var(--danger)">overdue</span>' : ""}</td><td>${api.esc(c.caseworker || "")}</td></tr>`).join("") + "</tbody></table>" : '<div class="empty">All caught up 🎉</div>'}</div>`;
      }
    }
  ]
};
