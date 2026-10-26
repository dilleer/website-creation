// Page behaviour that works with or without WebGL: scene controls, component and layer
// lists, finish picker, residential/commercial tabs and the guided estimate form.
// scene.js listens to the "hr:*" events fired here.
(function () {
  "use strict";

  var HOTSPOTS = [
    { id: "ridge", name: "Ridge vent and cap", detail: "The peak of the roof. A continuous vent under the cap shingles lets hot, damp attic air out, which keeps the deck dry and the shingles from cooking in summer." },
    { id: "shingles", name: "Architectural shingles", detail: "The weather surface. Laminated shingles are nailed in overlapping courses so every nail is covered by the course above." },
    { id: "valley", name: "Valley", detail: "Where two roof planes meet and water concentrates. We line valleys with ice and water shield before the shingles go down." },
    { id: "skylight", name: "Skylight flashing", detail: "Step and saddle flashing kits around the frame. Most skylight leaks are flashing failures, not glass failures." },
    { id: "chimney", name: "Chimney flashing", detail: "Step flashing under each shingle course, counter-flashing cut into the masonry above it. A common source of leaks on older Brooklyn homes." },
    { id: "gutter", name: "Seamless gutter", detail: "Formed on site in one continuous length, so there are no joints to leak. Sized and pitched for how much roof drains into it." },
    { id: "downspout", name: "Downspout", detail: "Carries water from the gutter to grade and away from the foundation. We size them so the gutter never backs up in a downpour." },
    { id: "dripEdge", name: "Drip edge", detail: "Bent metal at the roof edge that sends water into the gutter instead of letting it wick back into the fascia board." }
  ];

  var FINISHES = {
    "shingle-charcoal": { type: "shingles", label: "Architectural shingle, Charcoal", color: "#34373b", rough: 0.95, metal: 0, note: "The most popular choice in the city. Dimensional, affordable, and fast to install." },
    "shingle-weathered": { type: "shingles", label: "Architectural shingle, Weathered wood", color: "#5c5249", rough: 0.95, metal: 0, note: "A warm brown-grey blend that suits brick and brownstone." },
    "shingle-pewter": { type: "shingles", label: "Architectural shingle, Pewter gray", color: "#6c7075", rough: 0.95, metal: 0, note: "A lighter grey that reflects a little more summer heat." },
    "metal-black": { type: "seam", label: "Standing seam metal, Matte black", color: "#1f2226", rough: 0.42, metal: 0.75, note: "Raised seams with hidden fasteners. Sheds snow and rain fast and lasts for decades." },
    "metal-galvalume": { type: "seam", label: "Standing seam metal, Galvalume", color: "#b8bfc6", rough: 0.3, metal: 0.95, note: "Bare zinc-aluminum coated steel. A clean, industrial silver." },
    "metal-bronze": { type: "seam", label: "Standing seam metal, Dark bronze", color: "#4b3b2d", rough: 0.4, metal: 0.8, note: "A deep brown metal that warms up modern facades." },
    "slate-natural": { type: "slate", label: "Natural slate, Gray", color: "#5d6570", rough: 0.7, metal: 0, note: "Split stone, laid by hand. The roof on many of New York's historic homes." },
    "slate-black": { type: "slate", label: "Natural slate, Vermont black", color: "#2d3036", rough: 0.6, metal: 0, note: "A near-black slate with a subtle sheen when wet." }
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.HR = {
    hotspots: HOTSPOTS, finishes: FINISHES,
    paused: reduce.matches, hotspot: null, layer: null, finish: "shingle-charcoal",
    orbit: 0, zoom: 0
  };
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ---- motion toggle ----
  var motionBtn = $("#motion-toggle");
  function syncMotion() {
    motionBtn.setAttribute("aria-pressed", String(HR.paused));
    $(".motion-label", motionBtn).textContent = HR.paused ? "Play motion" : "Pause motion";
  }
  motionBtn.addEventListener("click", function () { HR.paused = !HR.paused; syncMotion(); emit("hr:motion"); });
  syncMotion();

  // ---- scene 02: components ----
  var compList = $("#component-list");
  var compDetail = $("#component-detail");
  HOTSPOTS.forEach(function (h, i) {
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.dataset.hotspot = h.id; b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<span class="chip-num mono">' + String(i + 1).padStart(2, "0") + "</span>";
    b.appendChild(document.createTextNode(h.name));
    b.addEventListener("click", function () { selectHotspot(HR.hotspot === h.id ? null : h.id); });
    li.appendChild(b); compList.appendChild(li);
  });
  function selectHotspot(id) {
    HR.hotspot = id;
    $$("[data-hotspot]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.hotspot === id)); });
    var h = HOTSPOTS.filter(function (x) { return x.id === id; })[0];
    compDetail.innerHTML = "";
    if (h) {
      var t = document.createElement("p"); t.className = "detail-title"; t.textContent = h.name;
      var d = document.createElement("p"); d.textContent = h.detail;
      compDetail.appendChild(t); compDetail.appendChild(d);
    } else {
      compDetail.textContent = "Select a component to see what it does.";
    }
    emit("hr:hotspot");
    // on phones the panel is a short scrolling sheet: bring the answer into view
    var sheet = compDetail.closest(".panel"); if (sheet && id) sheet.scrollTop = 0;
  }
  window.HR.selectHotspot = selectHotspot;

  // The preview frame blocks tel: links, so say what would happen instead of failing silently.
  if (window.HR_PREVIEW) {
    var toast;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="tel:"]');
      if (!a) return;
      e.preventDefault();
      if (!toast) { toast = document.createElement("p"); toast.className = "preview-toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
      toast.textContent = "Calls can't be placed from this preview. On the live site this button dials 347-731-6076.";
      toast.hidden = false;
      clearTimeout(toast.t); toast.t = setTimeout(function () { toast.hidden = true; }, 5000);
    });
  }
  selectHotspot(null);

  $$("[data-orbit]").forEach(function (b) {
    b.addEventListener("click", function () { emit("hr:orbit", { d: Number(b.dataset.orbit) }); });
  });
  $$("[data-zoom]").forEach(function (b) {
    b.addEventListener("click", function () { emit("hr:zoom", { d: Number(b.dataset.zoom) }); });
  });
  $$("[data-view-reset]").forEach(function (b) {
    b.addEventListener("click", function () { emit("hr:reset"); });
  });

  // ---- scene 03: layers ----
  var layerDetail = $("#layer-detail");
  $$("[data-layer]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = HR.layer === b.dataset.layer ? null : b.dataset.layer;
      HR.layer = id;
      $$("[data-layer]").forEach(function (o) { o.setAttribute("aria-pressed", String(o.dataset.layer === id)); });
      layerDetail.textContent = id ? b.dataset.detail : "Select a layer to isolate it.";
      var sheet = layerDetail.closest(".panel"); if (sheet) sheet.scrollTop = 0;
      emit("hr:layer");
    });
  });

  // ---- scene 04: finishes ----
  var finishName = $("#finish-name"), finishNote = $("#finish-note");
  $$("[data-finish]").forEach(function (b) {
    var f = FINISHES[b.dataset.finish];
    b.querySelector(".swatch").style.background = f.color;
    b.addEventListener("click", function () {
      HR.finish = b.dataset.finish;
      $$("[data-finish]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      finishName.textContent = f.label;
      finishNote.textContent = f.note;
      emit("hr:finish");
    });
  });

  // ---- scene 05: residential / commercial tabs ----
  var tabs = $$('[role="tab"]');
  function showTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { showTab(t); });
    t.addEventListener("keydown", function (e) {
      var n = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (n) { e.preventDefault(); showTab(tabs[(i + n + tabs.length) % tabs.length], true); }
      if (e.key === "Home") { e.preventDefault(); showTab(tabs[0], true); }
      if (e.key === "End") { e.preventDefault(); showTab(tabs[tabs.length - 1], true); }
    });
  });

  // ---- scene 06: guided estimate ----
  var form = $("#estimate-form");
  var steps = $$(".form-step", form);
  var stepper = $$(".stepper li");
  var stepLabel = $("#step-label");
  var back = $("#step-back"), next = $("#step-next"), submit = $("#step-submit");
  var status = $("#form-status");
  var current = 0;

  var rules = {
    service: function () { return form.elements.service.value ? "" : "Choose the service you need."; },
    property: function () { return form.elements.property.value ? "" : "Choose the type of property."; },
    address: function (v) { return v ? "" : "Enter the property address."; },
    name: function (v) { return v ? "" : "Enter your full name."; },
    email: function (v) { return !v ? "Enter your email address." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter an email address like name@example.com."; },
    phone: function (v) { return !v ? "Enter your phone number." : v.replace(/\D/g, "").length >= 10 ? "" : "Enter a 10-digit phone number, like 347-731-6076."; }
  };
  var stepFields = [["service", "property"], ["address"], ["name", "email", "phone"]];

  function fieldEl(n) { var el = form.elements[n]; return el.length && !el.tagName ? el[0] : el; }
  function check(n) {
    var el = form.elements[n];
    var msg = rules[n](el.value ? el.value.trim() : "");
    var err = document.getElementById("e-" + n);
    err.textContent = msg;
    var target = el.tagName ? el : document.getElementById("g-" + n);
    if (msg) target.setAttribute("aria-invalid", "true"); else target.removeAttribute("aria-invalid");
    return !msg;
  }
  function go(i, noFocus) {
    current = i;
    steps.forEach(function (s, j) { s.hidden = j !== i; });
    stepper.forEach(function (li, j) {
      li.classList.toggle("done", j < i);
      if (j === i) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    stepLabel.textContent = "Step " + (i + 1) + " of " + steps.length;
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    submit.hidden = i !== steps.length - 1;
    var h = $("legend, h3", steps[i]);
    if (h && !noFocus) { h.setAttribute("tabindex", "-1"); h.focus(); }
  }
  function validStep(i) {
    var bad = null;
    stepFields[i].forEach(function (n) { if (!check(n) && !bad) bad = n; });
    if (bad) fieldEl(bad).focus();
    return !bad;
  }
  next.addEventListener("click", function () { if (validStep(current)) go(current + 1); });
  back.addEventListener("click", function () { go(current - 1); });
  form.addEventListener("change", function (e) {
    if (e.target.name === "service") {
      $("#emergency-note").hidden = e.target.value !== "Emergency leak";
      check("service");
    }
    if (e.target.name === "property") check("property");
  });
  ["address", "name", "email", "phone"].forEach(function (n) {
    form.elements[n].addEventListener("blur", function (e) { if (e.target.value || e.target.hasAttribute("aria-invalid")) check(n); });
  });
  // preselect from service cards elsewhere on the page
  $$("[data-prefill]").forEach(function (a) {
    a.addEventListener("click", function () {
      var radio = form.querySelector('input[name="service"][value="' + a.dataset.prefill + '"]');
      if (radio) { radio.checked = true; $("#emergency-note").hidden = radio.value !== "Emergency leak"; go(0, true); }
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validStep(current)) return;
    var f = form.elements;
    var summary = "Thanks, " + f.name.value.trim().split(" ")[0] + ". We have your request for " + f.service.value.toLowerCase() +
      " at " + f.address.value.trim() + ". We'll reach you by " + (f.contact.value || "phone") + " within one business day.";
    if (!window.HR_PREVIEW && form.dataset.endpoint) {
      fetch(form.dataset.endpoint, { method: "POST", body: new FormData(form) }).catch(function () {});
    }
    form.hidden = true;
    status.hidden = false;
    $("#status-text").textContent = summary + (window.HR_PREVIEW ? " (Preview only: nothing was sent.)" : "");
    status.focus();
  });
  go(0, true);

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
