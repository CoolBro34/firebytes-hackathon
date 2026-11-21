// PRESET: Resource & referral directory. Staff search "who can help with X?" in seconds.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today

const CONFIG = {
  appName: "Resource Finder", tagline: "The right referral in 10 seconds", logo: "🧭",
  theme: "ocean", customTheme: null, currency: "$", storage: "auto", apiBase: "",
  entities: {
    resource: {
      label: "Resources", singular: "Resource", icon: "🧭", titleField: "name",
      fields: [
        { key: "name", label: "Organization", type: "text", required: true },
        { key: "category", label: "Helps with", type: "select", options: ["food", "housing", "health", "legal", "jobs", "childcare", "utilities", "mental health"], badge: true, default: "food" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "hours", label: "Hours", type: "text", placeholder: "Mon-Fri 9-5" },
        { key: "eligibility", label: "Who qualifies", type: "text", placeholder: "e.g. Maricopa County residents" },
        { key: "verified", label: "Verified", type: "date", default: d(0) },
        { key: "daysSince", label: "Days since verified", type: "computed", format: "number", compute: r => r.verified ? Math.round((new Date(d(0) + "T00:00:00") - new Date(r.verified + "T00:00:00")) / 86400000) : "" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: r => (r.verified && r.verified < d(-90)) ? "flag-warn" : "",
      aiActions: [{ id: "summary", label: "✨ Plain-language summary" }],
      summary: [
        { label: "Resources listed", fn: "count" },
        { label: "Needs re-verifying", fn: "countIf", test: r => r.verified && r.verified < d(-90), hint: "not checked in 90+ days" }
      ],
      charts: [{ title: "Resources by category", type: "bar", groupBy: "category" }],
      seed: [
        { name: "Valley Food Bank", category: "food", phone: "602-555-0100", hours: "Tue/Thu 10-2", eligibility: "Anyone in need; no ID", verified: d(-10) },
        { name: "Safe Haven Shelter", category: "housing", phone: "602-555-0111", hours: "24/7 intake line", eligibility: "Adults and families", verified: d(-30) },
        { name: "Community Health Clinic", category: "health", phone: "602-555-0122", hours: "Mon-Sat 8-6", eligibility: "Sliding-scale fees", verified: d(-120), notes: "Phone changed? re-check" },
        { name: "Legal Aid Partners", category: "legal", phone: "602-555-0133", hours: "Mon-Fri 9-4", eligibility: "Income-qualified", verified: d(-45) },
        { name: "WorkReady Center", category: "jobs", phone: "602-555-0144", hours: "Mon-Fri 8-5", eligibility: "Ages 18+", verified: d(-15) },
        { name: "Little Steps Childcare Aid", category: "childcare", phone: "602-555-0155", hours: "Mon-Thu 9-3", eligibility: "Working parents", verified: d(-100) }
      ]
    }
  },
  extraViews: []
};
