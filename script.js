(function () {
  "use strict";

  var config = window.SITE_CONFIG || {};

  /* Nombre del salón */
  if (config.salonName) {
    document.querySelectorAll("[data-salon-name]").forEach(function (el) {
      el.textContent = config.salonName;
    });
    document.title = (document.body.dataset.pageTitle || "Cabello, uñas y belleza") + " · " + config.salonName;
  }

  /* Menú en celular */
  var header = document.querySelector("[data-header]");
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");
  var desktop = window.matchMedia("(min-width: 960px)");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var closeTimer = null;

  function setMenu(open, returnFocus) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".menu-toggle__label").textContent = open ? "Cerrar" : "Menú";
    header.classList.toggle("is-open", open);
    clearTimeout(closeTimer);

    if (open) {
      menu.classList.remove("is-closing");
      menu.hidden = false;
      var first = menu.querySelector("a");
      if (first) first.focus();
      return;
    }

    if (menu.hidden) return;
    // Cierre con una salida breve antes de ocultar el panel
    menu.classList.add("is-closing");
    closeTimer = setTimeout(function () {
      menu.hidden = true;
      menu.classList.remove("is-closing");
    }, reduceMotion.matches ? 0 : 220);
    if (returnFocus) toggle.focus();
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true", false);
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false, false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setMenu(false, true);
    });

    document.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !header.contains(e.target)) setMenu(false, false);
    });

    desktop.addEventListener("change", function (e) {
      if (e.matches && toggle.getAttribute("aria-expanded") === "true") setMenu(false, false);
    });
  }

  /* Entrada: espera tipografías y foto (máx. 900 ms) para animar sin saltos */
  var root = document.documentElement;
  var waits = [];
  if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
  document.querySelectorAll(".hero__bg img").forEach(function (img) {
    // Solo las capas visibles en este tamaño de pantalla
    if (img.offsetParent !== null && img.decode) waits.push(img.decode().catch(function () {}));
  });
  var timeout = new Promise(function (resolve) { setTimeout(resolve, 900); });
  var ready = Promise.race([Promise.all(waits), timeout]).then(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        root.classList.add("is-ready");
        resolve();
      });
    });
  });

  /* Movimiento del fondo: paralaje al bajar y un leve desplazamiento con el cursor */
  var hero = document.querySelector(".hero");
  var frame = document.querySelector("[data-parallax]");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };
  var rafId = null;

  function render() {
    rafId = null;
    if (!hero || !frame) return;
    if (reduceMotion.matches) {
      frame.style.transform = "";
      hero.style.removeProperty("--scroll");
      return;
    }
    var rect = hero.getBoundingClientRect();
    if (rect.bottom < 0) return;
    var progress = Math.min(Math.max(-rect.top / rect.height, 0), 1);
    hero.style.setProperty("--scroll", progress.toFixed(3));

    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;
    var shift = progress * hero.offsetHeight * 0.06;
    frame.style.transform = "translate3d(" + current.x.toFixed(2) + "px," + (shift + current.y).toFixed(2) + "px,0)";

    if (Math.abs(target.x - current.x) > 0.05 || Math.abs(target.y - current.y) > 0.05) schedule();
  }

  function schedule() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  if (hero) {
    hero.addEventListener("pointermove", function (e) {
      if (!finePointer.matches || reduceMotion.matches) return;
      var r = hero.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * -12;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * -8;
      schedule();
    });
    hero.addEventListener("pointerleave", function () {
      target.x = 0;
      target.y = 0;
      schedule();
    });
  }

  /* Línea inferior del encabezado al desplazarse */
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", function () {
    onScroll();
    schedule();
  }, { passive: true });
  window.addEventListener("resize", schedule);

  /* ---------- Servicios: filtros, entrada al desplazarse y desplegables ---------- */
  var services = document.querySelector("[data-services]");
  if (services) {
    var list = services.querySelector("[data-services-list]");
    var items = Array.prototype.slice.call(list.querySelectorAll(".svc"));
    var groups = Array.prototype.slice.call(list.querySelectorAll("[data-group]"));
    var filtersEl = services.querySelector("[data-filters]");
    var filterButtons = Array.prototype.slice.call(services.querySelectorAll("[data-filter]"));
    var status = services.querySelector("[data-services-status]");
    var labels = { todos: "", cabello: "Cabello", unas: "Uñas", cejas: "Cejas", pestanas: "Pestañas" };
    var activeCategory = "todos";
    var switchTimer = null;
    var heightTimer = null;

    function matches(item, category) {
      return category === "todos" || item.getAttribute("data-category") === category;
    }

    function plural(count) {
      return count + " " + (count === 1 ? "servicio" : "servicios");
    }

    // Número de servicios en cada filtro y en cada grupo
    services.querySelectorAll("[data-count]").forEach(function (el) {
      var category = el.getAttribute("data-count");
      el.textContent = items.filter(function (item) { return matches(item, category); }).length;
    });
    groups.forEach(function (group) {
      var el = group.querySelector("[data-group-count]");
      if (el) el.textContent = plural(group.querySelectorAll(".svc").length);
    });

    function updateStatus(category, count) {
      if (!status) return;
      status.textContent = category === "todos" ? plural(count) : plural(count) + " de " + labels[category];
    }

    // Orden de entrada escalonada: encabezados de grupo y servicios visibles
    function indexVisible() {
      var i = 0;
      list.querySelectorAll(".svc-group__head, .svc").forEach(function (el) {
        var hidden = el.closest("[hidden]");
        if (!hidden) el.style.setProperty("--i", i++);
      });
    }

    function apply(category) {
      var count = 0;
      items.forEach(function (item) {
        var show = matches(item, category);
        item.hidden = !show;
        if (show) count++;
      });
      groups.forEach(function (group) {
        group.hidden = !group.querySelector(".svc:not([hidden])");
      });
      indexVisible();
      updateStatus(category, count);
    }

    /* Indicador del filtro activo: se desliza de un filtro a otro */
    var indicator = null;
    function moveIndicator() {
      if (!indicator) return;
      var active = filtersEl.querySelector('[aria-pressed="true"]');
      if (!active) return;
      indicator.style.width = active.offsetWidth + "px";
      indicator.style.height = active.offsetHeight + "px";
      indicator.style.transform = "translate(" + active.offsetLeft + "px," + active.offsetTop + "px)";
    }
    if (filtersEl && filterButtons.length) {
      indicator = document.createElement("span");
      indicator.className = "filters__indicator";
      indicator.setAttribute("aria-hidden", "true");
      filtersEl.appendChild(indicator);
      filtersEl.classList.add("has-indicator");
      moveIndicator();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { filtersEl.classList.add("is-animated"); });
      });
      window.addEventListener("resize", moveIndicator);
      ready.then(moveIndicator);
    }

    function selectCategory(category) {
      if (category === activeCategory) return;
      activeCategory = category;
      filterButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-filter") === category));
      });
      moveIndicator();
      // Lo que aún no había entrado en pantalla se muestra con la entrada del filtro
      revealAll();

      clearTimeout(switchTimer);
      clearTimeout(heightTimer);
      if (reduceMotion.matches) {
        apply(category);
        return;
      }

      // Salida breve, cambio de contenido y entrada escalonada, con la altura animada
      var startHeight = list.offsetHeight;
      list.classList.remove("is-entering");
      list.classList.add("is-leaving");
      switchTimer = setTimeout(function () {
        list.classList.remove("is-leaving");
        list.style.height = startHeight + "px";
        apply(category);
        list.style.height = "auto";
        var endHeight = list.offsetHeight;
        list.style.height = startHeight + "px";
        void list.offsetHeight;
        list.style.height = endHeight + "px";
        list.classList.add("is-entering");
        heightTimer = setTimeout(function () {
          list.style.height = "";
        }, 460);
      }, 160);
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCategory(btn.getAttribute("data-filter"));
        // En celular, lleva el filtro elegido a la vista
        if (btn.scrollIntoView && filtersEl.scrollWidth > filtersEl.clientWidth) {
          btn.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
        }
      });
    });

    apply(activeCategory);

    /* Entrada al desplazarse: cada pieza aparece al llegar a la pantalla, en cascada */
    var revealables = Array.prototype.slice.call(services.querySelectorAll(
      ".sv-reveal, .services__title, .svc-group__head, .svc, .sv-item"
    ));
    var revealer = null;

    function revealAll() {
      revealables.forEach(function (el) { el.classList.add("is-revealed"); });
      if (revealer) revealer.disconnect();
    }

    ready.then(function () {
      if (!("IntersectionObserver" in window) || reduceMotion.matches) {
        revealAll();
        return;
      }
      revealer = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.style.setProperty("--stagger", Math.min(n++, 6) * 80 + "ms");
          el.classList.add("is-revealed");
          revealer.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealables.forEach(function (el) { revealer.observe(el); });
    });

    /* Desplegables ("Qué incluye" y preguntas): abren y cierran con la altura animada */
    services.querySelectorAll("details").forEach(function (details) {
      var summary = details.querySelector("summary");
      var panel = summary && summary.nextElementSibling;
      var animation = null;
      if (!panel) return;

      summary.addEventListener("click", function (e) {
        if (reduceMotion.matches || !panel.animate) return;
        e.preventDefault();
        var closing = details.classList.contains("is-closing");
        var from = details.open ? panel.getBoundingClientRect().height : 0;
        if (animation) {
          animation.onfinish = null;
          animation.cancel();
        }

        if (!details.open || closing) {
          details.classList.remove("is-closing");
          details.open = true;
          var to = panel.getBoundingClientRect().height;
          animation = panel.animate(
            [{ height: from + "px", opacity: from ? 1 : 0 }, { height: to + "px", opacity: 1 }],
            { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
          );
          animation.onfinish = function () { animation = null; };
        } else {
          details.classList.add("is-closing");
          animation = panel.animate(
            [{ height: from + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
            { duration: 280, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }
          );
          animation.onfinish = function () {
            details.open = false;
            details.classList.remove("is-closing");
            animation = null;
          };
        }
      });
    });
  }

  /* ---------- Fondos con objetos (Servicios y Galería): entrada y paralaje suave ---------- */
  Array.prototype.slice.call(document.querySelectorAll("[data-backdrop]")).forEach(function (backdrop) {
    var section = backdrop.parentElement;
    var props = Array.prototype.slice.call(backdrop.querySelectorAll("[data-prop]"));
    // La luz no se desplaza: está sobre la superficie, igual que la sección.
    var moving = props.filter(function (el) { return el.getAttribute("data-prop") !== "light"; });
    ready.then(function () {
      if (!("IntersectionObserver" in window) || reduceMotion.matches) {
        props.forEach(function (el) { el.classList.add("is-in"); });
        return;
      }
      var propRevealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          propRevealer.unobserve(entry.target);
        });
      }, { threshold: 0.3 });
      props.forEach(function (el) { propRevealer.observe(el); });
    });
    var propsTicking = false;
    var moveProps = function () {
      propsTicking = false;
      if (reduceMotion.matches) {
        moving.forEach(function (el) { el.style.removeProperty("--prop-shift"); });
        return;
      }
      var rect = section.getBoundingClientRect();
      var viewport = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewport) return;
      // Arriba quedan en su sitio cuando la sección llega bajo el encabezado y abajo cuando su final toca el borde
      // de la pantalla. Se mueven más despacio que la página, así que los bordes recortados nunca se ven.
      var headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      var topShift = Math.max(-60, Math.min(160, (headerBottom - rect.top) * 0.22));
      var bottomShift = Math.min(120, Math.abs(rect.bottom - viewport) * 0.22);
      moving.forEach(function (el) {
        el.style.setProperty("--prop-shift", (el.getAttribute("data-prop") === "top" ? topShift : bottomShift).toFixed(1) + "px");
      });
    };
    var queueProps = function () {
      if (!propsTicking) { propsTicking = true; requestAnimationFrame(moveProps); }
    };
    window.addEventListener("scroll", queueProps, { passive: true });
    window.addEventListener("resize", queueProps);
    moveProps();
  });

  /* ---------- Galería: entrada al desplazarse ---------- */
  var galleryEl = document.querySelector("[data-gallery]");
  if (galleryEl) {
    var galleryItems = Array.prototype.slice.call(galleryEl.querySelectorAll(".gw-reveal, .gw-item, .gallery-card"));
    var galleryRevealer = null;
    var revealGallery = function () {
      galleryItems.forEach(function (el) { el.classList.add("is-revealed"); });
      if (galleryRevealer) galleryRevealer.disconnect();
    };
    // Al filtrar, las fotos que aún no habían entrado se muestran con la animación del filtro
    galleryEl.querySelectorAll("[data-gallery-filter]").forEach(function (btn) {
      btn.addEventListener("click", revealGallery);
    });
    ready.then(function () {
      if (!("IntersectionObserver" in window) || reduceMotion.matches) {
        revealGallery();
        return;
      }
      galleryRevealer = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.setProperty("--stagger", Math.min(n++, 6) * 90 + "ms");
          entry.target.classList.add("is-revealed");
          galleryRevealer.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
      galleryItems.forEach(function (el) { galleryRevealer.observe(el); });
    });
  }

  /* ---------- Nuestro salón: entrada al desplazarse y paralaje suave del arco ---------- */
  var salonEl = document.querySelector("[data-salon]");
  if (salonEl) {
    var salonItems = Array.prototype.slice.call(salonEl.querySelectorAll(".sl-reveal, .sl-item"));
    ready.then(function () {
      if (!("IntersectionObserver" in window) || reduceMotion.matches) {
        salonItems.forEach(function (el) { el.classList.add("is-revealed"); });
        return;
      }
      var salonRevealer = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.setProperty("--stagger", Math.min(n++, 6) * 110 + "ms");
          entry.target.classList.add("is-revealed");
          salonRevealer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      salonItems.forEach(function (el) { salonRevealer.observe(el); });
    });
    var archImage = salonEl.querySelector("[data-salon-parallax]");
    if (archImage) {
      var archTicking = false;
      var moveArch = function () {
        archTicking = false;
        if (reduceMotion.matches) { archImage.style.removeProperty("--parallax"); return; }
        var rect = archImage.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        // De -1 (entrando por abajo) a 1 (saliendo por arriba): la foto se desplaza un poco más lento que la página
        var progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2 + rect.height / 2);
        archImage.style.setProperty("--parallax", (progress * 18).toFixed(1) + "px");
      };
      window.addEventListener("scroll", function () {
        if (!archTicking) { archTicking = true; requestAnimationFrame(moveArch); }
      }, { passive: true });
      moveArch();
    }
  }

  /* ---------- Respuesta al tocar: una onda desde el punto de contacto (solo táctil) ---------- */
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" || reduceMotion.matches) return;
    var target = e.target.closest(".btn, .filter, .gallery-viewer__control, .gallery-card__link, .combo, .bk-service, .bk-day, .bk-slot, .bk-chip");
    if (!target) return;
    // En las fotos de la galería la onda va sobre la imagen
    var host = target.classList.contains("gallery-card__link") ? target.querySelector(".gallery-card__image") : target;
    if (!host) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.style.overflow = "hidden";
    var rect = host.getBoundingClientRect();
    var ripple = document.createElement("span");
    ripple.className = "tap-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.setProperty("--size", Math.max(rect.width, rect.height) * 2.2 + "px");
    ripple.style.setProperty("--x", e.clientX - rect.left + "px");
    ripple.style.setProperty("--y", e.clientY - rect.top + "px");
    host.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 700);
  }, { passive: true });
})();
