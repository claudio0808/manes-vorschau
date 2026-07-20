/* ==========================================================================
   Manes am Bösch, Veranstaltungen
   Lädt veranstaltungen.json und rendert je nach Seite:
   - Landing:   [data-veranstaltungen="featured"]  (Feature-Karten)
   - Übersicht: [data-veranstaltungen="liste"]      (alle aktiven)
   - Detail:    [data-veranstaltung="detail"]        (?id=slug)
   Später schreibt das CMS (Ansatz A) dieselbe JSON.
   ========================================================================== */
(function () {
  "use strict";

  var URL_JSON = "veranstaltungen.json";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) { var d = document.createElement("div"); d.textContent = (s == null ? "" : String(s)); return d.innerHTML; }
  function attr(s) { return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function paramId() { var m = /[?&]id=([^&]*)/.exec(location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : ""; }
  function load() { return fetch(URL_JSON, { cache: "no-cache" }).then(function (r) { if (!r.ok) { throw new Error("HTTP " + r.status); } return r.json(); }); }
  function actives(data) { return (data && data.veranstaltungen ? data.veranstaltungen : []).filter(function (v) { return v.aktiv !== false; }); }

  var ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function cardHTML(v) {
    var badge = v.vorbei ? '<span class="vk-vorbei-badge">Bereits gelaufen</span>' : '';
    return '<a class="vk reveal' + (v.vorbei ? ' vk--vorbei' : '') + '" href="veranstaltung.html?id=' + encodeURIComponent(v.id) + '">'
      + '<div class="vk-bild" style="--vk-poster:url(\'' + attr(v.bild) + '\')">' + badge + '<img src="' + attr(v.bild) + '" alt="Plakat: ' + attr(v.titel) + '" loading="lazy" decoding="async"></div>'
      + '<div class="vk-body">'
      + '<span class="vk-kat">' + esc(v.kategorie) + '</span>'
      + '<h3 class="vk-titel">' + esc(v.titel) + '</h3>'
      + '<span class="vk-datum">' + esc(v.datum) + '</span>'
      + (v.teaser ? '<p class="vk-teaser">' + esc(v.teaser) + '</p>' : '')
      + '<span class="vk-mehr">Mehr erfahren ' + ARROW + '</span>'
      + '</div>'
      + '</a>';
  }

  /* gestaffelte Einblendung der eingefügten Karten, sobald sichtbar */
  function revealInjected(container) {
    var cards = Array.prototype.slice.call(container.querySelectorAll(".reveal"));
    if (!cards.length) { return; }
    function showAll() {
      cards.forEach(function (el, i) {
        if (reduceMotion) { el.classList.add("is-visible"); }
        else { setTimeout(function () { el.classList.add("is-visible"); }, i * 100); }
      });
    }
    if (reduceMotion || !("IntersectionObserver" in window)) { cards.forEach(function (el) { el.classList.add("is-visible"); }); return; }
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (e) { if (e.isIntersecting) { showAll(); o.disconnect(); } });
    }, { threshold: 0.15 });
    obs.observe(container);
  }

  function renderGrid(container, list, emptyMsg) {
    if (!list.length) { container.innerHTML = '<p class="vk-leer">' + esc(emptyMsg) + '</p>'; return; }
    container.innerHTML = list.map(cardHTML).join("");
    revealInjected(container);
  }

  function renderDetail(container, data, id) {
    var list = (data && data.veranstaltungen) ? data.veranstaltungen : [];
    var v = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id && list[i].aktiv !== false) { v = list[i]; break; } }
    if (!v) {
      container.innerHTML = '<div class="vd-fehlt">'
        + '<h1 class="legal-title">Veranstaltung nicht gefunden</h1>'
        + '<p class="reserv-intro">Diese Veranstaltung gibt es nicht oder nicht mehr.</p>'
        + '<a class="btn btn-primary" href="veranstaltungen.html">Zu allen Veranstaltungen</a>'
        + '</div>';
      return;
    }
    document.title = v.titel + " | Veranstaltungen | Manes am Bösch";
    var paras = String(v.text || "").split(/\n\n+/).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("");
    var infos = (v.infos || []).map(function (i) { return '<div class="vd-info"><dt>' + esc(i.label) + '</dt><dd>' + esc(i.wert) + '</dd></div>'; }).join("");
    var pdf = v.pdf ? '<a class="btn btn-secondary vd-pdf" href="' + attr(v.pdf) + '" target="_blank" rel="noopener">Flyer als PDF ansehen</a>' : '';
    container.innerHTML =
      '<article class="vd">'
      + '<div class="vd-plakat"><img src="' + attr(v.bild) + '" alt="Plakat: ' + attr(v.titel) + '" decoding="async"></div>'
      + '<div class="vd-text">'
      + '<span class="vk-kat">' + esc(v.kategorie) + '</span>'
      + '<h1 class="vd-titel">' + esc(v.titel) + '</h1>'
      + '<p class="vd-datum">' + esc(v.datum) + '</p>'
      + (v.vorbei ? '<p class="vd-vorbei">Diese Veranstaltung hat bereits stattgefunden.</p>' : '')
      + (infos ? '<dl class="vd-infos">' + infos + '</dl>' : '')
      + '<div class="vd-body">' + paras + '</div>'
      + pdf
      + '</div>'
      + '</article>';
  }

  var featEl = document.querySelector('[data-veranstaltungen="featured"]');
  var listeEl = document.querySelector('[data-veranstaltungen="liste"]');
  var detailEl = document.querySelector('[data-veranstaltung="detail"]');
  if (!featEl && !listeEl && !detailEl) { return; }

  load().then(function (data) {
    var list = actives(data);
    if (featEl) {
      var feat = list.filter(function (v) { return v.featured && !v.vorbei; });
      if (feat.length) {
        renderGrid(featEl, feat.slice(0, 3), "");
      } else {
        featEl.innerHTML = '<div class="vk-platzhalter reveal">'
          + '<span class="vk-platzhalter-eyebrow">Veranstaltungen</span>'
          + '<p class="vk-platzhalter-titel">Mehr in Kürze</p>'
          + '<p class="vk-platzhalter-text">Neue Termine und Aktionen kündigen wir hier in Kürze an.</p>'
          + '</div>';
        revealInjected(featEl);
      }
    }
    if (listeEl) { renderGrid(listeEl, list, "Aktuell sind keine Veranstaltungen angekündigt."); }
    if (detailEl) { renderDetail(detailEl, data, paramId()); }
  }).catch(function () {
    var msg = '<p class="vk-leer">Die Veranstaltungen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</p>';
    if (featEl) { featEl.innerHTML = msg; }
    if (listeEl) { listeEl.innerHTML = msg; }
    if (detailEl) { detailEl.innerHTML = msg; }
  });
})();
