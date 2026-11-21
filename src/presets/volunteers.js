// PRESET: Volunteer scheduling. Shifts show "spots left"; understaffed shifts soon are flagged.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today

const CONFIG = {
  appName: "Volunteer Hub", tagline: "Fill every shift, thank every volunteer", logo: "🤝",
  theme: "forest", customTheme: null, currency: "$", storage: "auto", apiBase: "",
  entities: {
    shift: {
      label: "Shifts", singular: "Shift", icon: "🗓️", titleField: "title",
      fields: [
        { key: "title", label: "Shift", type: "text", required: true, placeholder: "e.g. Saturday pantry sorting" },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "time", label: "Time", type: "text", placeholder: "9:00-12:00" },
        { key: "role", label: "Role", type: "select", options: ["sorting", "driving", "front desk", "event setup", "tutoring"], badge: true, default: "sorting" },
        { key: "needed", label: "Needed", type: "number", required: true, min: 1, default: 5 },
        { key: "signedUp", label: "Signed up", type: "number", required: true, min: 0, default: 0 },
        { key: "spotsLeft", label: "Spots left", type: "computed", format: "number", compute: r => Math.max(0, Number(r.needed) - Number(r.signedUp)) },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: r => (Number(r.signedUp) < Number(r.needed) && r.date <= d(3) && r.date >= d(0)) ? "flag-bad" : (Number(r.signedUp) >= Number(r.needed) ? "flag-good" : ""),
      aiActions: [{ id: "callout", label: "✨ Draft call for volunteers" }],
      summary: [
        { label: "Open spots", fn: "custom", compute: rows => rows.reduce((a, r) => a + Math.max(0, Number(r.needed) - Number(r.signedUp)), 0), hint: "across all shifts" },
        { label: "Understaffed soon", fn: "countIf", test: r => Number(r.signedUp) < Number(r.needed) && r.date >= d(0) && r.date <= d(3), hint: "shifts in the next 3 days" },
        { label: "Shifts total", fn: "count" }
      ],
      charts: [
        { title: "Spots left by shift", type: "bar", groupBy: "title", value: "spotsLeft" },
        { title: "Shifts by role", type: "doughnut", groupBy: "role" }
      ],
      seed: [
        { title: "Saturday pantry sorting", date: d(1), time: "9:00-12:00", role: "sorting", needed: 8, signedUp: 5, notes: "Gloves provided" },
        { title: "Meal delivery route A", date: d(2), time: "11:00-14:00", role: "driving", needed: 4, signedUp: 4 },
        { title: "Front desk: intake day", date: d(2), time: "10:00-16:00", role: "front desk", needed: 3, signedUp: 1, notes: "Bilingual helpful" },
        { title: "Community dinner setup", date: d(5), time: "16:00-18:00", role: "event setup", needed: 10, signedUp: 3 },
        { title: "After-school tutoring", date: d(3), time: "15:30-17:30", role: "tutoring", needed: 6, signedUp: 2 },
        { title: "Holiday pantry sorting", date: d(9), time: "9:00-13:00", role: "sorting", needed: 12, signedUp: 0 }
      ]
    },
    volunteer: {
      label: "Volunteers", singular: "Volunteer", icon: "🙋", titleField: "name",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "skills", label: "Skills", type: "text", placeholder: "driving, Spanish, first aid" },
        { key: "status", label: "Status", type: "select", options: ["new", "active", "on break"], badge: true, default: "new" },
        { key: "hours", label: "Hours given", type: "number", min: 0, default: 0 },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      aiActions: [{ id: "thanks", label: "✨ Draft thank-you" }],
      summary: [
        { label: "Active volunteers", fn: "count", where: { status: ["active"] } },
        { label: "Hours given", fn: "sum", field: "hours", format: "number" }
      ],
      charts: [{ title: "Hours by volunteer", type: "bar", groupBy: "name", value: "hours" }],
      seed: [
        { name: "Maria Gonzalez", phone: "602-555-0142", email: "maria@example.com", skills: "Spanish, driving", status: "active", hours: 46 },
        { name: "Devon Brooks", phone: "602-555-0177", email: "devon@example.com", skills: "tutoring, math", status: "active", hours: 31 },
        { name: "Aisha Khan", phone: "480-555-0123", email: "aisha@example.com", skills: "first aid", status: "new", hours: 4 },
        { name: "Tom Nguyen", phone: "480-555-0190", email: "tom@example.com", skills: "setup, lifting", status: "active", hours: 22 },
        { name: "Priya Shah", phone: "623-555-0166", email: "priya@example.com", skills: "front desk", status: "on break", hours: 58 }
      ]
    }
  },
  extraViews: [
    {
      id: "needs", label: "Needs help", icon: "🚨",
      async render(el, api) {
        const rows = (await api.list("shift")).filter(s => Number(s.signedUp) < Number(s.needed) && s.date >= d(0)).sort((a, b) => a.date.localeCompare(b.date));
        el.innerHTML = `<h1>🚨 Needs help</h1><p class="sub">Upcoming shifts that still need volunteers, soonest first</p>
          <div class="card">${rows.length ? "<table><tbody>" + rows.map(s => `<tr><td><b>${api.esc(s.title)}</b></td><td>${api.esc(api.fmt.date(s.date))}</td><td>${api.esc(s.time || "")}</td><td class="num"><b>${Number(s.needed) - Number(s.signedUp)}</b> spots left</td></tr>`).join("") + "</tbody></table>" : '<div class="empty">Every upcoming shift is full 🎉</div>'}</div>`;
      }
    }
  ]
};
