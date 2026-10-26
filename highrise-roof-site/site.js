// Page behaviour that works without WebGL: motion toggle, roof system data + layer list,
// borough picker, estimate form. scene.js listens to the events fired here.
(function () {
  "use strict";

  // Typical assemblies, listed top (weather side) to bottom (deck).
  var SYSTEMS = {
    flat: {
      name: "Flat roof, TPO membrane",
      desc: "The workhorse of NYC rooftops. A heat-welded single-ply membrane over rigid insulation, built for low-slope roofs on row houses, apartment buildings and commercial blocks. We also install PVC, EPDM rubber, modified bitumen and liquid applied systems.",
      layers: [
        { name: "TPO membrane", detail: "White single-ply sheet with hot-air welded seams. Reflects summer heat.", color: "#e8ecea", h: 0.06, kind: "membrane" },
        { name: "Cover board", detail: "Protects the insulation from foot traffic and hail.", color: "#b9b2a4", h: 0.08 },
        { name: "Polyiso insulation", detail: "Rigid foam boards, often tapered so water runs to the drains.", color: "#d9c46d", h: 0.32 },
        { name: "Vapor barrier", detail: "Keeps warm indoor moisture out of the roof build-up.", color: "#3f5866", h: 0.04 },
        { name: "Roof deck", detail: "The structural base: plank, plywood, steel or concrete.", color: "#8c6f4f", h: 0.16, kind: "deck" }
      ]
    },
    shingle: {
      name: "Shingle roof",
      desc: "Asphalt, architectural and designer shingles for pitched roofs, installed over a full underlayment so the roof stays dry even where a shingle lifts.",
      layers: [
        { name: "Architectural shingles", detail: "Laminated asphalt shingles with a dimensional, shadowed look.", color: "#3b3f43", h: 0.1, kind: "shingles" },
        { name: "Synthetic underlayment", detail: "A second water barrier under every shingle course.", color: "#5f7d8c", h: 0.03 },
        { name: "Ice and water shield", detail: "Self-adhering membrane at eaves, valleys and around penetrations.", color: "#25292b", h: 0.03 },
        { name: "Plywood deck", detail: "Sound sheathing is checked and replaced where it has rotted.", color: "#b88d5b", h: 0.14, kind: "deck" }
      ]
    },
    metal: {
      name: "Standing seam metal",
      desc: "Interlocking metal panels with raised seams and hidden fasteners. Light, long lasting and sheds snow and rain quickly.",
      layers: [
        { name: "Standing seam panels", detail: "Raised seams lock the panels together, with no exposed screws.", color: "#a2abae", h: 0.05, kind: "ribs" },
        { name: "High-temp underlayment", detail: "Rated for the heat that builds up under metal.", color: "#41535c", h: 0.03 },
        { name: "Plywood deck", detail: "Solid sheathing that the panel clips fasten into.", color: "#b88d5b", h: 0.14, kind: "deck" }
      ]
    },
    slate: {
      name: "Natural slate",
      desc: "Split stone tiles laid in overlapping courses, the roof on many of the city's historic homes. We repair, restore and install slate.",
      layers: [
        { name: "Natural slate tiles", detail: "Each tile is nailed and overlaps the two courses below it.", color: "#4c5763", h: 0.1, kind: "tiles" },
        { name: "Felt underlayment", detail: "Heavy felt that backs up the stone during installation and repairs.", color: "#2f2c29", h: 0.03 },
        { name: "Plank or plywood deck", detail: "Slate is heavy, so the deck and framing must be sound.", color: "#9a7a52", h: 0.16, kind: "deck" }
      ]
    },
    green: {
      name: "Green roof system",
      desc: "A planted roof that soaks up stormwater, cools the building and lasts longer because the membrane is shielded from sun and weather.",
      layers: [
        { name: "Sedum plants", detail: "Hardy, shallow-rooted plants suited to rooftops.", color: "#6f9a4a", h: 0.12, kind: "plants" },
        { name: "Growing medium", detail: "Lightweight engineered soil, a few inches deep.", color: "#5b4431", h: 0.16 },
        { name: "Filter fabric", detail: "Keeps soil from washing into the drainage layer.", color: "#cfc8b8", h: 0.025 },
        { name: "Drainage mat", detail: "Holds some water for the plants and drains the rest.", color: "#2f3637", h: 0.08 },
        { name: "Root barrier", detail: "Stops roots from reaching the waterproofing.", color: "#3f6e4f", h: 0.03 },
        { name: "Waterproof membrane", detail: "The layer that keeps the building dry.", color: "#1f2324", h: 0.04 },
        { name: "Insulation", detail: "Rigid boards for energy efficiency.", color: "#d9c46d", h: 0.2 },
        { name: "Roof deck", detail: "Structural deck checked for the extra weight.", color: "#8c6f4f", h: 0.16, kind: "deck" }
      ]
    }
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.HR = { systems: SYSTEMS, system: "flat", layer: -1, explode: 0.55, paused: reduce.matches };

  function emit(name) { document.dispatchEvent(new CustomEvent(name)); }

  // Motion toggle (hero + explorer animations)
  var motionBtn = document.getElementById("motion-toggle");
  function syncMotion() {
    motionBtn.setAttribute("aria-pressed", String(HR.paused));
    motionBtn.querySelector(".motion-label").textContent = HR.paused ? "Play animation" : "Pause animation";
  }
  motionBtn.addEventListener("click", function () { HR.paused = !HR.paused; syncMotion(); emit("hr:motion"); });
  syncMotion();

  // Roof explorer: system buttons + layer list
  var list = document.getElementById("layer-list");
  var nameEl = document.getElementById("system-name");
  var descEl = document.getElementById("system-desc");
  var frame = document.getElementById("explorer-frame");
  var sysBtns = document.querySelectorAll("[data-system]");

  function renderSystem(key) {
    var s = SYSTEMS[key];
    HR.system = key; HR.layer = -1;
    nameEl.textContent = s.name;
    descEl.textContent = s.desc;
    frame.setAttribute("aria-label", "3D cutaway of a " + s.name.toLowerCase() + " with " + s.layers.length +
      " layers: " + s.layers.map(function (l) { return l.name; }).join(", ") + ". Use the arrow keys to rotate.");
    list.innerHTML = "";
    s.layers.forEach(function (l, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "layer-btn"; btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-controls", "layer-detail-" + i);
      btn.innerHTML = '<span class="mono">' + String(i + 1).padStart(2, "0") + '</span><span class="swatch" aria-hidden="true"></span><span class="name"></span>';
      btn.querySelector(".swatch").style.background = l.color;
      btn.querySelector(".name").textContent = l.name;
      var p = document.createElement("p");
      p.className = "layer-detail"; p.id = "layer-detail-" + i; p.hidden = true; p.textContent = l.detail;
      btn.addEventListener("click", function () { selectLayer(HR.layer === i ? -1 : i); });
      btn.addEventListener("mouseenter", function () { if (HR.layer === -1) { HR.hover = i; emit("hr:layer"); } });
      btn.addEventListener("mouseleave", function () { HR.hover = -1; emit("hr:layer"); });
      li.appendChild(btn); li.appendChild(p); list.appendChild(li);
    });
    sysBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.system === key)); });
    emit("hr:system");
  }
  function selectLayer(i) {
    HR.layer = i; HR.hover = -1;
    list.querySelectorAll(".layer-btn").forEach(function (b, j) {
      b.setAttribute("aria-pressed", String(j === i));
      document.getElementById("layer-detail-" + j).hidden = j !== i;
    });
    emit("hr:layer");
  }
  sysBtns.forEach(function (b) { b.addEventListener("click", function () { renderSystem(b.dataset.system); }); });

  var explode = document.getElementById("explode");
  explode.addEventListener("input", function () {
    HR.explode = explode.value / 100;
    explode.setAttribute("aria-valuetext", explode.value + " percent apart");
    emit("hr:explode");
  });
  document.querySelectorAll("[data-rotate]").forEach(function (b) {
    b.addEventListener("click", function () { HR.rotate = Number(b.dataset.rotate) * 0.6; emit("hr:rotate"); });
  });
  renderSystem("flat");

  // Borough picker
  var boroughLine = document.getElementById("borough-line");
  var bBtns = document.querySelectorAll("[data-borough]");
  bBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var name = b.dataset.borough;
      bBtns.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      boroughLine.textContent = name === "Brooklyn" ? "Yes, we cover Brooklyn. It's home." :
        "Yes, we cover " + (name === "Bronx" ? "the Bronx" : name) + ".";
    });
  });

  // Estimate form: validate, then hand off to the visitor's email app
  var form = document.getElementById("estimate-form");
  var status = document.getElementById("form-status");
  var rules = {
    name: function (v) { return v ? "" : "Enter your full name."; },
    email: function (v) { return !v ? "Enter your email address." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter an email address like name@example.com."; },
    phone: function (v) { return !v ? "Enter your phone number." : v.replace(/\D/g, "").length >= 10 ? "" : "Enter a 10-digit phone number, like 347-731-6076."; },
    address: function (v) { return v ? "" : "Enter the property address."; },
    message: function (v) { return v ? "" : "Tell us a little about the roof or the problem."; }
  };
  function check(field) {
    var msg = rules[field.name](field.value.trim());
    var err = document.getElementById("e-" + field.name);
    err.textContent = msg;
    if (msg) field.setAttribute("aria-invalid", "true"); else field.removeAttribute("aria-invalid");
    return !msg;
  }
  Object.keys(rules).forEach(function (n) {
    form.elements[n].addEventListener("blur", function (e) { if (e.target.value || e.target.hasAttribute("aria-invalid")) check(e.target); });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status"; status.textContent = "";
    var firstBad = null;
    Object.keys(rules).forEach(function (n) { if (!check(form.elements[n]) && !firstBad) firstBad = form.elements[n]; });
    if (firstBad) { firstBad.focus(); return; }
    var f = form.elements;
    var body = "Name: " + f.name.value + "\nEmail: " + f.email.value + "\nPhone: " + f.phone.value +
      "\nProperty address: " + f.address.value + "\nService: " + (f.service.value || "Not sure yet") + "\n\n" + f.message.value;
    if (window.HR_PREVIEW) {
      status.className = "form-status ok";
      status.textContent = "Preview only: on the live site this sends your request to info@highriseroof.com. For now, call 347-731-6076.";
      return;
    }
    window.location.href = "mailto:info@highriseroof.com?subject=" + encodeURIComponent("Free estimate request: " + f.address.value) +
      "&body=" + encodeURIComponent(body);
    status.className = "form-status ok";
    status.textContent = "Thanks, " + f.name.value.split(" ")[0] + ". Your email app should open with the request ready to send. If it doesn't, call 347-731-6076.";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
