/* ==========================================================================
   Manes am Bösch, Speisekarten-Vorschau
   Rendert die erste PDF-Seite jeder Karte als Bild (PDF.js, Canvas).
   Lazy: erst wenn die Karte in den sichtbaren Bereich scrollt.
   ========================================================================== */
(function () {
  "use strict";
  if (typeof pdfjsLib === "undefined") { return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";

  function render(el) {
    var url = el.getAttribute("data-pdf");
    var canvas = el.querySelector("canvas");
    if (!url || !canvas) { return; }
    pdfjsLib.getDocument({ url: url, isEvalSupported: false }).promise.then(function (pdf) {
      return pdf.getPage(1);
    }).then(function (page) {
      var cssWidth = el.clientWidth || 380;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var base = page.getViewport({ scale: 1 });
      var scale = (cssWidth * dpr) / base.width;
      var vp = page.getViewport({ scale: scale });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    }).then(function () {
      el.classList.add("is-ready");
    }).catch(function () {
      el.classList.add("is-error");
    });
  }

  /* Download-Button: lädt Innen- und Außenseite (beide PDFs) mit einem Klick. */
  Array.prototype.slice.call(document.querySelectorAll("[data-download]")).forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var list = btn.getAttribute("data-download").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      if (list.length < 2) { return; } // nur ein PDF: normalen Link-Download nutzen
      e.preventDefault();
      list.forEach(function (url, i) {
        window.setTimeout(function () {
          var a = document.createElement("a");
          a.href = url;
          a.download = "";
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, i * 500);
      });
    });
  });

  /* ---- Lightbox: Klick auf die Vorschau vergrößert (PDF nur über den Button) ---- */
  var lb = null, lbImg = null;
  function ensureLightbox() {
    if (lb) { return; }
    lb = document.createElement("div");
    lb.className = "raeume-lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.hidden = true;
    lb.innerHTML =
      '<div class="rlb-backdrop" data-close></div>' +
      '<div class="rlb-inner">' +
        '<div class="rlb-top"><span class="rlb-title"></span>' +
        '<button type="button" class="rlb-close" data-close aria-label="Schließen">&times;</button></div>' +
        '<div class="rlb-stage"><img class="rlb-img" alt=""></div>' +
      '</div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector(".rlb-img");
    function unzoom() { lbImg.classList.remove("is-zoomed"); lbImg.style.transform = ""; lbImg.style.transformOrigin = ""; }
    lbImg.addEventListener("click", function (e) {
      if (lbImg.classList.contains("is-zoomed")) { unzoom(); return; }
      var r = lbImg.getBoundingClientRect();
      lbImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
      lbImg.style.transform = "scale(2)";
      lbImg.classList.add("is-zoomed");
    });
    lb.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) {
        lb.hidden = true; unzoom(); lbImg.removeAttribute("src");
        document.documentElement.style.overflow = "";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (!lb.hidden && e.key === "Escape") {
        lb.hidden = true; unzoom(); lbImg.removeAttribute("src");
        document.documentElement.style.overflow = "";
      }
    });
  }
  function openLightbox(url, title) {
    ensureLightbox();
    lb.querySelector(".rlb-title").textContent = title || "";
    lbImg.removeAttribute("src");
    lb.hidden = false;
    document.documentElement.style.overflow = "hidden";
    pdfjsLib.getDocument({ url: url, isEvalSupported: false }).promise.then(function (pdf) { return pdf.getPage(1); }).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var scale = Math.min(2200 / base.width, 4);
      var vp = page.getViewport({ scale: scale });
      var c = document.createElement("canvas");
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(function () {
        return c.toDataURL("image/jpeg", 0.9);
      });
    }).then(function (dataUrl) {
      lbImg.src = dataUrl;
      lbImg.alt = title || "Speisekarte";
    }).catch(function () {
      /* Render fehlgeschlagen: PDF direkt öffnen als Fallback */
      lb.hidden = true;
      document.documentElement.style.overflow = "";
      window.open(url, "_blank", "noopener");
    });
  }

  var previews = Array.prototype.slice.call(document.querySelectorAll(".pdf-vorschau[data-pdf]"));
  if (!previews.length) { return; }
  previews.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var fig = el.closest("figure");
      var cap = fig ? fig.querySelector("figcaption") : null;
      var karte = el.closest(".pdf-karte");
      var titel = karte ? karte.querySelector(".pdf-karte-titel") : null;
      openLightbox(el.getAttribute("data-pdf"), (titel ? titel.textContent : "Speisekarte") + (cap ? ", " + cap.textContent : ""));
    });
  });

  if (!("IntersectionObserver" in window)) {
    previews.forEach(render);
    return;
  }
  var obs = new IntersectionObserver(function (entries, o) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { render(e.target); o.unobserve(e.target); }
    });
  }, { rootMargin: "300px 0px" });
  previews.forEach(function (el) { obs.observe(el); });
})();
