/* ==========================================================================
   Manes am Bösch, vanilla JS
   Mobile nav, header scroll state, scroll reveals,
   signature trust badge (stars fill + count-up),
   Maps-Zwei-Klick-Consent, Newsletter-Versand per fetch an newsletter.php.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Datenschutz-Hinweis (Popup, einmalig bestätigen) ---------------- */
  try {
    if (!localStorage.getItem("manes-consent")) {
      var cp = document.createElement("div");
      cp.className = "consent-popup";
      cp.setAttribute("role", "dialog");
      cp.setAttribute("aria-label", "Hinweis zum Datenschutz");
      cp.innerHTML =
        '<p class="consent-titel">Hinweis zum Datenschutz</p>' +
        '<p class="consent-text">Wir verwenden keine Tracking-Cookies. Personenbezogene Daten verarbeiten wir nur, wenn Sie sie uns aktiv übermitteln, etwa über das Reservierungsformular oder die Newsletter-Anmeldung. Details in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.</p>' +
        '<button type="button" class="btn btn-primary consent-btn">Verstanden</button>';
      document.body.appendChild(cp);
      cp.querySelector(".consent-btn").addEventListener("click", function () {
        try { localStorage.setItem("manes-consent", String(Date.now())); } catch (e) {}
        cp.remove();
      });
    }
  } catch (e) { /* localStorage gesperrt: Hinweis dann einfach nicht anzeigen */ }

  /* ---------------- deutsche Validierungs-Meldungen (statt Browser-Englisch) ---------------- */
  function validierungsMeldung(el) {
    var v = el.validity;
    if (v.valueMissing) {
      if (el.type === "checkbox") { return "Bitte setzen Sie dieses Häkchen, um fortzufahren."; }
      if (el.type === "email") { return "Bitte geben Sie Ihre E-Mail-Adresse an."; }
      return "Bitte füllen Sie dieses Feld aus.";
    }
    if (v.typeMismatch && el.type === "email") { return "Bitte geben Sie eine gültige E-Mail-Adresse an."; }
    return "Bitte prüfen Sie Ihre Eingabe.";
  }
  Array.prototype.forEach.call(document.querySelectorAll("input, select, textarea"), function (el) {
    el.addEventListener("invalid", function () { el.setCustomValidity(validierungsMeldung(el)); });
    el.addEventListener("input", function () { el.setCustomValidity(""); });
    el.addEventListener("change", function () { el.setCustomValidity(""); });
  });

  /* ---------------- current year in footer ---------------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  /* ---------------- header scroll state ---------------- */
  var header = document.querySelector("[data-header]");
  var newsBar = document.querySelector("[data-newsbar]");
  if (header) {
    var onScroll = function () {
      var scrolled = window.scrollY > 40;
      header.classList.toggle("is-scrolled", scrolled);
      if (newsBar) { newsBar.classList.toggle("is-hidden", scrolled); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- mobile navigation ---------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var mobileNav = document.querySelector("[data-mobile-nav]");

  function closeNav() {
    if (!toggle || !mobileNav) { return; }
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menü öffnen");
    mobileNav.hidden = true;
  }
  function openNav() {
    if (!toggle || !mobileNav) { return; }
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Menü schließen");
    mobileNav.hidden = false;
  }
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      if (open) { closeNav(); } else { openNav(); }
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { closeNav(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeNav();
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) { closeNav(); }
    });
  }

  /* ---------------- scroll reveals ---------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------- Zeitleiste: dezente Blätter-Buttons ---------------- */
  var tl = document.querySelector(".timeline");
  var tlPrev = document.querySelector("[data-tl-prev]");
  var tlNext = document.querySelector("[data-tl-next]");
  if (tl && tlPrev && tlNext) {
    var tlStep = function () {
      var item = tl.querySelector(".timeline-item");
      return item ? item.getBoundingClientRect().width + 32 : tl.clientWidth * 0.6;
    };
    var tlUpdate = function () {
      tlPrev.disabled = tl.scrollLeft <= 2;
      tlNext.disabled = tl.scrollLeft >= tl.scrollWidth - tl.clientWidth - 2;
    };
    tlPrev.addEventListener("click", function () { tl.scrollBy({ left: -tlStep(), behavior: "smooth" }); });
    tlNext.addEventListener("click", function () { tl.scrollBy({ left: tlStep(), behavior: "smooth" }); });
    tl.addEventListener("scroll", tlUpdate, { passive: true });
    window.addEventListener("resize", tlUpdate);
    tlUpdate();
  }

  /* ---------------- Google Maps: Zwei-Klick-Consent ---------------- */
  var mapBox = document.querySelector("[data-map]");
  if (mapBox) {
    var mapBtn = mapBox.querySelector("[data-map-load]");
    if (mapBtn) {
      mapBtn.addEventListener("click", function () {
        var f = document.createElement("iframe");
        f.title = "Karte mit dem Standort von Manes am Bösch, In Ückerath 81, 41542 Dormagen";
        f.src = mapBox.getAttribute("data-map-src");
        f.width = "600"; f.height = "450";
        f.referrerPolicy = "no-referrer-when-downgrade";
        mapBox.innerHTML = "";
        mapBox.appendChild(f);
      });
    }
  }

  /* ---------------- newsletter: Anmeldung per E-Mail ---------------- */
  var newsletterForm = document.querySelector("[data-newsletter]");
  if (newsletterForm) {
    var nlStatus = document.querySelector("[data-newsletter-status]");
    var nlBtn = newsletterForm.querySelector("button[type='submit']");
    var nlEmailRe = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
    var nlSet = function (state, msg) {
      if (!nlStatus) { return; }
      nlStatus.textContent = msg;
      nlStatus.setAttribute("data-state", state);
      nlStatus.hidden = false;
    };
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = newsletterForm.querySelector("input[name='website']");
      if (hp && hp.value.trim() !== "") { return; } // Bot
      var input = newsletterForm.querySelector("input[type='email']");
      var email = input ? input.value.trim() : "";
      if (!email || !nlEmailRe.test(email)) {
        nlSet("error", "Bitte geben Sie eine gültige E-Mail-Adresse an.");
        if (input) { input.focus(); }
        return;
      }
      if (nlBtn) { nlBtn.disabled = true; }
      nlSet("pending", "Wird gesendet …");
      fetch(newsletterForm.getAttribute("action") || "newsletter.php", {
        method: "POST",
        headers: { "X-Requested-With": "fetch" },
        body: new FormData(newsletterForm)
      }).then(function (res) {
        return res.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (err) { j = null; } return j; });
      }).then(function (j) {
        if (j && j.ok) {
          nlSet("success", j.message || "Vielen Dank. Sie sind für unseren Newsletter angemeldet.");
          newsletterForm.reset();
        } else {
          if (nlBtn) { nlBtn.disabled = false; }
          nlSet("error", (j && j.message) || "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es später erneut.");
        }
      }).catch(function () {
        if (nlBtn) { nlBtn.disabled = false; }
        nlSet("error", "Verbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.");
      });
    });
  }

  /* ---------------- signature: trust badge stars + count-up ---------------- */
  var trust = document.querySelector("[data-trust]");
  if (trust) {
    var starsFill = trust.querySelector("[data-stars]");
    var countEl = trust.querySelector("[data-count-to]");
    var target = countEl ? parseInt(countEl.getAttribute("data-count-to"), 10) : 0;

    function formatDe(n) {
      return n.toLocaleString("de-DE");
    }

    function runTrust() {
      // stars fill to 4,7 of 5 = 94%
      if (starsFill) {
        if (reduceMotion) { starsFill.style.width = "94%"; }
        else { requestAnimationFrame(function () { starsFill.style.width = "94%"; }); }
      }
      // count up 0 -> 1.540
      if (countEl) {
        if (reduceMotion || target <= 0) {
          countEl.textContent = formatDe(target);
          return;
        }
        var duration = 1400;
        var start = null;
        var step = function (ts) {
          if (start === null) { start = ts; }
          var p = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          countEl.textContent = formatDe(Math.round(eased * target));
          if (p < 1) { requestAnimationFrame(step); }
          else { countEl.textContent = formatDe(target); }
        };
        requestAnimationFrame(step);
      }
    }

    if (!("IntersectionObserver" in window)) {
      runTrust();
    } else {
      var trustObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runTrust();
            obs.disconnect();
          }
        });
      }, { threshold: 0.5 });
      trustObserver.observe(trust);
    }
  }
})();
