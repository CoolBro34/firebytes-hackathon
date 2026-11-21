const d = n => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }; // date n days from today

const CONFIG = {
  appName: "Corner Bakery",
  tagline: "Orders & stock in one place",
  logo: "🥐",
  theme: "ocean",               // ocean | forest | sunset | midnight | mono
  customTheme: null,            // e.g. { "--primary": "#e11d48", "--side": "#2a0a12" }
  currency: "$",
  storage: "auto",              // auto | local | api
  apiBase: "",                  // "" = same origin as this page

  entities: {
    order: {
      label: "Orders", singular: "Order", icon: "🧾", titleField: "customer",
      fields: [
        { key: "customer", label: "Customer", type: "text", required: true, placeholder: "e.g. Maria G." },
        { key: "item", label: "Item", type: "text", required: true },
        { key: "qty", label: "Qty", type: "number", default: 1, min: 1 },
        { key: "total", label: "Total", type: "money", required: true },
        { key: "status", label: "Status", type: "select", options: ["new", "baking", "ready", "picked-up"], badge: true, default: "new" },
        { key: "due", label: "Due", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }
      ],
      rowClass: r => (r.status !== "picked-up" && r.due && r.due < d(0)) ? "flag-bad" : "",
      summary: [
        { label: "Open orders", fn: "count", where: { status: ["new", "baking", "ready"] }, hint: "not yet picked up" },
        { label: "Revenue", fn: "sum", field: "total", format: "money" },
        { label: "Avg order", fn: "avg", field: "total", format: "money" }
      ],
      charts: [
        { title: "Orders by status", type: "doughnut", groupBy: "status" },
        { title: "Revenue by item", type: "bar", groupBy: "item", value: "total", format: "money" }
      ],
      seed: [
        { customer: "Maria G.", item: "Birthday cake", qty: 1, total: 48, status: "baking", due: d(1), notes: "Write 'Happy 5th Leo'" },
        { customer: "Tom's Cafe", item: "Croissants (dozen)", qty: 4, total: 96, status: "new", due: d(0), notes: "Weekly standing order" },
        { customer: "Ahmed K.", item: "Sourdough loaf", qty: 2, total: 14, status: "ready", due: d(0) },
        { customer: "Linda P.", item: "Cupcakes (6)", qty: 2, total: 36, status: "picked-up", due: d(-1) },
        { customer: "Jonah R.", item: "Birthday cake", qty: 1, total: 55, status: "new", due: d(-1), notes: "Forgot to confirm — overdue!" },
        { customer: "Sunrise Yoga", item: "Muffins (dozen)", qty: 3, total: 63, status: "picked-up", due: d(-2) },
        { customer: "Priya S.", item: "Sourdough loaf", qty: 1, total: 7, status: "new", due: d(2) }
      ]
    },
    stock: {
      label: "Stock", singular: "Stock item", icon: "📦", titleField: "name",
      fields: [
        { key: "name", label: "Ingredient", type: "text", required: true },
        { key: "onHand", label: "On hand", type: "number", required: true, min: 0 },
        { key: "unit", label: "Unit", type: "select", options: ["kg", "L", "pcs"], default: "kg" },
        { key: "reorderAt", label: "Reorder at", type: "number", required: true, min: 0 },
        { key: "supplier", label: "Supplier", type: "text" }
      ],
      rowClass: r => (Number(r.onHand) <= Number(r.reorderAt)) ? "flag-warn" : "",
      summary: [
        { label: "Items to reorder", fn: "countIf", test: r => Number(r.onHand) <= Number(r.reorderAt), hint: "at or below reorder level" }
      ],
      charts: [{ title: "Stock on hand", type: "bar", groupBy: "name", value: "onHand" }],
      seed: [
        { name: "Flour", onHand: 12, unit: "kg", reorderAt: 20, supplier: "Valley Mill" },
        { name: "Butter", onHand: 18, unit: "kg", reorderAt: 8, supplier: "Dairy Direct" },
        { name: "Sugar", onHand: 30, unit: "kg", reorderAt: 10, supplier: "Valley Mill" },
        { name: "Eggs", onHand: 40, unit: "pcs", reorderAt: 60, supplier: "Local Farm" },
        { name: "Milk", onHand: 15, unit: "L", reorderAt: 10, supplier: "Dairy Direct" }
      ]
    }
  },

  /* Custom screens. Each: { id, label, icon, render(container, api) }.
     api = { list(entity), create(entity,rec), update(entity,id,rec), remove(entity,id), toast(msg), esc(str), fmt }
     Example below shows a tiny "Today" page — delete or replace it. */
  extraViews: [
    {
      id: "today", label: "Today", icon: "📅",
      async render(el, api) {
        const orders = await api.list("order");
        const due = orders.filter(o => o.due === d(0) && o.status !== "picked-up");
        el.innerHTML = `<h1>Today</h1><p class="sub">Orders due today that still need action</p>
          <div class="card">${due.length ? "<ul>" + due.map(o => `<li><b>${api.esc(o.customer)}</b> — ${api.esc(o.item)} (${api.esc(o.status)})</li>`).join("") + "</ul>" : '<div class="empty">Nothing due today 🎉</div>'}</div>`;
      }
    }
  ]
};
