// PRESET: Event sign-ups. Capacity bars become "seats left"; full events are flagged green.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today

const CONFIG = {
  appName: "Event Roster", tagline: "Sign-ups, headcount, no surprises", logo: "🎟️",
  theme: "midnight", customTheme: null, currency: "$", storage: "auto", apiBase: "",
  entities: {
    event: {
      label: "Events", singular: "Event", icon: "📅", titleField: "title",
      fields: [
        { key: "title", label: "Event", type: "text", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "location", label: "Location", type: "text" },
        { key: "capacity", label: "Capacity", type: "number", required: true, min: 1, default: 50 },
        { key: "registered", label: "Registered", type: "number", min: 0, default: 0 },
        { key: "seatsLeft", label: "Seats left", type: "computed", format: "number", compute: r => Math.max(0, Number(r.capacity) - Number(r.registered)) },
        { key: "status", label: "Status", type: "select", options: ["planning", "open", "full", "done"], badge: true, default: "open" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: r => Number(r.registered) >= Number(r.capacity) ? "flag-good" : (r.status === "open" && r.date <= d(3) && Number(r.registered) < Number(r.capacity) * 0.5) ? "flag-warn" : "",
      aiActions: [{ id: "callout", label: "✨ Draft invite" }],
      summary: [
        { label: "Upcoming events", fn: "countIf", test: r => r.date >= d(0) && r.status !== "done" },
        { label: "People registered", fn: "sum", field: "registered", format: "number" },
        { label: "Seats left", fn: "custom", compute: rows => rows.filter(r => r.status !== "done").reduce((a, r) => a + Math.max(0, Number(r.capacity) - Number(r.registered)), 0) }
      ],
      charts: [{ title: "Registered by event", type: "bar", groupBy: "title", value: "registered" }, { title: "Events by status", type: "doughnut", groupBy: "status" }],
      seed: [
        { title: "Neighborhood cleanup", date: d(2), location: "Cesar Chavez Park", capacity: 40, registered: 14, status: "open", notes: "Bring water" },
        { title: "Community dinner", date: d(5), location: "Fellowship Hall", capacity: 80, registered: 80, status: "full" },
        { title: "Youth coding workshop", date: d(9), location: "Library room B", capacity: 24, registered: 11, status: "open" },
        { title: "Spring fundraiser gala", date: d(30), location: "Grand Ballroom", capacity: 200, registered: 38, status: "planning" },
        { title: "Volunteer orientation", date: d(-4), location: "Main office", capacity: 30, registered: 27, status: "done" }
      ]
    },
    rsvp: {
      label: "RSVPs", singular: "RSVP", icon: "✋", titleField: "name",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "event", label: "Event", type: "text", required: true },
        { key: "party", label: "Party size", type: "number", min: 1, default: 1 },
        { key: "email", label: "Email", type: "email" },
        { key: "status", label: "Status", type: "select", options: ["confirmed", "waitlist", "cancelled"], badge: true, default: "confirmed" }
      ],
      summary: [{ label: "RSVPs", fn: "count" }, { label: "Guests (party sizes)", fn: "sum", field: "party", format: "number" }],
      charts: [{ title: "Guests by event", type: "bar", groupBy: "event", value: "party" }],
      seed: [
        { name: "Maria G.", event: "Neighborhood cleanup", party: 3, email: "maria@example.com", status: "confirmed" },
        { name: "Devon B.", event: "Community dinner", party: 2, status: "confirmed" },
        { name: "Aisha K.", event: "Youth coding workshop", party: 1, status: "confirmed" },
        { name: "Tom N.", event: "Community dinner", party: 4, status: "waitlist" }
      ]
    }
  },
  extraViews: []
};
