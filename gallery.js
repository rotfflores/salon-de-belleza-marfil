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

  var stage = image.parentElement;
  var counter = dialog.querySelector("[data-gallery-count]") || document.createElement("span");
  var caption = dialog.querySelector(".gallery-viewer__caption");
  var easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
  var ghost = null;
  var hiddenThumb = null;
  var enterTimer;
  var closing = false;
  var navigating = false;

  function pad(number) { return (number < 10 ? "0" : "") + number; }
  function animated() { return !motion.matches && typeof image.animate === "function"; }
  function thumbnailOf(index) { return visible[index].querySelector(".gallery-card__image img"); }

  function showImage(index) {
    currentIndex = (index + visible.length) % visible.length;
    var link = visible[currentIndex].querySelector("[data-gallery-open]");
    var thumbnail = link.querySelector("img");
    error.hidden = true;
    image.hidden = false;
    image.alt = thumbnail.alt;
    image.width = Number(thumbnail.getAttribute("width"));
    image.height = Number(thumbnail.getAttribute("height"));
    stage.classList.add("is-loading");
    image.src = link.getAttribute("href");
    if (image.complete && image.naturalWidth) stage.classList.remove("is-loading");
    title.textContent = link.dataset.title;
    meta.textContent = link.dataset.label + " · " + (currentIndex + 1) + " de " + visible.length;
    counter.innerHTML = "<b>" + pad(currentIndex + 1) + "</b> / " + pad(visible.length);
    var service = link.dataset.relatedService;
    serviceLine.hidden = !service;
    serviceLine.textContent = service ? "Servicio relacionado: " + service + (link.dataset.relatedPrice ? " · " + link.dataset.relatedPrice : "") : "";
    var message = "Hola, me gustó el estilo ‘" + link.dataset.title + "’ de su galería" + (service ? " (" + service + ")" : "") + ". ¿Podrían orientarme sobre el servicio y su precio?";
    window.SiteContact.setWhatsapp(consult, message, { context: true });
    previous.disabled = next.disabled = visible.length < 2;
  }

  // Espera a que la fotografía grande esté lista, sin bloquear más de lo razonable.
  function imageReady(limit) {
    if (image.complete && image.naturalWidth) return Promise.resolve();
    return new Promise(function (resolve) {
      var timer = setTimeout(done, limit);
      function done() {
        clearTimeout(timer);
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
        resolve();
      }
      image.addEventListener("load", done);
      image.addEventListener("error", done);
    });
  }

  // Rectángulo que ocupa la fotografía dentro del escenario (object-fit: contain).
  function pictureRect() {
    var box = image.getBoundingClientRect();
    // El atributo, no la propiedad: image.width devuelve el ancho pintado.
    var ratio = image.naturalWidth ? image.naturalWidth / image.naturalHeight : image.getAttribute("width") / image.getAttribute("height");
    var width = box.width;
    var height = width / ratio;
    if (height > box.height) { height = box.height; width = height * ratio; }
    return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width: width, height: height };
  }
  function onScreen(rect) {
    return rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  }
  function frame(rect) {
    return { left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px" };
  }

  // Una copia de la foto vuela entre la miniatura y el visor; object-fit: cover hace el paso de recorte a foto completa.
  function fly(source, from, to, options) {
    removeGhost();
    ghost = document.createElement("img");
    ghost.className = "gallery-viewer__ghost";
    ghost.alt = "";
    ghost.src = source.currentSrc || source.src;
    ghost.style.objectPosition = options.position || "";
    Object.assign(ghost.style, frame(from));
    dialog.appendChild(ghost);
    return ghost.animate([frame(from), frame(to)], { duration: options.duration, easing: options.easing, fill: "forwards" }).finished;
  }
  function removeGhost() {
    if (ghost) ghost.remove();
    ghost = null;
  }
  function revealThumb() {
    if (hiddenThumb) hiddenThumb.style.visibility = "";
    hiddenThumb = null;
  }

  function openViewer(link) {
    opener = link;
    closing = false;
    showImage(visible.indexOf(link.closest(".gallery-card")));
    scrollPosition = window.scrollY;
    bodyStyle = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflow: document.body.style.overflow };
    var thumbnail = thumbnailOf(currentIndex);
    var from = thumbnail.getBoundingClientRect();
    dialog.showModal();
    // Fija el fondo también en Safari móvil; el diálogo conserva su propio desplazamiento.
    document.body.style.position = "fixed";
    document.body.style.top = -scrollPosition + "px";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    close.focus({ preventScroll: true });
    if (!animated()) return;
    clearTimeout(enterTimer);
    dialog.classList.add("is-entering");
    enterTimer = setTimeout(function () { dialog.classList.remove("is-entering"); }, 1100);
    if (!onScreen(from)) {
      image.animate([{ opacity: 0, transform: "scale(0.94)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: easeOut });
      return;
    }
    image.style.opacity = "0";
    hiddenThumb = thumbnail;
    thumbnail.style.visibility = "hidden";
    var position = getComputedStyle(thumbnail).objectPosition;
    fly(thumbnail, from, pictureRect(), { duration: 620, easing: easeOut, position: position })
      .then(function () { return imageReady(1500); })
      .then(function () {
        if (closing || !ghost) return;
        image.style.opacity = "";
        var leaving = ghost;
        ghost = null;
        leaving.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out" }).finished.then(function () { leaving.remove(); });
      }, function () {});
  }

  function closeViewer() {
    if (!dialog.open || closing) return;
    if (!animated()) { dialog.close(); return; }
    closing = true;
    clearTimeout(enterTimer);
    dialog.classList.remove("is-entering");
    dialog.classList.add("is-closing");
    var target = thumbnailOf(currentIndex);
    var to = target.getBoundingClientRect();
    var done;
    if (onScreen(to) && !image.hidden && image.naturalWidth) {
      var from = pictureRect();
      revealThumb();
      image.style.transform = "";
      image.style.opacity = "0";
      hiddenThumb = target;
      target.style.visibility = "hidden";
      done = fly(image, from, to, { duration: 480, easing: "cubic-bezier(0.5, 0, 0.2, 1)", position: getComputedStyle(target).objectPosition });
    } else {
      done = image.animate([{ opacity: 1, transform: image.style.transform || "none" }, { opacity: 0, transform: "scale(0.92)" }],
        { duration: 320, easing: "ease-in", fill: "forwards" }).finished;
    }
    done.then(function () { if (closing) dialog.close(); }, function () {});
  }

  // Cambio de foto: la actual sale hacia un lado y la nueva entra desde el otro.
  function go(step) {
    if (visible.length < 2 || navigating || closing) return;
    if (!animated()) { showImage(currentIndex + step); return; }
    navigating = true;
    var direction = step > 0 ? 1 : -1;
    var start = image.style.transform || "none";
    var parts = [image, caption];
    var outs = parts.map(function (element, index) {
      return element.animate([
        { opacity: element === image ? getComputedStyle(image).opacity : 1, transform: index ? "none" : start },
        { opacity: 0, transform: "translateX(" + (-direction * (index ? 12 : 48)) + "px)" + (index ? "" : " scale(0.97)") }
      ], { duration: 200, easing: "ease-in", fill: "forwards" });
    });
    outs[0].finished.then(function () {
      image.style.transform = "";
      showImage(currentIndex + step);
      return imageReady(1500);
    }).then(function () {
      parts.forEach(function (element, index) {
        element.animate([
          { opacity: 0, transform: "translateX(" + (direction * (index ? 12 : 48)) + "px)" + (index ? "" : " scale(0.97)") },
          { opacity: 1, transform: "none" }
        ], { duration: index ? 420 : 460, delay: index ? 60 : 0, easing: easeOut, fill: "backwards" });
      });
      outs.forEach(function (animation) { animation.cancel(); });
      navigating = false;
    }, function () { navigating = false; });
  }

  grid.addEventListener("click", function (event) {
    var link = event.target.closest("[data-gallery-open]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // Sin soporte para dialog, el enlace abre la fotografía completa normalmente.
    if (typeof dialog.showModal !== "function") return;
    event.preventDefault();
    openViewer(link);
  });
  image.addEventListener("load", function () {
    var wasLoading = stage.classList.contains("is-loading");
    stage.classList.remove("is-loading");
    if (wasLoading && dialog.open && !ghost && !navigating && animated()) image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
  });
  image.addEventListener("error", function () { stage.classList.remove("is-loading"); image.hidden = true; error.hidden = false; });
  close.addEventListener("click", closeViewer);
  previous.addEventListener("click", function () { go(-1); });
  next.addEventListener("click", function () { go(1); });
  dialog.addEventListener("keydown", function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowRight" ? 1 : -1);
    }
    if (event.key === "Tab") {
      var controls = Array.from(dialog.querySelectorAll("button:not(:disabled), a[href]"));
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Escape usa el evento nativo cancel y desemboca en el mismo cierre animado y devolución de foco.
  dialog.addEventListener("cancel", function (event) { event.preventDefault(); closeViewer(); });
  // Tocar o hacer clic en el espacio libre alrededor de la foto también cierra.
  var backdropStart = false;
  function isEmptySpace(target) { return target === dialog || target === stage || target.classList.contains("gallery-viewer__shell"); }
  dialog.addEventListener("pointerdown", function (event) { backdropStart = isEmptySpace(event.target); });
  dialog.addEventListener("click", function (event) {
    if (backdropStart && isEmptySpace(event.target) && !swiped) closeViewer();
    backdropStart = false;
  });

  // En celular: deslizar a los lados cambia de foto y deslizar hacia abajo cierra.
  var swipe = null;
  var swiped = false;
  stage.addEventListener("pointerdown", function (event) {
    swiped = false;
    if (event.pointerType === "mouse" || !event.isPrimary || navigating || closing) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, dx: 0, dy: 0 };
  });
  stage.addEventListener("pointermove", function (event) {
    if (!swipe || event.pointerId !== swipe.id) return;
    swipe.dx = event.clientX - swipe.x;
    swipe.dy = event.clientY - swipe.y;
    if (!swipe.axis && Math.max(Math.abs(swipe.dx), Math.abs(swipe.dy)) > 10) {
      swipe.axis = Math.abs(swipe.dx) > Math.abs(swipe.dy) ? "x" : "y";
      try { stage.setPointerCapture(swipe.id); } catch (e) { /* sin captura, el gesto sigue igual */ }
    }
    if (swipe.axis === "x" && visible.length > 1) {
      image.style.transform = "translateX(" + swipe.dx * 0.85 + "px) rotate(" + swipe.dx * 0.01 + "deg)";
    } else if (swipe.axis === "y" && swipe.dy > 0) {
      image.style.transform = "translateY(" + swipe.dy + "px) scale(" + Math.max(0.82, 1 - swipe.dy / 1400) + ")";
      dialog.querySelector(".gallery-viewer__top").style.opacity = dialog.querySelector(".gallery-viewer__bottom").style.opacity = String(Math.max(0, 1 - swipe.dy / 160));
    }
  });
  function endSwipe(event) {
    if (!swipe || event.pointerId !== swipe.id) return;
    var gesture = swipe;
    swipe = null;
    if (!gesture.axis) return;
    swiped = true;
    var bars = [dialog.querySelector(".gallery-viewer__top"), dialog.querySelector(".gallery-viewer__bottom")];
    if (gesture.axis === "x" && Math.abs(gesture.dx) > 60 && event.type === "pointerup" && visible.length > 1) {
      go(gesture.dx < 0 ? 1 : -1);
      return;
    }
    if (gesture.axis === "y" && gesture.dy > 110 && event.type === "pointerup") {
      bars.forEach(function (bar) { bar.style.opacity = ""; });
      closeViewer();
      return;
    }
    var current = image.style.transform;
    image.style.transform = "";
    bars.forEach(function (bar) { bar.style.opacity = ""; });
    if (current && animated()) image.animate([{ transform: current }, { transform: "none" }], { duration: 380, easing: easeOut });
  }
  stage.addEventListener("pointerup", endSwipe);
  stage.addEventListener("pointercancel", endSwipe);

  dialog.addEventListener("close", function () {
    closing = false;
    swipe = null;
    clearTimeout(enterTimer);
    dialog.classList.remove("is-entering", "is-closing");
    image.getAnimations().forEach(function (animation) { animation.cancel(); });
    image.style.opacity = image.style.transform = "";
    removeGhost();
    revealThumb();
    Object.keys(bodyStyle).forEach(function (key) { document.body.style[key] = bodyStyle[key]; });
    var scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, scrollPosition);
    if (opener) opener.focus({ preventScroll: true });
    document.documentElement.style.scrollBehavior = scrollBehavior;
  });

})();
