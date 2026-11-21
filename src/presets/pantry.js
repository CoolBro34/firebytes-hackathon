// PRESET: Food bank / pantry. Inventory with expiry + low-stock flags, plus a distribution log.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today
const daysUntil = s => s ? Math.round((new Date(s + "T00:00:00") - new Date(d(0) + "T00:00:00")) / 86400000) : "";

const CONFIG = {
  appName: "Pantry Tracker", tagline: "Know what's on the shelf and who we fed", logo: "🥫",
  theme: "sunset", customTheme: null, currency: "$", storage: "auto", apiBase: "",
  entities: {
    item: {
      label: "Inventory", singular: "Item", icon: "📦", titleField: "name",
      fields: [
        { key: "name", label: "Item", type: "text", required: true },
        { key: "category", label: "Category", type: "select", options: ["produce", "canned", "dry goods", "dairy", "protein", "hygiene"], badge: true, default: "canned" },
        { key: "qty", label: "On hand", type: "number", required: true, min: 0 },
        { key: "unit", label: "Unit", type: "select", options: ["cases", "lbs", "boxes", "units"], default: "cases" },
        { key: "reorderAt", label: "Low at", type: "number", min: 0, default: 5 },
        { key: "expires", label: "Expires", type: "date" },
        { key: "daysLeft", label: "Days left", type: "computed", format: "number", compute: r => daysUntil(r.expires) }
      ],
      rowClass: r => (r.expires && daysUntil(r.expires) <= 2) ? "flag-bad" : ((r.expires && daysUntil(r.expires) <= 7) || Number(r.qty) <= Number(r.reorderAt)) ? "flag-warn" : "",
      summary: [
        { label: "Expiring in 7 days", fn: "countIf", test: r => r.expires && daysUntil(r.expires) <= 7, hint: "use or distribute first" },
        { label: "Low stock", fn: "countIf", test: r => Number(r.qty) <= Number(r.reorderAt), hint: "at or below 'Low at'" },
        { label: "Item types", fn: "count" }
      ],
      charts: [{ title: "Items by category", type: "doughnut", groupBy: "category" }, { title: "On hand by item", type: "bar", groupBy: "name", value: "qty" }],
      seed: [
        { name: "Canned black beans", category: "canned", qty: 40, unit: "cases", reorderAt: 10, expires: d(300) },
        { name: "Fresh tomatoes", category: "produce", qty: 6, unit: "boxes", reorderAt: 4, expires: d(2) },
        { name: "Whole milk", category: "dairy", qty: 3, unit: "cases", reorderAt: 5, expires: d(6) },
        { name: "Rice (25 lb)", category: "dry goods", qty: 18, unit: "units", reorderAt: 8, expires: d(400) },
        { name: "Chicken (frozen)", category: "protein", qty: 120, unit: "lbs", reorderAt: 50, expires: d(45) },
        { name: "Diapers (size 4)", category: "hygiene", qty: 2, unit: "boxes", reorderAt: 4 },
        { name: "Bananas", category: "produce", qty: 9, unit: "boxes", reorderAt: 4, expires: d(4) }
      ]
    },
    visit: {
      label: "Distributions", singular: "Distribution", icon: "🧺", titleField: "household",
      fields: [
        { key: "date", label: "Date", type: "date", required: true, default: d(0) },
        { key: "household", label: "Household", type: "text", required: true, placeholder: "e.g. Garcia family (ID only, no addresses)" },
        { key: "adults", label: "Adults", type: "number", min: 0, default: 1 },
        { key: "children", label: "Children", type: "number", min: 0, default: 0 },
        { key: "people", label: "People fed", type: "computed", format: "number", compute: r => Number(r.adults || 0) + Number(r.children || 0) },
        { key: "boxType", label: "Box", type: "select", options: ["standard", "family", "senior", "infant"], badge: true, default: "standard" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      summary: [
        { label: "Households served", fn: "count" },
        { label: "People fed", fn: "custom", compute: rows => rows.reduce((a, r) => a + Number(r.adults || 0) + Number(r.children || 0), 0) }
      ],
      charts: [{ title: "People fed by day", type: "line", groupBy: "date", value: "people" }, { title: "Boxes by type", type: "doughnut", groupBy: "boxType" }],
      seed: [
        { date: d(-5), household: "Household 1041", adults: 2, children: 3, boxType: "family" },
        { date: d(-5), household: "Household 1007", adults: 1, children: 0, boxType: "senior" },
        { date: d(-4), household: "Household 1112", adults: 2, children: 1, boxType: "standard" },
        { date: d(-3), household: "Household 1041", adults: 2, children: 3, boxType: "family" },
        { date: d(-2), household: "Household 1190", adults: 1, children: 1, boxType: "infant", notes: "Needs diapers next time" },
        { date: d(-1), household: "Household 1075", adults: 3, children: 2, boxType: "family" },
        { date: d(0), household: "Household 1203", adults: 1, children: 0, boxType: "standard" }
      ]
    }
  },
  extraViews: []
};
