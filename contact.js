(function () {
  "use strict";
  var config = window.SITE_CONFIG || {};
  var pending = "Información por confirmar";
  var message = config.whatsappMessage || "Hola, me gustaría consultar disponibilidad para una cita.";
  function phone(value) {
    var raw = String(value || "").trim();
    if (!/^\+?[\d\s().-]+$/.test(raw)) return "";
    var digits = raw.replace(/\D/g, "");
    return /^[1-9]\d{7,14}$/.test(digits) && !/(\d)\1{6}/.test(digits) ? digits : "";
  }
  var number = config.isDemo ? "" : phone(config.whatsappNumber);
  function whatsappUrl(text) {
    return number ? "https://wa.me/" + number + "?text=" + encodeURIComponent(text) : null;
  }
  function setWhatsapp(link, text, options) {
    options = options || {};
    var url = whatsappUrl(text);
    link.removeAttribute("aria-disabled");
    if (url) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.removeAttribute("target");
      if (options.disable) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
      } else {
        link.href = "contacto.html" + (options.context ? "?mensaje=" + encodeURIComponent(text) : "") + "#reservas";
      }
    }
  }
  // También lo usa el visor: una sola validación y política de contacto para todo el sitio.
  window.SiteContact = { setWhatsapp: setWhatsapp, whatsappUrl: whatsappUrl, phone: phone };
  document.querySelectorAll("[data-whatsapp]").forEach(function (el) { setWhatsapp(el, message); });
  document.querySelectorAll("[data-service]").forEach(function (el) {
    var text = (config.serviceMessage || "Hola, me interesa el servicio de {servicio}. ¿Podrían compartirme disponibilidad y confirmar el precio?")
      .replace("{servicio}", el.dataset.service);
    setWhatsapp(el, text, { context: true });
  });
  document.querySelectorAll("[data-whatsapp-text]").forEach(function (el) { setWhatsapp(el, el.dataset.whatsappText, { context: true }); });
  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = String(value || "").trim() || pending; });
  }
  setText("[data-contact-address]", config.address);
  setText("[data-contact-references]", config.references);
  document.querySelectorAll("[data-contact-hours]").forEach(function (el) {
    var hours = Array.isArray(config.hours) ? config.hours.filter(function (row) {
      return row && typeof row.days === "string" && row.days.trim() && typeof row.time === "string" && row.time.trim();
    }) : [];
    if (!hours.length) return;
    var dl = document.createElement("dl");
    dl.className = "contact-hours";
    hours.forEach(function (row) {
      var wrap = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = row.days; dd.textContent = row.time;
      wrap.append(dt, dd); dl.append(wrap);
    });
    el.replaceChildren(dl);
  });
  document.querySelectorAll("[data-contact-whatsapp]").forEach(function (el) {
    // México (52 + 10 dígitos) se muestra agrupado: +52 618 205 1723.
    if (number) el.textContent = (el.dataset.contactPrefix || "") + (/^52\d{10}$/.test(number) ? number.replace(/^52(\d{3})(\d{3})(\d{4})$/, "+52 $1 $2 $3") : "+" + number);
    setWhatsapp(el, message, { disable: true });
  });
  var telephone = phone(config.phoneNumber);
  document.querySelectorAll("[data-contact-phone]").forEach(function (el) {
    if (!telephone) return;
    el.textContent = "+" + telephone;
    el.href = "tel:+" + telephone;
    el.removeAttribute("aria-disabled");
  });
  var handle = String(config.instagram || "").trim().replace(/^@/, "");
  document.querySelectorAll("[data-contact-instagram]").forEach(function (el) {
    if (!/^(?=.{1,30}$)[\w](?:[\w.]*(?:[\w]))?$/.test(handle) || handle.includes("..")) return;
    el.textContent = (el.dataset.contactPrefix || "") + "@" + handle;
    el.href = "https://www.instagram.com/" + encodeURIComponent(handle) + "/";
    el.target = "_blank"; el.rel = "noopener noreferrer";
    el.removeAttribute("aria-disabled");
  });
  var facebook = String(config.facebook || "").trim();
  var facebookUrl = String(config.facebookUrl || "").trim();
  if (!/^https:\/\/(www\.|m\.)?facebook\.com\/./.test(facebookUrl)) facebookUrl = "";
  document.querySelectorAll("[data-contact-facebook]").forEach(function (el) {
    if (!facebook && !facebookUrl) return;
    el.textContent = (el.dataset.contactPrefix || "") + (facebook || "Facebook");
    el.href = facebookUrl || "https://www.facebook.com/search/top?q=" + encodeURIComponent(facebook);
    el.target = "_blank"; el.rel = "noopener noreferrer";
    el.removeAttribute("aria-disabled");
  });
  var location = config.location || {};
  if (typeof location.latitude === "number" && Number.isFinite(location.latitude) && Math.abs(location.latitude) <= 90 &&
      typeof location.longitude === "number" && Number.isFinite(location.longitude) && Math.abs(location.longitude) <= 180) {
    var coordinates = location.latitude + "," + location.longitude;
    document.querySelectorAll("[data-contact-map]").forEach(function (el) {
      el.src = "https://maps.google.com/maps?q=" + encodeURIComponent(coordinates) + "&z=16&output=embed";
      el.hidden = false;
    });
    document.querySelectorAll("[data-map-placeholder]").forEach(function (el) { el.hidden = true; });
    document.querySelectorAll("[data-directions]").forEach(function (el) {
      el.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(coordinates);
      el.target = "_blank"; el.rel = "noopener noreferrer"; el.hidden = false;
    });
  }
  var request = new URLSearchParams(window.location.search).get("mensaje");
  if (request) request = request.slice(0, 1000);
  document.querySelectorAll("[data-booking-context]").forEach(function (el) {
    if (!request) return;
    el.textContent = "Tu consulta: " + request;
    el.hidden = false;
  });
  document.querySelectorAll("[data-booking-whatsapp]").forEach(function (el) { setWhatsapp(el, request || message, { disable: true }); });
  document.querySelectorAll("[data-booking-notice]").forEach(function (el) { el.hidden = Boolean(number); });
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
