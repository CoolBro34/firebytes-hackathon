// PRESET: Donor tracking. Gifts that haven't been thanked are flagged; revenue by campaign.
const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today

const CONFIG = {
  appName: "Gratitude Ledger", tagline: "Never miss a thank-you", logo: "💌",
  theme: "ocean", customTheme: null, currency: "$", storage: "auto", apiBase: "",
  entities: {
    gift: {
      label: "Gifts", singular: "Gift", icon: "🎁", titleField: "donor",
      fields: [
        { key: "donor", label: "Donor", type: "text", required: true },
        { key: "date", label: "Date", type: "date", required: true, default: d(0) },
        { key: "amount", label: "Amount", type: "money", required: true, min: 1 },
        { key: "campaign", label: "Campaign", type: "select", options: ["annual appeal", "giving day", "gala", "memorial", "monthly"], badge: true, default: "annual appeal" },
        { key: "thanked", label: "Thanked?", type: "checkbox" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: r => !r.thanked ? "flag-warn" : "",
      aiActions: [{ id: "thanks", label: "✨ Draft thank-you" }],
      summary: [
        { label: "Raised", fn: "sum", field: "amount", format: "money" },
        { label: "Need a thank-you", fn: "countIf", test: r => !r.thanked, hint: "gifts not yet acknowledged" },
        { label: "Average gift", fn: "avg", field: "amount", format: "money" },
        { label: "Gifts", fn: "count" }
      ],
      charts: [{ title: "Raised by campaign", type: "bar", groupBy: "campaign", value: "amount", format: "money" }, { title: "Gifts over time", type: "line", groupBy: "date", value: "amount", format: "money" }],
      seed: [
        { donor: "Eleanor Whitfield", date: d(-14), amount: 250, campaign: "annual appeal", thanked: true, notes: "Longtime supporter" },
        { donor: "Desert Dental Group", date: d(-10), amount: 1000, campaign: "gala", thanked: true },
        { donor: "Marcus Lee", date: d(-6), amount: 50, campaign: "giving day", thanked: false, notes: "First-time donor" },
        { donor: "Camelback Bikes", date: d(-5), amount: 400, campaign: "giving day", thanked: false },
        { donor: "Priya & Sam Shah", date: d(-3), amount: 120, campaign: "monthly", thanked: false },
        { donor: "In memory of R. Alvarez", date: d(-2), amount: 300, campaign: "memorial", thanked: false, notes: "Family would like an update on the garden" },
        { donor: "Grace Okafor", date: d(-1), amount: 75, campaign: "annual appeal", thanked: true }
      ]
    },
    donor: {
      label: "Donors", singular: "Donor", icon: "👥", titleField: "name",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "type", label: "Type", type: "select", options: ["individual", "business", "foundation"], badge: true, default: "individual" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      summary: [{ label: "Donors on file", fn: "count" }],
      charts: [{ title: "Donors by type", type: "doughnut", groupBy: "type" }],
      seed: [
        { name: "Eleanor Whitfield", type: "individual", email: "eleanor@example.com", phone: "602-555-0110" },
        { name: "Desert Dental Group", type: "business", email: "office@example.com", phone: "602-555-0140" },
        { name: "Marcus Lee", type: "individual", email: "marcus@example.com" },
        { name: "Valley Community Foundation", type: "foundation", email: "grants@example.com" }
      ]
    }
  },
  extraViews: []
};
