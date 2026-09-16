(() => {
  "use strict";

  const STORAGE_KEY = "checkreport_pro_public_demo_v100";
  const LEGACY_STORAGE_KEY = "checkreport_pro_public_demo_v010";
  const APP_VERSION = "1.0.0";
  const resultLabels = { pass: "Pass", monitor: "Monitor", fail: "Fail", na: "N/A" };

  const builtInTemplates = [
    {
      id: "tpl-site-safety",
      name: "General Site Safety",
      description: "Safety, access, housekeeping and emergency readiness.",
      sections: [
        {
          title: "Access & housekeeping",
          items: [
            "Entry and exit routes are clear",
            "Walkways are free from trip hazards",
            "Work areas are clean and organized",
            "Warning signs and barriers are in place",
          ],
        },
        {
          title: "Safety controls",
          items: [
            "Required personal protective equipment is used",
            "Electrical leads and tools appear safe",
            "Fire extinguisher is available and accessible",
            "First-aid supplies are available",
          ],
        },
        {
          title: "Close-out",
          items: ["Waste is removed or contained", "Open issues have an assigned corrective action"],
        },
      ],
    },
    {
      id: "tpl-property-condition",
      name: "Property Condition",
      description: "Room-by-room condition, defects and maintenance findings.",
      sections: [
        {
          title: "Exterior",
          items: ["Roof and drainage condition", "Walls and visible structure", "Doors, windows and locks", "External grounds and access"],
        },
        {
          title: "Interior",
          items: ["Walls, ceilings and paint", "Flooring and skirting", "Lighting and electrical points", "Ventilation and visible dampness"],
        },
        {
          title: "Services",
          items: ["Water supply and visible plumbing", "Sanitary fixtures", "Heating or cooling equipment", "Smoke and safety alarms"],
        },
      ],
    },
    {
      id: "tpl-equipment-handover",
      name: "Equipment Handover",
      description: "Document condition before issue, return or client handover.",
      sections: [
        {
          title: "Identity & condition",
          items: ["Serial or asset number verified", "Exterior condition recorded", "Accessories and parts complete", "Existing damage photographed"],
        },
        {
          title: "Operation & handover",
          items: ["Basic function test completed", "Safety guards and controls operate", "Instructions provided to recipient", "Keys, documents or credentials transferred"],
        },
      ],
    },
  ];

  const demoInspection = {
    id: "ins-demo-001",
    number: "CR-1001",
    title: "Northside Property Condition Check",
    client: "Jordan Lee",
    site: "18 Westbrook Avenue",
    date: new Date().toISOString().slice(0, 10),
    inspector: "Alex Morgan",
    templateId: "tpl-property-condition",
    status: "draft",
    summaryNotes: "Initial walkthrough completed. Two maintenance items require follow-up.",
    signature: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: builtInTemplates[1].sections.map((section, sectionIndex) => ({
      title: section.title,
      items: section.items.map((label, itemIndex) => ({
        id: `demo-${sectionIndex}-${itemIndex}`,
        label,
        result: sectionIndex === 1 && itemIndex === 3 ? "monitor" : sectionIndex === 2 && itemIndex === 1 ? "fail" : "pass",
        severity: sectionIndex === 2 && itemIndex === 1 ? "high" : "low",
        note:
          sectionIndex === 1 && itemIndex === 3
            ? "Minor damp patch near the rear corner; monitor after rainfall."
            : sectionIndex === 2 && itemIndex === 1
              ? "Loose tap fitting requires repair."
              : "",
        action: sectionIndex === 2 && itemIndex === 1 ? "Repair and retest within 7 days." : "",
        beforePhoto: "",
        afterPhoto: "",
        photoCaption: "",
      })),
    })),
  };

  const defaultState = () => ({
    version: APP_VERSION,
    settings: {
      businessName: "ClearPoint Inspections",
      inspectorName: "Alex Morgan",
      email: "hello@example.com",
      phone: "+1 555 010 2400",
      address: "Your business address",
      reportTitle: "Inspection Report",
      accent: "#0f766e",
      targetScore: 90,
      logo: "",
      footerNote: "Prepared with CheckReport Pro",
    },
    templates: structuredClone(builtInTemplates),
    inspections: [structuredClone(demoInspection)],
  });

  let state = loadState();
  let currentPage = "dashboard";
  let editorDraft = null;
  let toastTimer;

  const pages = {
    dashboard: ["Inspection dashboard", "Turn every site visit into organized evidence."],
    inspections: ["Inspection records", "Find, review, duplicate and print every report."],
    editor: ["Inspection workspace", "Capture findings, photos, actions and sign-off."],
    templates: ["Checklist templates", "Standardize every inspection without rebuilding forms."],
    settings: ["Business settings", "Brand reports and protect your local data."],
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!saved) return defaultState();
      const parsed = JSON.parse(saved);
      if (!parsed.settings || !Array.isArray(parsed.templates) || !Array.isArray(parsed.inspections)) {
        return defaultState();
      }
      parsed.version = APP_VERSION;
      parsed.settings.logo ||= "";
      parsed.settings.footerNote ||= "Prepared with CheckReport Pro";
      parsed.settings.accent ||= "#0f766e";
      parsed.settings.targetScore ||= 90;
      parsed.inspections.forEach((inspection) => inspection.sections?.forEach((section) => section.items?.forEach((item) => {
        item.beforePhoto ||= item.photo || "";
        item.afterPhoto ||= "";
        item.photoCaption ||= "";
        delete item.photo;
      })));
      return parsed;
    } catch (error) {
      console.warn("Could not load local data", error);
      return defaultState();
    }
  }

  function persist(message = "Saved in this browser") {
    try {
      state.version = APP_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      applyBranding();
      if (message) showToast(message);
      return true;
    } catch (error) {
      console.warn("Could not save local data", error);
      showToast("Storage is full. Export a backup, then remove large photos.");
      return false;
    }
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(
      new Date(`${value}T00:00:00`),
    );
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function applyBranding() {
    const accent = /^#[0-9a-f]{6}$/i.test(state.settings.accent || "") ? state.settings.accent : "#0f766e";
    document.documentElement.style.setProperty("--accent", accent);
    document.querySelector("meta[name='theme-color']")?.setAttribute("content", accent);
  }

  function setPage(name) {
    currentPage = name;
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.querySelector(`#page-${name}`).classList.add("active");
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === name));
    document.querySelector("#pageTitle").textContent = pages[name][0];
    document.querySelector("#pageSubtitle").textContent = pages[name][1];
    document.querySelector("#sidebar").classList.remove("open");
    renderPage(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPage(name) {
    if (name === "dashboard") renderDashboard();
    if (name === "inspections") renderInspections();
    if (name === "editor") renderEditor();
    if (name === "templates") renderTemplates();
    if (name === "settings") renderSettings();
  }

  function getInspectionStats(inspection) {
    const items = inspection.sections.flatMap((section) => section.items);
    const counts = { pass: 0, monitor: 0, fail: 0, na: 0 };
    items.forEach((item) => {
      counts[item.result] = (counts[item.result] || 0) + 1;
    });
    const scored = counts.pass + counts.monitor + counts.fail;
    const score = scored ? Math.round(((counts.pass + counts.monitor * 0.5) / scored) * 100) : 0;
    return { ...counts, total: items.length, score };
  }

  function overallStats() {
    const completed = state.inspections.filter((item) => item.status === "completed").length;
    const open = state.inspections.length - completed;
    const failed = state.inspections.reduce((sum, item) => sum + getInspectionStats(item).fail, 0);
    const average = state.inspections.length
      ? Math.round(state.inspections.reduce((sum, item) => sum + getInspectionStats(item).score, 0) / state.inspections.length)
      : 0;
    return { total: state.inspections.length, completed, open, failed, average };
  }

  function renderDashboard() {
    const stats = overallStats();
    const recent = [...state.inspections]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);
    const page = document.querySelector("#page-dashboard");
    page.innerHTML = `
      <div class="hero">
        <h2>Capture the finding. Prove the work. Print the report.</h2>
        <p>Run consistent inspections with reusable checklists, photo evidence, corrective actions and client-ready reports—even without internet.</p>
        <button class="button primary" data-action="new-inspection">Start an inspection</button>
      </div>
      <div class="stats-grid">
        ${statCard("Total inspections", stats.total, "All locally saved records")}
        ${statCard("Open reports", stats.open, "Draft or in progress")}
        ${statCard("Failed checks", stats.failed, "Corrective actions required")}
        ${statCard("Average score", `${stats.average}%`, "Across all reports")}
      </div>
      <div class="grid-2">
        <article class="card">
          <div class="card-header"><h2>Recent inspections</h2><button class="button secondary small" data-page-link="inspections">View all</button></div>
          <div class="card-body">
            ${
              recent.length
                ? `<div class="list">${recent.map(inspectionRow).join("")}</div>`
                : emptyState("No inspections yet", "Create your first inspection to begin building an evidence trail.")
            }
          </div>
        </article>
        <article class="card">
          <div class="card-header"><h2>Product advantage</h2></div>
          <div class="card-body">
            <div class="callout"><strong>No recurring software bill.</strong><br>Everything works locally in the browser. Buyers can rebrand the source, add templates and deploy it to any static host.</div>
            <div class="list" style="margin-top:12px">
              <div class="list-row"><div><strong>Reusable checklists</strong><small>Standardize work across jobs</small></div><span class="badge pass">READY</span><span>✓</span></div>
              <div class="list-row"><div><strong>Evidence photos</strong><small>Compressed before local storage</small></div><span class="badge pass">PRIVATE</span><span>✓</span></div>
              <div class="list-row"><div><strong>Printable reports</strong><small>A4 customer-ready output</small></div><span class="badge pass">OFFLINE</span><span>✓</span></div>
            </div>
          </div>
        </article>
      </div>`;
  }

  function statCard(label, value, note) {
    return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(note)}</em></article>`;
  }

  function emptyState(title, text) {
    return `<div class="empty-state"><div class="empty-icon">✓</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>`;
  }

  function inspectionRow(inspection) {
    const stats = getInspectionStats(inspection);
    return `<div class="list-row">
      <div><strong>${escapeHtml(inspection.title)}</strong><small>${escapeHtml(inspection.number)} · ${escapeHtml(inspection.client || "No client")}</small></div>
      <div><span class="badge ${stats.fail ? "fail" : stats.monitor ? "monitor" : "pass"}">${stats.score}% score</span><small>${formatDate(inspection.date)}</small></div>
      <button class="button secondary small" data-action="edit-inspection" data-id="${inspection.id}">Open</button>
    </div>`;
  }

  function renderInspections(filter = "") {
    const page = document.querySelector("#page-inspections");
    const needle = filter.trim().toLowerCase();
    const records = [...state.inspections]
      .filter((item) => [item.title, item.number, item.client, item.site].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    page.innerHTML = `
      <div class="toolbar">
        <input class="search" id="inspectionSearch" type="search" placeholder="Search report, client or site…" value="${escapeHtml(filter)}">
        <button class="button primary" data-action="new-inspection">New inspection</button>
      </div>
      <article class="card">
        <div class="card-header"><h2>All records</h2><span class="badge">${records.length} reports</span></div>
        <div class="card-body">
          ${
            records.length
              ? `<div class="list">${records.map((item) => {
                  const stats = getInspectionStats(item);
                  return `<div class="list-row">
                    <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.number)} · ${escapeHtml(item.site || "No site")}</small></div>
                    <div><span class="badge ${item.status}">${escapeHtml(item.status)}</span><small>${stats.fail} failed · ${stats.score}% score</small></div>
                    <div class="button-row">
                      <button class="button secondary small" data-action="edit-inspection" data-id="${item.id}">Edit</button>
                      <button class="button secondary small" data-action="duplicate-inspection" data-id="${item.id}">Duplicate</button>
                      <button class="button danger small" data-action="delete-inspection" data-id="${item.id}">Delete</button>
                    </div>
                  </div>`;
                }).join("")}</div>`
              : emptyState("Nothing matches", "Try another search or create a new inspection.")
          }
        </div>
      </article>`;
    document.querySelector("#inspectionSearch")?.addEventListener("input", (event) => renderInspections(event.target.value));
  }

  function newInspection(templateId = state.templates[0]?.id) {
    const template = state.templates.find((item) => item.id === templateId) || state.templates[0];
    const sequence = String(state.inspections.length + 1002);
    editorDraft = {
      id: uid("ins"),
      number: `CR-${sequence}`,
      title: "New inspection",
      client: "",
      site: "",
      date: new Date().toISOString().slice(0, 10),
      inspector: state.settings.inspectorName,
      templateId: template.id,
      status: "draft",
      summaryNotes: "",
      signature: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: templateToSections(template),
    };
    setPage("editor");
  }

  function templateToSections(template) {
    return template.sections.map((section) => ({
      title: section.title,
      items: section.items.map((label) => ({
        id: uid("chk"),
        label,
        result: "na",
        severity: "low",
        note: "",
        action: "",
        beforePhoto: "",
        afterPhoto: "",
        photoCaption: "",
      })),
    }));
  }

  function editInspection(id) {
    const source = state.inspections.find((item) => item.id === id);
    if (!source) return;
    editorDraft = structuredClone(source);
    setPage("editor");
  }

  function renderEditor() {
    if (!editorDraft) {
      editorDraft = state.inspections[0] ? structuredClone(state.inspections[0]) : null;
      if (!editorDraft && state.templates.length) return newInspection();
    }
    const page = document.querySelector("#page-editor");
    const stats = getInspectionStats(editorDraft);
    page.innerHTML = `
      <article class="card">
        <div class="card-header">
          <h2>Report details</h2>
          <div class="button-row">
            <button class="button secondary" data-action="print-inspection">Print / PDF</button>
            <button class="button primary" data-action="save-inspection">Save report</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            ${field("Report number", "number", editorDraft.number)}
            ${field("Inspection date", "date", editorDraft.date, "date")}
            ${selectField("Status", "status", editorDraft.status, [{ value: "draft", label: "Draft" }, { value: "completed", label: "Completed" }])}
            ${field("Report title", "title", editorDraft.title, "text", "span-2")}
            ${selectField("Checklist template", "templateId", editorDraft.templateId, state.templates.map((item) => ({ value: item.id, label: item.name })))}
            ${field("Client / contact", "client", editorDraft.client)}
            ${field("Site / asset", "site", editorDraft.site, "text", "span-2")}
            ${field("Inspector", "inspector", editorDraft.inspector)}
          </div>
        </div>
      </article>
      <div class="summary-bar">
        <div><span>Total checks</span><strong>${stats.total}</strong></div>
        <div><span>Pass</span><strong>${stats.pass}</strong></div>
        <div><span>Monitor</span><strong>${stats.monitor}</strong></div>
        <div><span>Fail</span><strong>${stats.fail}</strong></div>
        <div><span>Score</span><strong>${stats.score}%</strong></div>
      </div>
      <div class="editor-toolbar"><button class="button secondary" data-action="add-section">Add checklist section</button><span>Edit labels or add rows to adapt the inspection while working.</span></div>
      <div class="section-stack">
        ${editorDraft.sections.map((section, sectionIndex) => renderInspectionSection(section, sectionIndex)).join("")}
      </div>
      <article class="card" style="margin-top:20px">
        <div class="card-header"><h2>Summary & sign-off</h2></div>
        <div class="card-body">
          <div class="grid-2">
            <div class="field"><label for="summaryNotes">Summary notes</label><textarea id="summaryNotes" data-draft-field="summaryNotes">${escapeHtml(editorDraft.summaryNotes)}</textarea></div>
            <div class="signature-wrap">
              <label><strong>Client / recipient signature</strong></label>
              <canvas class="signature-pad" id="signaturePad" width="600" height="150"></canvas>
              <div class="button-row"><button class="button secondary small" data-action="clear-signature">Clear signature</button></div>
            </div>
          </div>
        </div>
      </article>`;
    bindEditorEvents();
    setupSignaturePad();
  }

  function field(label, name, value, type = "text", extraClass = "") {
    return `<div class="field ${extraClass}"><label for="field-${name}">${escapeHtml(label)}</label><input id="field-${name}" data-draft-field="${name}" type="${type}" value="${escapeHtml(value)}"></div>`;
  }

  function selectField(label, name, value, options) {
    return `<div class="field"><label for="field-${name}">${escapeHtml(label)}</label><select id="field-${name}" data-draft-field="${name}">${options
      .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
      .join("")}</select></div>`;
  }

  function renderInspectionSection(section, sectionIndex) {
    return `<article class="inspection-section"><div class="section-title-row"><input class="section-title-input" data-section-title="${sectionIndex}" value="${escapeHtml(section.title)}" aria-label="Section title"><button class="button secondary small" data-action="add-check" data-section="${sectionIndex}">Add check</button><button class="button danger small" data-action="delete-section" data-section="${sectionIndex}">Delete section</button></div>${section.items
      .map(
        (item, itemIndex) => `<div class="check-row" data-section="${sectionIndex}" data-item="${itemIndex}">
          <div><input class="check-label-input" data-item-field="label" value="${escapeHtml(item.label)}" aria-label="Checklist label"><button class="text-button danger-text" data-action="delete-check" data-section="${sectionIndex}" data-item="${itemIndex}">Remove row</button></div>
          <select data-item-field="result" aria-label="Result for ${escapeHtml(item.label)}">
            ${Object.entries(resultLabels).map(([value, label]) => `<option value="${value}" ${item.result === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <select data-item-field="severity" aria-label="Severity for ${escapeHtml(item.label)}">
            ${["low", "medium", "high"].map((value) => `<option value="${value}" ${item.severity === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}
          </select>
          <div>
            <input type="text" data-item-field="note" value="${escapeHtml(item.note)}" placeholder="Finding or note">
            <input style="margin-top:7px" type="text" data-item-field="action" value="${escapeHtml(item.action)}" placeholder="Corrective action">
          </div>
          <div class="evidence-pair">
            <label class="photo-button">${item.beforePhoto ? `<img class="photo-thumb" src="${item.beforePhoto}" alt="Before evidence">` : "Before photo"}<input data-photo-input="beforePhoto" type="file" accept="image/*" capture="environment"></label>
            <label class="photo-button">${item.afterPhoto ? `<img class="photo-thumb" src="${item.afterPhoto}" alt="After evidence">` : "After photo"}<input data-photo-input="afterPhoto" type="file" accept="image/*" capture="environment"></label>
            <input type="text" data-item-field="photoCaption" value="${escapeHtml(item.photoCaption)}" placeholder="Evidence caption">
          </div>
        </div>`,
      )
      .join("")}${section.items.length ? "" : `<div class="empty-section">No checks in this section yet.</div>`}</article>`;
  }

  function bindEditorEvents() {
    document.querySelectorAll("[data-section-title]").forEach((input) => {
      input.addEventListener("input", () => {
        editorDraft.sections[Number(input.dataset.sectionTitle)].title = input.value;
      });
    });
    document.querySelectorAll("[data-draft-field]").forEach((input) => {
      if (input.dataset.draftField === "templateId") return;
      input.addEventListener("input", () => {
        editorDraft[input.dataset.draftField] = input.value;
      });
    });
    document.querySelector("#field-templateId")?.addEventListener("change", (event) => {
      const template = state.templates.find((item) => item.id === event.target.value);
      if (!template) return;
      if (confirm("Replace the current checklist with this template? Existing checklist findings will be cleared.")) {
        editorDraft.templateId = template.id;
        editorDraft.sections = templateToSections(template);
        renderEditor();
      } else {
        event.target.value = editorDraft.templateId;
      }
    });
    document.querySelectorAll(".check-row").forEach((row) => {
      const sectionIndex = Number(row.dataset.section);
      const itemIndex = Number(row.dataset.item);
      row.querySelectorAll("[data-item-field]").forEach((input) => {
        input.addEventListener("input", () => {
          editorDraft.sections[sectionIndex].items[itemIndex][input.dataset.itemField] = input.value;
          if (input.dataset.itemField === "result") renderEditor();
        });
      });
      row.querySelectorAll("[data-photo-input]").forEach((input) => input.addEventListener("change", async (event) => {
          const file = event.target.files[0];
          if (!file) return;
          try {
            const target = input.dataset.photoInput;
            editorDraft.sections[sectionIndex].items[itemIndex][target] = await compressImage(file);
            renderEditor();
            showToast(`${target === "beforePhoto" ? "Before" : "After"} photo added`);
          } catch {
            showToast("Photo could not be added");
          }
        }));
    });
  }

  function compressImage(file, max = 1100, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const scale = Math.min(1, max / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setupSignaturePad() {
    const canvas = document.querySelector("#signaturePad");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.strokeStyle = "#172235";
    if (editorDraft.signature) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = editorDraft.signature;
    }
    let drawing = false;
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
    };
    canvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      const p = point(event);
      context.beginPath();
      context.moveTo(p.x, p.y);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      const p = point(event);
      context.lineTo(p.x, p.y);
      context.stroke();
    });
    const finish = () => {
      if (!drawing) return;
      drawing = false;
      editorDraft.signature = canvas.toDataURL("image/png");
    };
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
  }

  function saveInspection() {
    if (!editorDraft.title.trim() || !editorDraft.number.trim()) {
      showToast("Report title and number are required");
      return;
    }
    editorDraft.updatedAt = new Date().toISOString();
    const index = state.inspections.findIndex((item) => item.id === editorDraft.id);
    if (index >= 0) state.inspections[index] = structuredClone(editorDraft);
    else state.inspections.unshift(structuredClone(editorDraft));
    persist("Inspection saved locally");
    renderEditor();
  }

  function printInspection() {
    saveInspection();
    const stats = getInspectionStats(editorDraft);
    const settings = state.settings;
    const root = document.querySelector("#printRoot");
    root.innerHTML = `
      <header class="print-header">
        <div class="print-brand">${settings.logo ? `<img src="${settings.logo}" alt="Business logo">` : ""}<div><h1>${escapeHtml(settings.businessName)}</h1><p>${escapeHtml(settings.reportTitle)}</p></div></div>
        <div><strong>${escapeHtml(editorDraft.number)}</strong><p>${formatDate(editorDraft.date)}</p></div>
      </header>
      <div class="print-meta">
        <div><small>Report</small><strong>${escapeHtml(editorDraft.title)}</strong></div>
        <div><small>Client</small><strong>${escapeHtml(editorDraft.client || "—")}</strong></div>
        <div><small>Site / asset</small><strong>${escapeHtml(editorDraft.site || "—")}</strong></div>
        <div><small>Inspector</small><strong>${escapeHtml(editorDraft.inspector || "—")}</strong></div>
        <div><small>Status</small><strong>${escapeHtml(editorDraft.status)}</strong></div>
        <div><small>Score</small><strong>${stats.score}% · ${stats.fail} failed</strong></div>
      </div>
      ${editorDraft.sections
        .map(
          (section) => `<section class="print-section"><h2>${escapeHtml(section.title)}</h2><table class="print-table"><thead><tr><th>Check</th><th>Result</th><th>Severity</th><th>Finding / action</th><th>Evidence</th></tr></thead><tbody>${section.items
            .map(
              (item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(resultLabels[item.result])}</td><td>${escapeHtml(item.severity)}</td><td>${escapeHtml(item.note || "—")}${item.action ? `<br><strong>Action:</strong> ${escapeHtml(item.action)}` : ""}</td><td><div class="print-evidence">${item.beforePhoto ? `<figure><img class="print-photo" src="${item.beforePhoto}" alt="Before evidence"><figcaption>Before</figcaption></figure>` : ""}${item.afterPhoto ? `<figure><img class="print-photo" src="${item.afterPhoto}" alt="After evidence"><figcaption>After</figcaption></figure>` : ""}</div>${item.photoCaption ? `<small>${escapeHtml(item.photoCaption)}</small>` : !item.beforePhoto && !item.afterPhoto ? "—" : ""}</td></tr>`,
            )
            .join("")}</tbody></table></section>`,
        )
        .join("")}
      <section class="print-section"><h2>Summary & sign-off</h2><p>${escapeHtml(editorDraft.summaryNotes || "No additional notes.")}</p>${editorDraft.signature ? `<img class="print-signature" src="${editorDraft.signature}" alt="Signature"><p><small>Client / recipient signature</small></p>` : "<p>No signature captured.</p>"}</section>
      <footer class="print-footer"><span>${escapeHtml(settings.email)} · ${escapeHtml(settings.phone)}</span><span>${escapeHtml(settings.footerNote)}</span></footer>`;
    setTimeout(() => window.print(), 100);
  }

  function renderTemplates() {
    const page = document.querySelector("#page-templates");
    page.innerHTML = `
      <div class="template-grid">
        ${state.templates
          .map(
            (template) => `<article class="template-card">
              <span class="badge ${template.id.startsWith("tpl-") ? "pass" : ""}">${template.id.startsWith("tpl-") ? "BUILT IN" : "CUSTOM"}</span>
              <h3>${escapeHtml(template.name)}</h3>
              <p>${escapeHtml(template.description || "Custom inspection checklist")}</p>
              <div class="template-meta"><span>${template.sections.length} sections</span><span>${template.sections.reduce((sum, section) => sum + section.items.length, 0)} checks</span></div>
              <div class="button-row"><button class="button primary small" data-action="use-template" data-id="${template.id}">Use template</button>${template.id.startsWith("custom-") ? `<button class="button danger small" data-action="delete-template" data-id="${template.id}">Delete</button>` : ""}</div>
            </article>`,
          )
          .join("")}
      </div>
      <article class="card" style="margin-top:22px">
        <div class="card-header"><h2>Create a custom template</h2></div>
        <div class="card-body">
          <div class="callout">Enter one checklist item per line. Use a line ending with a colon to start a new section.</div>
          <div class="form-grid" style="margin-top:16px">
            <div class="field"><label for="templateName">Template name</label><input id="templateName" placeholder="Example: Rental handover"></div>
            <div class="field span-2"><label for="templateDescription">Description</label><input id="templateDescription" placeholder="What this inspection covers"></div>
            <div class="field span-3"><label for="templateLines">Sections and checks</label><textarea id="templateLines" placeholder="Exterior:\nRoof condition\nDoors and locks\nInterior:\nWalls and flooring\nElectrical points"></textarea></div>
          </div>
          <div class="button-row" style="margin-top:16px"><button class="button primary" data-action="create-template">Save template</button></div>
        </div>
      </article>`;
  }

  function createTemplate() {
    const name = document.querySelector("#templateName").value.trim();
    const description = document.querySelector("#templateDescription").value.trim();
    const lines = document.querySelector("#templateLines").value.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!name || !lines.length) return showToast("Add a template name and checklist items");
    const sections = [];
    let current = { title: "Checklist", items: [] };
    lines.forEach((line) => {
      if (line.endsWith(":")) {
        if (current.items.length) sections.push(current);
        current = { title: line.slice(0, -1).trim() || "Checklist", items: [] };
      } else {
        current.items.push(line.replace(/^[-•]\s*/, ""));
      }
    });
    if (current.items.length) sections.push(current);
    if (!sections.length) return showToast("Add at least one checklist item");
    state.templates.push({ id: uid("custom"), name, description, sections });
    persist("Custom template created");
    renderTemplates();
  }

  function renderSettings() {
    const settings = state.settings;
    document.querySelector("#page-settings").innerHTML = `
      <div class="grid-2">
        <article class="card">
          <div class="card-header"><h2>Report branding</h2></div>
          <div class="card-body"><div class="form-grid" style="grid-template-columns:1fr 1fr">
            ${settingsField("Business name", "businessName", settings.businessName, "span-2")}
            ${settingsField("Default inspector", "inspectorName", settings.inspectorName)}
            ${settingsField("Report title", "reportTitle", settings.reportTitle)}
            ${settingsField("Email", "email", settings.email)}
            ${settingsField("Phone", "phone", settings.phone)}
            ${settingsField("Address", "address", settings.address, "span-2")}
            ${settingsField("Report footer", "footerNote", settings.footerNote, "span-2")}
            <div class="field"><label for="settings-accent">Accent colour</label><input id="settings-accent" data-settings-field="accent" type="color" value="${escapeHtml(settings.accent)}"></div>
            <div class="field"><label for="settings-targetScore">Target score (%)</label><input id="settings-targetScore" data-settings-field="targetScore" type="number" min="0" max="100" value="${escapeHtml(settings.targetScore)}"></div>
            <div class="field span-2"><label>Business logo (PNG/JPG)</label><div class="logo-setting">${settings.logo ? `<img src="${settings.logo}" alt="Current business logo">` : `<span>No logo selected</span>`}<label class="button secondary">Choose logo<input id="logoInput" type="file" accept="image/png,image/jpeg" hidden></label>${settings.logo ? `<button class="button danger" data-action="remove-logo">Remove logo</button>` : ""}</div></div>
          </div><div class="button-row" style="margin-top:18px"><button class="button primary" data-action="save-settings">Save settings</button></div></div>
        </article>
        <article class="card">
          <div class="card-header"><h2>Data protection</h2></div>
          <div class="card-body">
            <div class="callout"><strong>Local-only storage</strong><br>Data stays in this browser. Export a backup before clearing browser data or changing devices.</div>
            <div class="storage-meter"><div><span>Estimated app storage</span><strong id="storageUsage">Calculating…</strong></div><progress id="storageProgress" max="100" value="0"></progress></div>
            <div class="button-row" style="margin-top:18px">
              <button class="button secondary" data-action="export-data">Export JSON backup</button>
              <button class="button secondary" data-action="restore-data">Restore backup</button>
              <button class="button danger" data-action="reset-demo">Reset demo data</button>
            </div>
          </div>
        </article>
      </div>
      <article class="card" style="margin-top:20px"><div class="card-header"><h2>About this build</h2><span class="badge pass">VERSION ${APP_VERSION}</span></div><div class="card-body"><p>CheckReport Pro is a framework-free offline inspection report builder created by TejMade Digital. No external scripts, APIs or trackers are loaded.</p></div></article>`;
    document.querySelector("#logoInput")?.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        state.settings.logo = await compressImage(file, 500, 0.86);
        persist("Business logo added");
        renderSettings();
      } catch {
        showToast("Logo could not be added");
      }
    });
    updateStorageIndicator();
  }

  function settingsField(label, name, value, extraClass = "") {
    return `<div class="field ${extraClass}"><label for="settings-${name}">${escapeHtml(label)}</label><input id="settings-${name}" data-settings-field="${name}" value="${escapeHtml(value)}"></div>`;
  }

  function saveSettings() {
    document.querySelectorAll("[data-settings-field]").forEach((input) => {
      const value = input.value.trim();
      state.settings[input.dataset.settingsField] = input.dataset.settingsField === "targetScore" ? Number(value) : value;
    });
    persist("Business settings saved");
    renderSettings();
  }

  async function updateStorageIndicator() {
    const usageLabel = document.querySelector("#storageUsage");
    const progress = document.querySelector("#storageProgress");
    if (!usageLabel || !progress) return;
    const fallbackBytes = new Blob([JSON.stringify(state)]).size;
    let usage = fallbackBytes;
    let quota = 5 * 1024 * 1024;
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage || fallbackBytes;
      quota = estimate.quota || quota;
    }
    const usedMb = (usage / 1024 / 1024).toFixed(1);
    const quotaMb = Math.max(1, Math.round(quota / 1024 / 1024));
    usageLabel.textContent = `${usedMb} MB of approximately ${quotaMb} MB`;
    progress.value = Math.min(100, Math.round((usage / quota) * 100));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `checkreport-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Backup downloaded");
  }

  function restoreData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.settings || !Array.isArray(parsed.templates) || !Array.isArray(parsed.inspections)) throw new Error("Invalid backup");
        state = parsed;
        editorDraft = null;
        persist("Backup restored successfully");
        renderPage(currentPage);
      } catch {
        showToast("That file is not a valid CheckReport backup");
      }
    };
    reader.readAsText(file);
  }

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-page]");
    if (nav) return setPage(nav.dataset.page);
    const pageLink = event.target.closest("[data-page-link]");
    if (pageLink) return setPage(pageLink.dataset.pageLink);
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const id = action.dataset.id;
    const type = action.dataset.action;
    if (type === "new-inspection") newInspection();
    if (type === "edit-inspection") editInspection(id);
    if (type === "save-inspection") saveInspection();
    if (type === "print-inspection") printInspection();
    if (type === "use-template") newInspection(id);
    if (type === "create-template") createTemplate();
    if (type === "save-settings") saveSettings();
    if (type === "export-data") exportData();
    if (type === "restore-data") document.querySelector("#restoreInput").click();
    if (type === "clear-signature") {
      editorDraft.signature = "";
      renderEditor();
    }
    if (type === "add-section") {
      editorDraft.sections.push({ title: "New section", items: [] });
      renderEditor();
    }
    if (type === "delete-section") {
      const sectionIndex = Number(action.dataset.section);
      if (editorDraft.sections.length <= 1) return showToast("A report needs at least one section");
      if (confirm("Delete this section and all of its checks?")) {
        editorDraft.sections.splice(sectionIndex, 1);
        renderEditor();
      }
    }
    if (type === "add-check") {
      const sectionIndex = Number(action.dataset.section);
      editorDraft.sections[sectionIndex].items.push({
        id: uid("chk"), label: "New checklist item", result: "na", severity: "low", note: "", action: "", beforePhoto: "", afterPhoto: "", photoCaption: "",
      });
      renderEditor();
    }
    if (type === "delete-check") {
      const sectionIndex = Number(action.dataset.section);
      const itemIndex = Number(action.dataset.item);
      if (confirm("Remove this checklist row?")) {
        editorDraft.sections[sectionIndex].items.splice(itemIndex, 1);
        renderEditor();
      }
    }
    if (type === "remove-logo") {
      state.settings.logo = "";
      persist("Business logo removed");
      renderSettings();
    }
    if (type === "duplicate-inspection") {
      const source = state.inspections.find((item) => item.id === id);
      if (!source) return;
      const copy = structuredClone(source);
      copy.id = uid("ins");
      copy.number = `${source.number}-COPY`;
      copy.title = `${source.title} (Copy)`;
      copy.status = "draft";
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      state.inspections.unshift(copy);
      persist("Inspection duplicated");
      renderInspections();
    }
    if (type === "delete-inspection" && confirm("Delete this inspection permanently?")) {
      state.inspections = state.inspections.filter((item) => item.id !== id);
      persist("Inspection deleted");
      renderInspections();
    }
    if (type === "delete-template" && confirm("Delete this custom template?")) {
      state.templates = state.templates.filter((item) => item.id !== id);
      persist("Template deleted");
      renderTemplates();
    }
    if (type === "reset-demo" && confirm("Replace local data with the original demo data?")) {
      state = defaultState();
      editorDraft = null;
      persist("Demo data restored");
      renderSettings();
    }
  });

  document.querySelector("#quickNewButton").addEventListener("click", () => newInspection());
  document.querySelector("#backupButton").addEventListener("click", exportData);
  document.querySelector("#demoResetButton").addEventListener("click", () => {
    if (!confirm("Reset this browser demo to its original sample data?")) return;
    state = defaultState();
    editorDraft = null;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    persist("Demo data restored");
    setPage("dashboard");
  });
  document.querySelector("#menuButton").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));
  document.querySelector("#restoreInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) restoreData(file);
    event.target.value = "";
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  applyBranding();
  renderDashboard();
})();
