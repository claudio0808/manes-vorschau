/* ==========================================================================
   Manes am Bösch, Räumlichkeiten-Galerie-Seite
   Liest ?raum= aus der URL und die Bilder aus galerien.json.
   ========================================================================== */
(function () {
  "use strict";

  var base = "images/raeume/";
  function pad(n) { return ("0" + n).slice(-2); }
  function esc(s) { var d = document.createElement("div"); d.textContent = (s == null ? "" : String(s)); return d.innerHTML; }
  function attr(s) { return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function setText(sel, txt) { var el = document.querySelector(sel); if (el) { el.textContent = txt; } }

  var slug = new URLSearchParams(location.search).get("raum");

  fetch("galerien.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var g = (data && data.raeume) ? data.raeume[slug] : null;
      if (!g) { location.replace("index.html#raeumlichkeiten"); return; }
      var bilder = Array.isArray(g.bilder) ? g.bilder : [];

      document.title = g.titel + " Galerie | Manes am Bösch, Dormagen";
      setText("[data-galerie-titel]", g.titel);
      setText("[data-galerie-desc]", g.text || "");
      setText("[data-galerie-count]", bilder.length + " Bilder");

      var grid = document.querySelector("[data-galerie-grid]");
      grid.innerHTML = "";
      bilder.forEach(function (name, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "galerie-tile";
        b.setAttribute("data-i", i);
        b.setAttribute("aria-label", "Bild " + (i + 1) + " von " + bilder.length + " vergrößern");
        b.innerHTML = '<img src="' + base + attr(name) + '-t.webp" alt="' + attr(g.titel) + ", Bild " + (i + 1) + '" loading="lazy" decoding="async">';
        grid.appendChild(b);
      });
      grid.style.setProperty("--cols", String(Math.min(6, Math.max(2, Math.ceil(Math.sqrt(bilder.length || 1))))));

      /* ---- Lightbox ---- */
      var lb = document.createElement("div");
      lb.className = "raeume-lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.hidden = true;
      lb.innerHTML =
        '<div class="rlb-backdrop" data-close></div>' +
        '<div class="rlb-inner">' +
          '<div class="rlb-top"><span class="rlb-title">' + esc(g.titel) + '</span>' +
            '<span class="rlb-counter"></span>' +
            '<button type="button" class="rlb-close" data-close aria-label="Schließen">&times;</button></div>' +
          '<div class="rlb-stage">' +
            '<button type="button" class="rlb-nav rlb-prev" aria-label="Vorheriges Bild">&#8249;</button>' +
            '<img class="rlb-img" alt="">' +
            '<button type="button" class="rlb-nav rlb-next" aria-label="Nächstes Bild">&#8250;</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(lb);

      var elImg = lb.querySelector(".rlb-img");
      var elCounter = lb.querySelector(".rlb-counter");
      var idx = 0, lastFocus = null;
      var count = bilder.length;

      function unzoom() { elImg.classList.remove("is-zoomed"); elImg.style.transform = ""; elImg.style.transformOrigin = ""; }
      elImg.addEventListener("click", function (e) {
        if (elImg.classList.contains("is-zoomed")) { unzoom(); return; }
        var r = elImg.getBoundingClientRect();
        elImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
        elImg.style.transform = "scale(2)";
        elImg.classList.add("is-zoomed");
      });
      function preload(n) { var m = (n + count) % count; new Image().src = base + bilder[m] + ".webp"; }
      function slide(n) {
        if (!count) { return; }
        unzoom();
        idx = (n + count) % count;
        elImg.src = base + bilder[idx] + ".webp";
        elImg.alt = g.titel + ", Bild " + (idx + 1);
        elCounter.textContent = (idx + 1) + " / " + count;
        preload(idx + 1); preload(idx - 1);
      }
      function openAt(n) {
        lastFocus = document.activeElement;
        lb.hidden = false;
        document.documentElement.style.overflow = "hidden";
        slide(n);
        lb.querySelector(".rlb-close").focus();
      }
      function close() {
        lb.hidden = true;
        document.documentElement.style.overflow = "";
        elImg.removeAttribute("src");
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
      }
      grid.addEventListener("click", function (e) {
        var t = e.target.closest(".galerie-tile");
        if (t) { openAt(parseInt(t.getAttribute("data-i"), 10)); }
      });
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
    })
    .catch(function () { location.replace("index.html#raeumlichkeiten"); });
})();
