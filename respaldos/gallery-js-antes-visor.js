(function () {
  "use strict";
  var gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;
  var grid = gallery.querySelector(".gallery-grid");
  var cards = Array.from(grid.querySelectorAll(".gallery-card"));
  var filters = Array.from(gallery.querySelectorAll("[data-gallery-filter]"));
  var status = gallery.querySelector("[data-gallery-status]");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var dialog = gallery.querySelector("[data-gallery-viewer]");
  var image = dialog.querySelector("[data-gallery-image]");
  var title = dialog.querySelector("[data-gallery-title]");
  var meta = dialog.querySelector("[data-gallery-meta]");
  var consult = dialog.querySelector("[data-gallery-consult]");
  var close = dialog.querySelector("[data-gallery-close]");
  var previous = dialog.querySelector("[data-gallery-prev]");
  var next = dialog.querySelector("[data-gallery-next]");
  var error = dialog.querySelector("[data-gallery-error]");
  var serviceLine = dialog.querySelector("[data-gallery-service]") || document.createElement("p");
  var visible = cards.slice();
  var currentIndex = 0;
  var opener = null;
  var activeCategory = "todos";
  var filterTimer;
  var animations = [];
  var scrollPosition = 0;
  var bodyStyle;

  function matches(card, category) {
    return category === "todos" || card.dataset.galleryCategory === category;
  }
  filters.forEach(function (button) {
    button.querySelector(".filter__count").textContent = cards.filter(function (card) {
      return matches(card, button.dataset.galleryFilter);
    }).length;
    button.addEventListener("click", function () {
      var category = button.dataset.galleryFilter;
      if (category === activeCategory) return;
      activeCategory = category;
      clearTimeout(filterTimer);
      animations.forEach(function (animation) { animation.cancel(); });
      animations = [];
      filters.forEach(function (filter) {
        filter.setAttribute("aria-pressed", String(filter === button));
      });
      function applyFilter() {
        grid.classList.remove("is-leaving");
        grid.classList.toggle("is-all", category === "todos");
        cards.forEach(function (card) { card.hidden = !matches(card, category); });
        visible = cards.filter(function (card) { return !card.hidden; });
        var categoryLabel = category === "todos" ? "" : " de " + visible[0].querySelector("[data-gallery-open]").dataset.label;
        status.textContent = visible.length + (visible.length === 1 ? " imagen" : " imágenes") + categoryLabel;
        if (!motion.matches && grid.animate) {
          visible.forEach(function (card, index) {
            animations.push(card.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
              { duration: 340, delay: index * 35, easing: "ease-out", fill: "backwards" }));
          });
        }
      }
      if (motion.matches) applyFilter();
      else {
        grid.classList.add("is-leaving");
        filterTimer = setTimeout(applyFilter, 160);
      }
      if (button.parentElement.scrollWidth > button.parentElement.clientWidth) {
        button.scrollIntoView({ block: "nearest", inline: "nearest", behavior: motion.matches ? "auto" : "smooth" });
      }
    });
  });

  function showImage(index) {
    currentIndex = (index + visible.length) % visible.length;
    var link = visible[currentIndex].querySelector("[data-gallery-open]");
    var thumbnail = link.querySelector("img");
    error.hidden = true;
    image.hidden = false;
    image.alt = thumbnail.alt;
    image.width = Number(thumbnail.getAttribute("width"));
    image.height = Number(thumbnail.getAttribute("height"));
    image.src = link.getAttribute("href");
    title.textContent = link.dataset.title;
    meta.textContent = link.dataset.label + " · " + (currentIndex + 1) + " / " + visible.length;
    var service = link.dataset.relatedService;
    serviceLine.hidden = !service;
    serviceLine.textContent = service ? "Servicio relacionado: " + service + (link.dataset.relatedPrice ? " · " + link.dataset.relatedPrice : "") : "";
    var message = "Hola, me gustó el estilo ‘" + link.dataset.title + "’ de su galería" + (service ? " (" + service + ")" : "") + ". ¿Podrían orientarme sobre el servicio y su precio?";
    window.SiteContact.setWhatsapp(consult, message, { context: true });
    previous.disabled = next.disabled = visible.length < 2;
  }

  grid.addEventListener("click", function (event) {
    var link = event.target.closest("[data-gallery-open]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // Sin soporte para dialog, el enlace abre la fotografía completa normalmente.
    if (typeof dialog.showModal !== "function") return;
    event.preventDefault();
    opener = link;
    showImage(visible.indexOf(link.closest(".gallery-card")));
    scrollPosition = window.scrollY;
    bodyStyle = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflow: document.body.style.overflow };
    dialog.showModal();
    // Fija el fondo también en Safari móvil; el diálogo conserva su propio desplazamiento.
    document.body.style.position = "fixed";
    document.body.style.top = -scrollPosition + "px";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    close.focus({ preventScroll: true });
  });
  image.addEventListener("error", function () { image.hidden = true; error.hidden = false; });
  close.addEventListener("click", function () { dialog.close(); });
  previous.addEventListener("click", function () { showImage(currentIndex - 1); });
  next.addEventListener("click", function () { showImage(currentIndex + 1); });
  dialog.addEventListener("keydown", function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showImage(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
    if (event.key === "Tab") {
      var controls = Array.from(dialog.querySelectorAll("button:not(:disabled), a[href]"));
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Escape usa el evento nativo cancel y desemboca en el mismo cierre y devolución de foco.
  dialog.addEventListener("cancel", function (event) { event.preventDefault(); dialog.close(); });
  var backdropStart = false;
  dialog.addEventListener("pointerdown", function (event) { backdropStart = event.target === dialog; });
  dialog.addEventListener("click", function (event) {
    if (backdropStart && event.target === dialog) dialog.close();
    backdropStart = false;
  });
  dialog.addEventListener("close", function () {
    Object.keys(bodyStyle).forEach(function (key) { document.body.style[key] = bodyStyle[key]; });
    var scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, scrollPosition);
    if (opener) opener.focus({ preventScroll: true });
    document.documentElement.style.scrollBehavior = scrollBehavior;
  });

})();
