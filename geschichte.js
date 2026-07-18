/* ==========================================================================
   Manes am Bösch, Galerien auf der Startseite
   Liest galerien.json: aktualisiert die Räume-Karten (Featured + Anzahl)
   und baut die Geschichte-Bildergalerie inkl. Lightbox.
   ========================================================================== */
(function () {
  "use strict";
  function esc(s) { var d = document.createElement("div"); d.textContent = (s == null ? "" : String(s)); return d.innerHTML; }
  function attr(s) { return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

  function wireLightbox(tiles, title) {
    if (!tiles.length) { return; }
    var items = tiles.map(function (t) { return { full: t.getAttribute("data-full"), cap: t.getAttribute("data-caption") || "" }; });

    var lb = document.createElement("div");
    lb.className = "raeume-lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.hidden = true;
    lb.innerHTML =
      '<div class="rlb-backdrop" data-close></div>' +
      '<div class="rlb-inner">' +
        '<div class="rlb-top"><span class="rlb-title">' + esc(title || "") + '</span>' +
          '<span class="rlb-counter"></span>' +
          '<button type="button" class="rlb-close" data-close aria-label="Schließen">&times;</button></div>' +
        '<div class="rlb-stage">' +
          '<button type="button" class="rlb-nav rlb-prev" aria-label="Vorheriges Bild">&#8249;</button>' +
          '<img class="rlb-img" alt="">' +
          '<button type="button" class="rlb-nav rlb-next" aria-label="Nächstes Bild">&#8250;</button>' +
        '</div>' +
        '<p class="rlb-caption"></p>' +
      '</div>';
    document.body.appendChild(lb);

    var elImg = lb.querySelector(".rlb-img");
    var elCounter = lb.querySelector(".rlb-counter");
    var elCap = lb.querySelector(".rlb-caption");
    var idx = 0, lastFocus = null, n = items.length;
    if (n < 2) {
      lb.querySelector(".rlb-prev").hidden = true;
      lb.querySelector(".rlb-next").hidden = true;
      elCounter.hidden = true;
    }

    function unzoom() { elImg.classList.remove("is-zoomed"); elImg.style.transform = ""; elImg.style.transformOrigin = ""; }
    elImg.addEventListener("click", function (e) {
      if (elImg.classList.contains("is-zoomed")) { unzoom(); return; }
      var r = elImg.getBoundingClientRect();
      elImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
      elImg.style.transform = "scale(2)";
      elImg.classList.add("is-zoomed");
    });
    function preload(k) { var m = (k + n) % n; new Image().src = items[m].full; }
    function slide(k) {
      unzoom();
      idx = (k + n) % n; var it = items[idx];
      elImg.src = it.full; elImg.alt = it.cap; elCap.textContent = it.cap;
      elCounter.textContent = (idx + 1) + " / " + n;
      preload(idx + 1); preload(idx - 1);
    }
    function openAt(k) {
      lastFocus = document.activeElement;
      lb.hidden = false; document.documentElement.style.overflow = "hidden";
      slide(k); lb.querySelector(".rlb-close").focus();
    }
    function close() {
      lb.hidden = true; document.documentElement.style.overflow = "";
      elImg.removeAttribute("src");
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }
    tiles.forEach(function (t, i) { t.addEventListener("click", function (e) { e.preventDefault(); openAt(i); }); });
    lb.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) { close(); } });
    lb.querySelector(".rlb-prev").addEventListener("click", function () { slide(idx - 1); });
    lb.querySelector(".rlb-next").addEventListener("click", function () { slide(idx + 1); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) { return; }
      if (e.key === "Escape") { close(); }
      else if (e.key === "ArrowLeft") { slide(idx - 1); }
      else if (e.key === "ArrowRight") { slide(idx + 1); }
    });
    var sx = null, stage = lb.querySelector(".rlb-stage");
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (sx === null) { return; }
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { slide(idx + (dx < 0 ? 1 : -1)); }
      sx = null;
    }, { passive: true });
  }

  /* ---- Steak-Karte: Klick vergrößert das Bild (PDF nur über den Button) ---- */
  var steak = document.querySelector(".steak-karte-vorschau");
  if (steak) {
    steak.setAttribute("data-full", "images/steak-karte.webp?v=2");
    steak.setAttribute("data-caption", "Unsere Steak-Karte, jeden Freitag von 11:30 bis 15:00 Uhr");
    wireLightbox([steak], "Steak-Freitag");
  }

  /* ---- Ferien-Aushang: Klick vergrößert (PDF nur ohne JS) ---- */
  var fer = document.querySelector(".fh-media[data-full]");
  if (fer) { wireLightbox([fer], "Ferienbetrieb"); }

  fetch("galerien.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) { fallbackGeschichte(); return; }

      /* ---- Räume-Landing-Karten: Bild-Klick vergrößert nur (Galerie nur per Button) ---- */
      if (data.raeume) {
        var medien = [];
        Array.prototype.forEach.call(document.querySelectorAll("[data-raum]"), function (card) {
          var g = data.raeume[card.getAttribute("data-raum")];
          if (!g) { return; }
          var img = card.querySelector(".raum-card-media img");
          if (img && g.featured) { img.src = "images/raeume/" + g.featured + ".webp"; }
          var badge = card.querySelector(".raum-card-badge");
          if (badge) { badge.textContent = (Array.isArray(g.bilder) ? g.bilder.length : 0) + " Bilder"; }
          var media = card.querySelector(".raum-card-media");
          if (media && g.featured) {
            media.setAttribute("data-full", "images/raeume/" + g.featured + ".webp");
            media.setAttribute("data-caption", g.titel || "");
            medien.push(media);
          }
        });
        wireLightbox(medien, "Unsere Räumlichkeiten");
      }

      /* ---- Geschichte-Galerie bauen ---- */
      var grid = document.querySelector(".gg-grid");
      if (grid && Array.isArray(data.geschichte)) {
        grid.innerHTML = data.geschichte.map(function (it) {
          var cap = it.caption || "";
          return '<button type="button" class="gg-tile" data-full="images/geschichte/' + attr(it.bild) + '.webp" data-caption="' + attr(cap) + '">' +
            '<img src="images/geschichte/' + attr(it.bild) + '-t.webp" alt="' + attr(cap) + '" loading="lazy" decoding="async">' +
            '<span class="gg-cap">' + esc(cap) + '</span></button>';
        }).join("");
        wireLightbox(Array.prototype.slice.call(grid.querySelectorAll(".gg-tile")), "Das Haus im Wandel der Zeit");
      } else {
        fallbackGeschichte();
      }
    })
    .catch(function () { fallbackGeschichte(); });

  /* Falls galerien.json nicht lädt: vorhandene (im HTML gerenderte) Kacheln nutzen */
  function fallbackGeschichte() {
    var grid = document.querySelector(".gg-grid");
    if (grid) { wireLightbox(Array.prototype.slice.call(grid.querySelectorAll(".gg-tile")), "Das Haus im Wandel der Zeit"); }
  }
})();
