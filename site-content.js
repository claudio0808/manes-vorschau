/* ==========================================================================
   Manes am Bösch, Website-Inhalte aus content.json
   Wird vom Admin-Panel geschrieben, hier nur gelesen und eingesetzt.
   Die HTML-Standardwerte bleiben als Fallback, falls das Laden scheitert.
   ========================================================================== */
(function () {
  "use strict";

  function esc(s) { var d = document.createElement("div"); d.textContent = (s == null ? "" : String(s)); return d.innerHTML; }
  function setText(el, v) { if (el && v != null) { el.textContent = v; } }
  function fmtDe(n) { var x = parseInt(n, 10); return isNaN(x) ? String(n) : x.toLocaleString("de-DE"); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  fetch("content.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c) { return; }

      /* ---- Info-Leiste ---- */
      var bar = document.querySelector("[data-newsbar]");
      if (bar && c.infoleiste) {
        if (c.infoleiste.aktiv === false) {
          document.documentElement.classList.add("no-newsbar");
        } else {
          var t = bar.querySelector(".news-text");
          setText(t, c.infoleiste.text);
        }
      }

      /* ---- Ferien-Hinweis ---- */
      var fh = document.querySelector("[data-ferien]");
      if (fh && c.ferien) {
        if (c.ferien.aktiv === false) {
          fh.hidden = true;
        } else {
          setText(fh.querySelector("[data-ferien-titel]"), c.ferien.titel);
          setText(fh.querySelector("[data-ferien-text]"), c.ferien.text);
          var fz = fh.querySelector("[data-ferien-zeiten]");
          if (fz && Array.isArray(c.ferien.zeiten)) {
            fz.innerHTML = c.ferien.zeiten.map(function (z) {
              return "<li><span>" + esc(z.tag) + "</span><span>" + esc(z.zeit) + "</span></li>";
            }).join("");
          }
        }
      }

      /* ---- Öffnungszeiten (Sektion) ---- */
      var ht = document.querySelector("[data-hours]");
      if (ht && Array.isArray(c.oeffnungszeiten)) {
        ht.innerHTML = c.oeffnungszeiten.map(function (z) {
          return "<tr><th scope=\"row\">" + esc(z.tag) + "</th><td>" + esc(z.zeit) + "</td></tr>";
        }).join("");
      }

      /* ---- Öffnungszeiten (Footer) ---- */
      var hf = document.querySelector("[data-hours-footer]");
      if (hf && Array.isArray(c.oeffnungszeitenFooter)) {
        hf.innerHTML = c.oeffnungszeitenFooter.map(function (z) {
          return "<li><span>" + esc(z.tag) + "</span><span>" + esc(z.zeit) + "</span></li>";
        }).join("");
      }

      /* ---- Bewertung ---- */
      if (c.bewertung) {
        var wert = c.bewertung.wert;
        var anzahl = c.bewertung.anzahl;
        if (wert != null && wert !== "") {
          all("[data-rating-wert]").forEach(function (el) { el.textContent = wert; });
          var num = parseFloat(String(wert).replace(",", "."));
          if (!isNaN(num)) {
            var pct = Math.max(0, Math.min(100, num / 5 * 100));
            var sf = document.querySelector("[data-stars]");
            if (sf) { sf.style.width = pct + "%"; sf.setAttribute("data-fill", String(pct)); }
          }
        }
        if (anzahl != null && anzahl !== "") {
          var f = fmtDe(anzahl);
          all("[data-rating-anzahl]").forEach(function (el) { el.textContent = f; });
          var ct = document.querySelector("[data-count-to]");
          if (ct) { ct.setAttribute("data-count-to", String(parseInt(anzahl, 10) || 0)); }
        }
      }
    })
    .catch(function () { /* Fallback: HTML-Standardwerte bleiben */ });
})();
