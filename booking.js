/*
  Sistema de citas de Contacto: servicio, fecha y hora, datos, revisión y confirmación.
  Demostración: la disponibilidad se simula de forma estable para cada fecha y la cita se guarda
  solo en este navegador; el resumen se envía al salón por WhatsApp para confirmarla.
*/
(function () {
  "use strict";
  var root = document.querySelector("[data-booking]");
  var catalog = document.getElementById("booking-services");
  if (!root || !catalog) return;

  var services;
  try { services = JSON.parse(catalog.textContent); } catch (e) { return; }
  if (!services.length) return;

  var site = window.SITE_CONFIG || {};
  var settings = site.booking || {};
  var salonName = String(site.salonName || "Marfil").trim() || "Marfil";
  var schedule = settings.schedule || { 1: ["10:00", "19:00"], 2: ["10:00", "19:00"], 3: ["10:00", "19:00"], 4: ["10:00", "19:00"], 5: ["10:00", "19:00"], 6: ["09:00", "15:00"] };
  var slotMinutes = Math.max(15, Number(settings.slotMinutes) || 30);
  var daysAhead = Math.max(7, Number(settings.daysAhead) || 60);
  var MAX_SERVICES = 3;
  var STORAGE_KEY = "marfil-citas-demo";

  var MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var CATEGORIES = { cabello: "Cabello", unas: "Uñas", cejas: "Cejas", pestanas: "Pestañas" };
  var ICONS = {
    check: '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M4 8.5 6.8 11 12 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M8 4.75V8l2.25 1.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    whatsapp: '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M3.2 12.8 3.9 10a5.3 5.3 0 1 1 2 2l-2.7.8Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.3 6.2c.1 1.5 1.9 3.3 3.5 3.5l.7-.8-1-.6-.5.4c-.6-.3-1.1-.8-1.4-1.4l.4-.5-.6-1-.8.6Z" fill="currentColor"/></svg>',
    download: '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function animated() { return !motion.matches && typeof root.animate === "function"; }
  var easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

  var form = root.querySelector("[data-booking-form]");
  var stage = root.querySelector("[data-booking-stage]");
  var steps = Array.prototype.slice.call(root.querySelectorAll(".bk-step"));
  var stepper = root.querySelector("[data-booking-steps]");
  var stepButtons = Array.prototype.slice.call(stepper.querySelectorAll("[data-goto]"));
  var backButton = root.querySelector("[data-back]");
  var nextButton = root.querySelector("[data-next]");
  var nextLabel = root.querySelector("[data-next-label]");
  var navInfo = root.querySelector("[data-nav-info]");
  var catsEl = root.querySelector("[data-booking-cats]");
  var servicesEl = root.querySelector("[data-booking-services]");
  var calTitle = root.querySelector("[data-cal-title]");
  var calGrid = root.querySelector("[data-cal-grid]");
  var calNav = Array.prototype.slice.call(root.querySelectorAll("[data-cal]"));
  var slotsTitle = root.querySelector("[data-slots-title]");
  var slotsGroups = root.querySelector("[data-slots-groups]");
  var slotsRange = root.querySelector("[data-slots-range]");
  var review = root.querySelector("[data-booking-review]");
  var summaryBody = root.querySelector("[data-summary-body]");
  var done = root.querySelector("[data-booking-done]");
  var live = root.querySelector("[data-booking-live]");
  var existing = root.querySelector("[data-booking-existing]");
  var notes = form.elements.notes;
  var notesCount = root.querySelector("[data-notes-count]");

  if (settings.demo !== false) root.querySelector("[data-booking-demo]").hidden = false;

  var today = startOfDay(new Date());
  var lastDay = addDays(today, daysAhead);
  var state = { step: 1, selected: [], category: "todos", date: null, time: null, month: new Date(today.getFullYear(), today.getMonth(), 1) };

  /* ---------- Utilidades de fecha y formato ---------- */
  function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function addDays(date, days) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days); }
  function sameDay(a, b) { return a && b && a.getTime() === b.getTime(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function fromKey(key) { var p = key.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function toMinutes(text) { var p = String(text).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
  function clock(minutes) { return pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60); }
  function longDate(date) { return DAYS[date.getDay()] + " " + date.getDate() + " de " + MONTHS[date.getMonth()]; }
  function capital(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
  function money(value) { return "$" + value.toLocaleString("es-MX") + " MXN"; }
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function announce(text) { live.textContent = ""; setTimeout(function () { live.textContent = text; }, 30); }

  function totals() {
    var chosen = state.selected.map(function (i) { return services[i]; });
    return {
      list: chosen,
      duration: chosen.reduce(function (sum, s) { return sum + s.duration; }, 0),
      value: chosen.reduce(function (sum, s) { return sum + s.value; }, 0),
      from: chosen.some(function (s) { return s.from; })
    };
  }
  function durationText(minutes) {
    if (minutes < 60) return minutes + " min";
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return h + " h" + (m ? " " + m + " min" : "");
  }

  /* ---------- Citas guardadas en este navegador ---------- */
  function readSaved() {
    try {
      var list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function writeSaved(list) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* sin almacenamiento, la cita sigue en pantalla */ }
  }
  function upcomingSaved() {
    var now = new Date();
    return readSaved().filter(function (b) {
      return b && b.date && typeof b.start === "number" && fromKey(b.date).getTime() + b.start * 60000 > now.getTime();
    }).sort(function (a, b) { return (a.date + clock(a.start)).localeCompare(b.date + clock(b.start)); });
  }

  /* ---------- Disponibilidad simulada (estable por fecha) ---------- */
  function seeded(text) {
    var h = 1779033703 ^ text.length;
    for (var i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }
  function hoursFor(date) {
    var hours = schedule[date.getDay()];
    if (!hours || hours.length < 2) return null;
    var open = toMinutes(hours[0]), close = toMinutes(hours[1]);
    return close > open ? { open: open, close: close } : null;
  }
  var busyCache = {};
  function busySlots(date) {
    var key = dayKey(date);
    if (busyCache[key]) return busyCache[key];
    var hours = hoursFor(date);
    if (!hours) return null;
    var count = Math.floor((hours.close - hours.open) / slotMinutes);
    var taken = new Array(count).fill(false);
    var random = seeded("marfil-" + key);
    // Más ocupado los sábados y en los días más cercanos, como en una agenda real.
    var distance = Math.round((date - today) / 86400000);
    var chance = 0.09 + (date.getDay() === 6 ? 0.06 : 0) + 0.1 * Math.max(0, 1 - distance / 18);
    for (var i = 0; i < count; i++) {
      if (random() < chance) {
        var length = 1 + Math.floor(random() * 4);
        for (var j = i; j < Math.min(count, i + length); j++) taken[j] = true;
        i += length;
      }
    }
    // Algunos días quedan llenos por completo.
    if (random() < 0.03 + (date.getDay() === 6 ? 0.04 : 0)) taken.fill(true);
    upcomingSaved().forEach(function (b) {
      if (b.date !== key) return;
      for (var k = Math.floor((b.start - hours.open) / slotMinutes); k < Math.ceil((b.start + b.duration - hours.open) / slotMinutes); k++) {
        if (k >= 0 && k < count) taken[k] = true;
      }
    });
    busyCache[key] = { hours: hours, taken: taken };
    return busyCache[key];
  }
  // Todos los inicios del día, marcando cuáles alcanzan para la duración elegida.
  function startsFor(date, duration) {
    var day = busySlots(date);
    if (!day) return [];
    var need = Math.max(1, Math.ceil(duration / slotMinutes));
    var now = new Date();
    var earliest = sameDay(date, today) ? now.getHours() * 60 + now.getMinutes() + 60 : -1;
    var result = [];
    // Solo se ofrecen inicios que terminan antes del cierre.
    for (var i = 0; i + need <= day.taken.length; i++) {
      var start = day.hours.open + i * slotMinutes;
      var free = true;
      for (var j = i; free && j < i + need; j++) if (day.taken[j]) free = false;
      if (start >= earliest) result.push({ start: start, free: free });
    }
    return result;
  }
  function dayStatus(date) {
    if (date < today || date > lastDay) return "off";
    if (!hoursFor(date)) return "closed";
    var free = startsFor(date, totals().duration || 60).filter(function (s) { return s.free; }).length;
    if (!free) return "full";
    return free <= 3 ? "few" : "open";
  }

  /* ---------- Paso 1: servicios ---------- */
  function renderCategories() {
    var cats = ["todos"].concat(Object.keys(CATEGORIES).filter(function (c) {
      return services.some(function (s) { return s.category === c; });
    }));
    catsEl.innerHTML = cats.map(function (c) {
      return '<button type="button" class="bk-chip" data-cat="' + c + '" aria-pressed="' + (c === state.category) + '">' + (c === "todos" ? "Todos" : CATEGORIES[c]) + "</button>";
    }).join("");
  }
  function renderServices() {
    servicesEl.innerHTML = services.map(function (s, i) {
      return '<li data-cat="' + escapeHtml(s.category) + '"><button type="button" class="bk-service" data-service="' + i + '" aria-pressed="false">' +
        '<span class="bk-service__check" aria-hidden="true">' + ICONS.check + "</span>" +
        '<span class="bk-service__cat">' + escapeHtml(CATEGORIES[s.category] || s.category) + "</span>" +
        '<span class="bk-service__name">' + escapeHtml(s.name) + "</span>" +
        '<span class="bk-service__desc">' + escapeHtml(s.description) + "</span>" +
        '<span class="bk-service__meta"><span>' + ICONS.clock + durationText(s.duration) + "</span><strong>" + escapeHtml(s.price.replace(/\s*MXN$/, "")) + "</strong></span>" +
        "</button></li>";
    }).join("");
  }
  function syncServices() {
    var full = state.selected.length >= MAX_SERVICES;
    servicesEl.querySelectorAll(".bk-service").forEach(function (btn) {
      var on = state.selected.indexOf(+btn.dataset.service) !== -1;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("is-muted", full && !on);
    });
  }
  catsEl.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-cat]");
    if (!chip || chip.dataset.cat === state.category) return;
    state.category = chip.dataset.cat;
    catsEl.querySelectorAll("[data-cat]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
    var shown = [];
    servicesEl.querySelectorAll("li").forEach(function (li) {
      li.hidden = !(state.category === "todos" || li.dataset.cat === state.category);
      if (!li.hidden) shown.push(li);
    });
    if (animated()) shown.forEach(function (li, i) {
      li.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: i * 35, easing: easeOut, fill: "backwards" });
    });
    resizeStage();
  });
  servicesEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-service]");
    if (!btn) return;
    var index = +btn.dataset.service;
    var at = state.selected.indexOf(index);
    if (at !== -1) state.selected.splice(at, 1);
    else if (state.selected.length >= MAX_SERVICES) { showError(1, "Puedes elegir hasta tres servicios por cita. Quita uno para cambiarlo."); return; }
    else state.selected.push(index);
    showError(1, "");
    syncServices();
    if (at === -1 && animated()) btn.querySelector(".bk-service__check").animate(
      [{ transform: "scale(0.4)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 420, easing: easeOut });
    // Cambia la duración: la hora elegida puede dejar de alcanzar.
    if (state.time !== null && state.date) {
      var still = startsFor(state.date, totals().duration).some(function (s) { return s.free && s.start === state.time; });
      if (!still) state.time = null;
    }
    announce(at === -1 ? services[index].name + " agregado." : services[index].name + " quitado.");
    update();
  });

  /* ---------- Paso 2: calendario y horarios ---------- */
  function renderCalendar(direction) {
    var month = state.month;
    calTitle.textContent = capital(MONTHS[month.getMonth()]) + " " + month.getFullYear();
    var first = new Date(month.getFullYear(), month.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7;
    var days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var html = "";
    for (var b = 0; b < offset; b++) html += '<span class="bk-day is-blank" aria-hidden="true"></span>';
    for (var d = 1; d <= days; d++) {
      var date = new Date(month.getFullYear(), month.getMonth(), d);
      var status = dayStatus(date);
      var label = longDate(date) + ({ open: ", disponible", few: ", pocos lugares", full: ", sin lugares", closed: ", cerrado", off: ", no disponible" })[status];
      var selected = sameDay(date, state.date);
      html += '<button type="button" class="bk-day is-' + status + (sameDay(date, today) ? " is-today" : "") + '" data-date="' + dayKey(date) + '"' +
        ' aria-label="' + label + '" aria-pressed="' + selected + '"' + (status === "open" || status === "few" ? "" : " disabled") + "><span>" + d + "</span><i aria-hidden=\"true\"></i></button>";
    }
    calGrid.innerHTML = html;
    // Un solo día entra en el orden de tabulación; las flechas recorren el mes.
    var focusable = calGrid.querySelector('.bk-day[aria-pressed="true"]') || calGrid.querySelector(".bk-day:not([disabled])");
    calGrid.querySelectorAll(".bk-day[data-date]").forEach(function (btn) { btn.tabIndex = btn === focusable ? 0 : -1; });
    var minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var maxMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
    calNav[0].disabled = month <= minMonth;
    calNav[1].disabled = month >= maxMonth;
    if (direction && animated()) {
      calGrid.animate([{ opacity: 0, transform: "translateX(" + direction * 28 + "px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: easeOut });
    }
  }
  function firstOpenDay() {
    for (var d = new Date(today); d <= lastDay; d = addDays(d, 1)) {
      var status = dayStatus(d);
      if (status === "open" || status === "few") return d;
    }
    return null;
  }
  function selectDate(date, quiet) {
    state.date = date;
    if (state.time !== null && !startsFor(date, totals().duration).some(function (s) { return s.free && s.start === state.time; })) state.time = null;
    if (date.getMonth() !== state.month.getMonth() || date.getFullYear() !== state.month.getFullYear()) {
      state.month = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    renderCalendar();
    renderSlots(!quiet);
    if (!quiet) announce(capital(longDate(date)) + ". Elige un horario.");
    update();
  }
  function renderSlots(animate) {
    if (!state.date) {
      slotsTitle.textContent = "Elige un día para ver los horarios.";
      slotsGroups.innerHTML = "";
      slotsRange.textContent = "";
      return;
    }
    var duration = totals().duration || 60;
    var slots = startsFor(state.date, duration);
    var freeCount = slots.filter(function (s) { return s.free; }).length;
    slotsTitle.innerHTML = "<strong>" + capital(longDate(state.date)) + "</strong><span>" + freeCount + (freeCount === 1 ? " horario disponible" : " horarios disponibles") + "</span>";
    var groups = [{ label: "Mañana", items: [] }, { label: "Tarde", items: [] }];
    slots.forEach(function (s) { groups[s.start < 13 * 60 ? 0 : 1].items.push(s); });
    slotsGroups.innerHTML = groups.filter(function (g) { return g.items.length; }).map(function (g) {
      return '<div class="bk-slots__group"><p>' + g.label + '</p><div class="bk-slots__grid">' + g.items.map(function (s) {
        return '<button type="button" class="bk-slot" data-time="' + s.start + '" aria-pressed="' + (s.start === state.time) + '"' +
          (s.free ? "" : ' disabled aria-label="' + clock(s.start) + ', ocupado"') + ">" + clock(s.start) + "</button>";
      }).join("") + "</div></div>";
    }).join("") || '<p class="bk-slots__empty">Ya no quedan horarios para hoy. Elige otro día.</p>';
    renderRange();
    if (animate && animated()) {
      slotsGroups.querySelectorAll(".bk-slot").forEach(function (btn, i) {
        btn.animate([{ opacity: 0, transform: "translateY(8px) scale(0.96)" }, { opacity: btn.disabled ? 0.45 : 1, transform: "none" }],
          { duration: 360, delay: Math.min(i, 18) * 18, easing: easeOut, fill: "backwards" });
      });
    }
    resizeStage();
  }
  function renderRange() {
    slotsRange.textContent = state.time === null ? "" : "Tu cita: " + clock(state.time) + " – " + clock(state.time + (totals().duration || 60)) + " (aprox.)";
  }
  calNav.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dir = +btn.dataset.cal;
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + dir, 1);
      renderCalendar(dir);
    });
  });
  calGrid.addEventListener("click", function (e) {
    var btn = e.target.closest(".bk-day[data-date]");
    if (!btn || btn.disabled) return;
    selectDate(fromKey(btn.dataset.date));
    var again = calGrid.querySelector('[data-date="' + btn.dataset.date + '"]');
    if (again) {
      again.focus({ preventScroll: true });
      if (animated()) again.animate([{ transform: "scale(0.85)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 380, easing: easeOut });
    }
  });
  calGrid.addEventListener("keydown", function (e) {
    var moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in moves)) return;
    var current = e.target.closest(".bk-day[data-date]");
    if (!current) return;
    e.preventDefault();
    var target = addDays(fromKey(current.dataset.date), moves[e.key]);
    for (var tries = 0; tries < 14; tries++) {
      if (target < today || target > lastDay) return;
      var status = dayStatus(target);
      if (status === "open" || status === "few") break;
      target = addDays(target, moves[e.key] > 0 ? 1 : -1);
    }
    if (target.getMonth() !== state.month.getMonth()) {
      var dir = target > current ? 1 : -1;
      state.month = new Date(target.getFullYear(), target.getMonth(), 1);
      renderCalendar(dir);
    }
    var next = calGrid.querySelector('[data-date="' + dayKey(target) + '"]');
    if (next && !next.disabled) {
      calGrid.querySelectorAll(".bk-day[data-date]").forEach(function (b) { b.tabIndex = b === next ? 0 : -1; });
      next.focus();
    }
  });
  slotsGroups.addEventListener("click", function (e) {
    var btn = e.target.closest(".bk-slot");
    if (!btn || btn.disabled) return;
    state.time = +btn.dataset.time;
    slotsGroups.querySelectorAll(".bk-slot").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
    if (animated()) btn.animate([{ transform: "scale(0.9)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }], { duration: 360, easing: easeOut });
    showError(2, "");
    renderRange();
    announce("Horario " + clock(state.time) + " seleccionado.");
    update();
  });

  /* ---------- Paso 3: datos ---------- */
  function phoneDigits(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.indexOf("52") === 0) digits = digits.slice(2);
    if (digits.length === 13 && digits.indexOf("521") === 0) digits = digits.slice(3);
    return digits;
  }
  function prettyPhone(digits) { return digits.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3"); }
  function fieldError(input, message) {
    var box = document.getElementById(input.getAttribute("aria-describedby"));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.closest(".bk-field, .bk-check, .bk-step").classList.toggle("has-error", Boolean(message));
    if (box) box.textContent = message;
    return !message;
  }
  function validateDetails(focus) {
    var el = form.elements;
    var name = el.name.value.trim().replace(/\s+/g, " ");
    var digits = phoneDigits(el.phone.value);
    var email = el.email.value.trim();
    var checks = [
      [el.name, name.length < 3 ? "Escribe tu nombre para saber a quién esperamos." : ""],
      [el.phone, digits.length !== 10 ? "Escribe un número de WhatsApp de 10 dígitos." : ""],
      [el.email, email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "Revisa tu correo; parece incompleto." : ""]
    ];
    var firstBad = null;
    checks.forEach(function (c) { if (!fieldError(c[0], c[1]) && !firstBad) firstBad = c[0]; });
    if (firstBad && focus) {
      firstBad.focus();
      if (animated()) firstBad.closest(".bk-field").animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "none" }], { duration: 380 });
    }
    return !firstBad;
  }
  ["name", "phone", "email"].forEach(function (field) {
    form.elements[field].addEventListener("blur", function () {
      if (form.elements[field].getAttribute("aria-invalid") === "true") validateDetails(false);
    });
    form.elements[field].addEventListener("input", function () {
      if (form.elements[field].getAttribute("aria-invalid") === "true") validateDetails(false);
    });
  });
  form.elements.phone.addEventListener("blur", function () {
    var digits = phoneDigits(form.elements.phone.value);
    if (digits.length === 10) form.elements.phone.value = prettyPhone(digits);
  });
  notes.addEventListener("input", function () { notesCount.textContent = notes.value.length + " / 300"; });
  form.elements.policy.addEventListener("change", function () {
    if (form.elements.policy.checked) fieldError(form.elements.policy, "");
  });

  /* ---------- Resumen ---------- */
  function renderSummary() {
    var t = totals();
    var html = "";
    if (!t.list.length) {
      html = '<p class="bk-summary__empty">Elige uno o más servicios para empezar.</p>';
    } else {
      html = '<ul class="bk-summary__list">' + t.list.map(function (s) {
        return '<li><span>' + escapeHtml(s.name) + '<small>' + durationText(s.duration) + '</small></span><span>' + escapeHtml(s.price.replace(/\s*MXN$/, "")) + "</span></li>";
      }).join("") + "</ul>";
    }
    html += '<dl class="bk-summary__facts">' +
      '<div><dt>' + ICONS.calendar + 'Fecha</dt><dd>' + (state.date ? capital(longDate(state.date)) : "Por elegir") + "</dd></div>" +
      '<div><dt>' + ICONS.clock + 'Hora</dt><dd>' + (state.time !== null ? clock(state.time) + " – " + clock(state.time + (t.duration || 60)) : "Por elegir") + "</dd></div>" +
      "</dl>";
    if (t.list.length) {
      html += '<div class="bk-summary__total"><span>Total estimado<small>Duración aprox. ' + durationText(t.duration) + '</small></span><strong data-total>' + (t.from ? "<em>Desde</em> " : "") + money(t.value) + "</strong></div>";
      if (t.from) html += '<p class="bk-summary__note">El precio final se confirma en el salón según el largo y el estado de tu cabello, uñas o pestañas.</p>';
    }
    var previous = summaryBody.querySelectorAll(".bk-summary__list li").length;
    summaryBody.innerHTML = html;
    if (animated()) {
      var items = summaryBody.querySelectorAll(".bk-summary__list li");
      if (items.length > previous) items[items.length - 1].animate([{ opacity: 0, transform: "translateX(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: easeOut });
      var total = summaryBody.querySelector("[data-total]");
      if (total && items.length !== previous) total.animate([{ opacity: 0.4, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: easeOut });
    }
    navInfo.textContent = t.list.length ? t.list.length + (t.list.length === 1 ? " servicio" : " servicios") + " · " + durationText(t.duration) + " · " + (t.from ? "desde " : "") + money(t.value).replace(" MXN", "") : "";
  }

  function renderReview() {
    var t = totals();
    var el = form.elements;
    var first = form.querySelector('input[name="first"]:checked');
    review.innerHTML =
      '<div class="bk-review__block"><div class="bk-review__head"><h3>Servicios</h3><button type="button" class="bk-link" data-goto="1">Cambiar</button></div><ul>' +
      t.list.map(function (s) { return "<li><span>" + escapeHtml(s.name) + "</span><span>" + escapeHtml(s.price.replace(/\s*MXN$/, "")) + "</span></li>"; }).join("") + "</ul></div>" +
      '<div class="bk-review__block"><div class="bk-review__head"><h3>Fecha y hora</h3><button type="button" class="bk-link" data-goto="2">Cambiar</button></div>' +
      "<p>" + capital(longDate(state.date)) + ", de " + clock(state.time) + " a " + clock(state.time + t.duration) + " (aprox.)</p></div>" +
      '<div class="bk-review__block"><div class="bk-review__head"><h3>Tus datos</h3><button type="button" class="bk-link" data-goto="3">Cambiar</button></div>' +
      "<p>" + escapeHtml(el.name.value.trim()) + "<br>WhatsApp " + escapeHtml(prettyPhone(phoneDigits(el.phone.value))) +
      (el.email.value.trim() ? "<br>" + escapeHtml(el.email.value.trim()) : "") +
      (first ? "<br>Primera visita: " + escapeHtml(first.value) : "") +
      (notes.value.trim() ? '<br><span class="bk-review__notes">“' + escapeHtml(notes.value.trim()) + "”</span>" : "") + "</p></div>";
  }

  /* ---------- Pasos ---------- */
  function showError(step, message) {
    var box = root.querySelector('[data-error="' + step + '"]');
    if (!box) return;
    box.textContent = message;
    if (message && animated()) box.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: easeOut });
  }
  function canLeave(step, focus) {
    if (step === 1 && !state.selected.length) { showError(1, "Elige al menos un servicio para continuar."); return false; }
    if (step === 2 && (!state.date || state.time === null)) { showError(2, state.date ? "Elige un horario para continuar." : "Elige un día y un horario para continuar."); return false; }
    if (step === 3) return validateDetails(focus);
    return true;
  }
  var stageAnimation = null;
  function resizeStage(from) {
    if (!animated() || from === undefined) return;
    var to = stage.offsetHeight;
    if (Math.abs(to - from) < 2) return;
    if (stageAnimation) stageAnimation.cancel();
    stageAnimation = stage.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 420, easing: easeOut });
  }
  function goTo(target) {
    if (target === state.step) return;
    var forward = target > state.step;
    if (forward) {
      for (var s = state.step; s < target; s++) if (!canLeave(s, true)) { if (s !== state.step) goTo(s); return; }
    }
    var from = stage.offsetHeight;
    var leaving = steps[state.step - 1];
    var entering = steps[target - 1];
    leaving.hidden = true;
    entering.hidden = false;
    state.step = target;
    if (target === 2) {
      // Con otra duración, el día elegido puede haberse llenado.
      if (state.date && ["open", "few"].indexOf(dayStatus(state.date)) === -1) { state.date = null; state.time = null; }
      if (!state.date) { var day = firstOpenDay(); if (day) selectDate(day, true); }
      else { renderCalendar(); renderSlots(false); }
    }
    if (target === 4) renderReview();
    update();
    resizeStage(from);
    if (animated()) {
      entering.animate([{ opacity: 0, transform: "translateX(" + (forward ? 32 : -32) + "px)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: easeOut });
    }
    var top = root.getBoundingClientRect().top;
    if (top < 0) root.scrollIntoView({ behavior: animated() ? "smooth" : "auto", block: "start" });
    entering.querySelector("legend").focus({ preventScroll: true });
  }
  function update() {
    stepButtons.forEach(function (btn) {
      var n = +btn.dataset.goto;
      var item = btn.parentElement;
      item.classList.toggle("is-current", n === state.step);
      item.classList.toggle("is-done", n < state.step);
      if (n === state.step) btn.setAttribute("aria-current", "step"); else btn.removeAttribute("aria-current");
      btn.disabled = n > state.step;
    });
    stepper.style.setProperty("--progress", (state.step - 1) / (stepButtons.length - 1));
    backButton.hidden = state.step === 1;
    nextLabel.textContent = ["Elegir fecha y hora", "Continuar", "Revisar mi cita", "Confirmar cita"][state.step - 1];
    nextButton.classList.toggle("is-ready", (state.step === 1 && state.selected.length > 0) || (state.step === 2 && state.time !== null) || state.step >= 3);
    renderSummary();
  }
  stepper.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-goto]");
    if (btn && !btn.disabled) goTo(+btn.dataset.goto);
  });
  review.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-goto]");
    if (btn) goTo(+btn.dataset.goto);
  });
  backButton.addEventListener("click", function () { goTo(state.step - 1); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.step < 4) {
      if (canLeave(state.step, true)) goTo(state.step + 1);
      return;
    }
    if (!form.elements.policy.checked) {
      fieldError(form.elements.policy, "Confirma que avisarás si no puedes asistir.");
      form.elements.policy.focus();
      return;
    }
    confirmBooking();
  });

  /* ---------- Confirmación ---------- */
  function folio() {
    var letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    var code = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
    return "MRF-" + pad(state.date.getDate()) + pad(state.date.getMonth() + 1) + "-" + code + Math.floor(100 + Math.random() * 900);
  }
  function whatsappText(b) {
    return "Hola, " + salonName + ". Quiero confirmar mi cita:\n" +
      "• " + (b.services.length > 1 ? "Servicios: " : "Servicio: ") + b.services.join(", ") + "\n" +
      "• Fecha: " + capital(longDate(fromKey(b.date))) + "\n" +
      "• Hora: " + clock(b.start) + " (aprox. " + durationText(b.duration) + ")\n" +
      "• Nombre: " + b.name + "\n" +
      "• WhatsApp: " + prettyPhone(b.phone) + "\n" +
      (b.notes ? "• Comentarios: " + b.notes + "\n" : "") +
      "Folio: " + b.folio;
  }
  function icsFile(b) {
    var date = fromKey(b.date);
    function stamp(minutes) { return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) + "T" + pad(Math.floor(minutes / 60)) + pad(minutes % 60) + "00"; }
    function esc(text) { return String(text).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
    var now = new Date();
    var utc = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//" + esc(salonName) + "//Citas//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:" + b.folio + "@" + salonName.toLowerCase().replace(/\W+/g, ""), "DTSTAMP:" + utc,
      "DTSTART:" + stamp(b.start), "DTEND:" + stamp(b.start + b.duration),
      "SUMMARY:" + esc("Cita en " + salonName + ": " + b.services.join(", ")),
      "DESCRIPTION:" + esc("Folio " + b.folio + ". Si no puedes asistir, avísanos con 24 horas de anticipación."),
      "LOCATION:" + esc(String(site.address || "").trim() || salonName),
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:" + esc("Tu cita en " + salonName), "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
  }
  function confirmBooking() {
    var t = totals();
    var el = form.elements;
    var booking = {
      folio: folio(),
      services: t.list.map(function (s) { return s.name; }),
      date: dayKey(state.date),
      start: state.time,
      duration: t.duration,
      total: (t.from ? "Desde " : "") + money(t.value),
      name: el.name.value.trim().replace(/\s+/g, " "),
      phone: phoneDigits(el.phone.value),
      email: el.email.value.trim(),
      notes: notes.value.trim(),
      reminder: el.reminder.checked
    };
    nextButton.disabled = true;
    nextButton.classList.add("is-loading");
    nextLabel.textContent = "Apartando tu lugar…";
    setTimeout(function () {
      var saved = readSaved();
      saved.push(booking);
      writeSaved(saved);
      busyCache = {};
      nextButton.disabled = false;
      nextButton.classList.remove("is-loading");
      showDone(booking);
    }, animated() ? 1200 : 300);
  }
  function showDone(b) {
    var from = stage.offsetHeight;
    var firstName = b.name.split(" ")[0];
    var url = window.SiteContact && window.SiteContact.whatsappUrl(whatsappText(b));
    done.innerHTML =
      '<div class="bk-done__mark" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" pathLength="1"/><path d="M20 33.5 28 41l16-17" pathLength="1"/></svg></div>' +
      '<p class="bk-done__eyebrow">Cita apartada</p>' +
      "<h3>¡Listo, " + escapeHtml(firstName) + "! Te esperamos.</h3>" +
      '<p class="bk-done__lead">Guardamos tu lugar. Envíanos el resumen por WhatsApp para confirmarla; te respondemos en horario de atención.</p>' +
      '<div class="bk-ticket">' +
      '<div class="bk-ticket__row"><span>Folio</span><strong class="bk-ticket__folio">' + b.folio + "</strong></div>" +
      '<div class="bk-ticket__row"><span>' + (b.services.length > 1 ? "Servicios" : "Servicio") + "</span><strong>" + escapeHtml(b.services.join(", ")) + "</strong></div>" +
      '<div class="bk-ticket__row"><span>Fecha</span><strong>' + capital(longDate(fromKey(b.date))) + "</strong></div>" +
      '<div class="bk-ticket__row"><span>Hora</span><strong>' + clock(b.start) + " – " + clock(b.start + b.duration) + "</strong></div>" +
      '<div class="bk-ticket__row"><span>Total estimado</span><strong>' + escapeHtml(b.total) + "</strong></div>" +
      "</div>" +
      '<div class="bk-done__actions">' +
      (url ? '<a class="btn btn--primary" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + ICONS.whatsapp + "Enviar a WhatsApp</a>"
           : '<a class="btn btn--primary" aria-disabled="true">' + ICONS.whatsapp + "WhatsApp por confirmar</a>") +
      '<button type="button" class="btn btn--line" data-ics>' + ICONS.download + "Añadir a mi calendario</button>" +
      "</div>" +
      '<button type="button" class="bk-link bk-done__again" data-again>Agendar otra cita</button>';
    form.hidden = true;
    done.hidden = false;
    stepper.style.setProperty("--progress", 1);
    stepButtons.forEach(function (btn) {
      btn.parentElement.classList.remove("is-current");
      btn.parentElement.classList.add("is-done");
      btn.disabled = true;
      btn.removeAttribute("aria-current");
    });
    root.classList.add("is-booked");
    resizeStage(from);
    done.querySelector("[data-ics]").addEventListener("click", function () {
      var blob = new Blob([icsFile(b)], { type: "text/calendar;charset=utf-8" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "cita-" + salonName.toLowerCase().replace(/\W+/g, "-") + "-" + b.date + ".ics";
      document.body.appendChild(link);
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
      announce("Descargamos el archivo para tu calendario.");
    });
    done.querySelector("[data-again]").addEventListener("click", resetBooking);
    if (animated()) {
      Array.prototype.slice.call(done.children).forEach(function (child, i) {
        if (i === 0) return;
        child.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 250 + i * 70, easing: easeOut, fill: "backwards" });
      });
    }
    var top = root.getBoundingClientRect().top;
    if (top < 0) root.scrollIntoView({ behavior: animated() ? "smooth" : "auto", block: "start" });
    done.focus({ preventScroll: true });
    announce("Cita apartada para el " + longDate(fromKey(b.date)) + " a las " + clock(b.start) + ". Folio " + b.folio + ".");
    renderExisting();
  }
  function resetBooking() {
    var from = stage.offsetHeight;
    state.selected = [];
    state.date = null;
    state.time = null;
    state.step = 1;
    state.month = new Date(today.getFullYear(), today.getMonth(), 1);
    form.reset();
    notesCount.textContent = "0 / 300";
    form.querySelectorAll("[aria-invalid]").forEach(function (input) { fieldError(input, ""); });
    steps.forEach(function (s, i) { s.hidden = i !== 0; });
    done.hidden = true;
    form.hidden = false;
    root.classList.remove("is-booked");
    syncServices();
    renderSlots(false);
    update();
    resizeStage(from);
    steps[0].querySelector("legend").focus({ preventScroll: true });
  }

  /* ---------- Cita guardada ---------- */
  function renderExisting() {
    var next = upcomingSaved()[0];
    if (!next || !existing) { if (existing) existing.hidden = true; return; }
    existing.innerHTML = '<span class="bk-existing__icon" aria-hidden="true">' + ICONS.calendar + "</span>" +
      "<p><strong>Tienes una cita apartada</strong> " + capital(longDate(fromKey(next.date))) + " a las " + clock(next.start) +
      " · " + escapeHtml(next.services.join(", ")) + ' <span class="bk-existing__folio">Folio ' + escapeHtml(next.folio) + "</span></p>" +
      '<button type="button" class="bk-link" data-cancel="' + escapeHtml(next.folio) + '">Cancelar cita</button>';
    existing.hidden = false;
  }
  existing.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    if (btn.dataset.confirming !== "true") {
      btn.dataset.confirming = "true";
      btn.textContent = "Sí, cancelar";
      return;
    }
    writeSaved(readSaved().filter(function (b) { return b.folio !== btn.dataset.cancel; }));
    busyCache = {};
    announce("Cita cancelada.");
    var hide = function () { renderExisting(); if (state.step === 2) { renderCalendar(); renderSlots(false); } };
    if (animated()) existing.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-6px)" }], { duration: 260, easing: "ease-in" }).finished.then(hide);
    else hide();
  });

  /* ---------- Inicio ---------- */
  renderCategories();
  renderServices();
  var params = new URLSearchParams(window.location.search);
  var wanted = (params.get("servicio") || "").trim().toLowerCase();
  if (wanted) services.forEach(function (s, i) { if (s.name.toLowerCase() === wanted && state.selected.length < MAX_SERVICES) state.selected.push(i); });
  var request = (params.get("mensaje") || "").slice(0, 300);
  if (request) { notes.value = request; notesCount.textContent = notes.value.length + " / 300"; }
  syncServices();
  renderExisting();
  update();
})();
