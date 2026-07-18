/* ==========================================================================
   Manes am Bösch, Reservierungsformular (Restaurant + Saal)
   Client-seitige Validierung mit Plausibilitätsprüfung, Honeypot gegen Spam.
   Bei gültiger Eingabe wird das Formular per fetch an reservierung.php gesendet
   (serverseitiger Versand an gastro@manes.de). Ohne JavaScript postet das
   Formular normal an dieselbe Datei (siehe action/method im HTML).
   ========================================================================== */
(function () {
  "use strict";

  var form = document.querySelector("[data-reserv-form]");
  if (!form) { return; }

  var statusEl = form.querySelector("[data-form-status]");
  var submitBtn = form.querySelector("button[type='submit']");
  var endpoint = form.getAttribute("action") || "reservierung.php";

  /* ---------- Hilfen für Feld-Fehler ---------- */
  function wrapOf(input) { return input.closest(".field"); }
  function errElOf(input) {
    var w = wrapOf(input);
    return w ? w.querySelector("[data-error]") : null;
  }
  function setError(input, msg) {
    input.setAttribute("aria-invalid", "true");
    var e = errElOf(input);
    if (e) { e.textContent = msg; e.hidden = false; }
  }
  function clearError(input) {
    input.removeAttribute("aria-invalid");
    var e = errElOf(input);
    if (e) { e.textContent = ""; e.hidden = true; }
  }
  function field(name) { return form.querySelector("[name='" + name + "']"); }

  function showStatus(state, msg) {
    if (!statusEl) { return; }
    statusEl.textContent = msg;
    statusEl.setAttribute("data-state", state);
    statusEl.hidden = false;
  }

  /* ---------- Plausibilitätsprüfungen ---------- */
  var emailRe = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

  // Offensichtliche Fantasie-/Tastatur-Namen erkennen (Heuristik, bewusst tolerant).
  function looksFake(value) {
    var n = value.trim().toLowerCase();
    var letters = (n.match(/[a-zà-ÿäöüß]/gi) || []).length;
    if (letters < 2) { return true; }                 // zu wenige Buchstaben
    if (!/[aeiouyäöü]/i.test(n)) { return true; }      // kein einziger Vokal
    if (/(.)\1{3,}/.test(n)) { return true; }          // 4+ gleiche Zeichen am Stück
    if (/\d/.test(n)) { return true; }                 // Ziffern im Namen
    if (/(https?:|www\.|@|\.de\b|\.com\b|\.ru\b)/i.test(n)) { return true; } // URL/Mail
    var exact = ["test", "abc", "aaa", "xxx", "asdf", "qwer", "name", "vorname", "nachname", "max mustermann"];
    if (exact.indexOf(n) !== -1) { return true; }
    var runs = ["asdf", "sdfg", "dfgh", "qwer", "wert", "qwert", "qwertz", "qwerty", "zxcv", "xcvb", "yxcv", "hjkl", "1234", "2345", "3456"];
    for (var i = 0; i < runs.length; i++) { if (n.indexOf(runs[i]) !== -1) { return true; } }
    return false;
  }

  function isPastDate(value) {
    var parts = value.split("-");
    if (parts.length !== 3) { return false; }
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  /* ---------- Einzelvalidierung eines Feldes ---------- */
  function validateField(input) {
    if (!input) { return true; }
    clearError(input);
    var name = input.name;
    var val = (input.type === "checkbox") ? input.checked : input.value.trim();
    var required = input.hasAttribute("required");

    if (input.type === "checkbox") {
      if (required && !val) { setError(input, "Bitte bestätigen Sie die Einwilligung."); return false; }
      return true;
    }

    if (required && val === "") { setError(input, "Bitte ausfüllen."); return false; }
    if (!required && val === "") { return true; } // leeres optionales Feld ist ok

    if (name === "datum") {
      if (isPastDate(val)) { setError(input, "Bitte wählen Sie ein Datum in der Zukunft."); return false; }
    } else if (name === "personen") {
      var num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || num > 200) { setError(input, "Bitte eine gültige Personenzahl (1 bis 200) angeben."); return false; }
    } else if (name === "name") {
      if (val.length < 2) { setError(input, "Bitte geben Sie Ihren vollständigen Namen an."); return false; }
      if (looksFake(val)) { setError(input, "Bitte geben Sie einen gültigen Namen an."); return false; }
    } else if (name === "anlass") {
      if (val.length < 3) { setError(input, "Bitte nennen Sie den Anlass."); return false; }
    } else if (name === "email") {
      if (!emailRe.test(val)) { setError(input, "Bitte geben Sie eine gültige E-Mail-Adresse an."); return false; }
    } else if (name === "telefon") {
      if (!/[0-9]/.test(val) || val.replace(/[^0-9]/g, "").length < 6 || !/^[0-9 +()\/.\-]+$/.test(val)) {
        setError(input, "Bitte geben Sie eine gültige Telefon- oder Mobilnummer an.");
        return false;
      }
    }
    return true;
  }

  // Live-Feedback: Fehler entfernen, sobald der Gast korrigiert
  var inputs = Array.prototype.slice.call(form.querySelectorAll("input, textarea, select"));
  inputs.forEach(function (input) {
    if (input.name === "website") { return; } // Honeypot nicht anfassen
    input.addEventListener("blur", function () { validateField(input); });
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") { validateField(input); }
    });
  });

  var toValidate = inputs.filter(function (i) { return i.name !== "website"; });

  /* ---------- Absenden ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Honeypot: von Menschen unsichtbar. Ausgefüllt = Bot -> still verwerfen.
    var hp = field("website");
    if (hp && hp.value.trim() !== "") { return; }

    var firstBad = null;
    toValidate.forEach(function (input) {
      if (!validateField(input) && !firstBad) { firstBad = input; }
    });
    if (firstBad) {
      showStatus("error", "Bitte prüfen Sie die rot markierten Felder und senden Sie die Anfrage erneut.");
      firstBad.focus();
      return;
    }

    // Serverseitig senden
    if (submitBtn) { submitBtn.disabled = true; }
    showStatus("pending", "Ihre Anfrage wird gesendet …");

    fetch(endpoint, {
      method: "POST",
      headers: { "X-Requested-With": "fetch" },
      body: new FormData(form)
    }).then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try { json = JSON.parse(text); } catch (err) { json = null; }
        return { status: res.status, json: json };
      });
    }).then(function (r) {
      if (r.json && r.json.ok) {
        showStatus("success", r.json.message || "Vielen Dank. Ihre Reservierungsanfrage ist bei uns eingegangen.");
        form.reset();
        // Absenden gesperrt lassen, um Doppelsendungen zu vermeiden
        return;
      }
      if (submitBtn) { submitBtn.disabled = false; }
      if (r.json && r.json.errors) {
        var first = null;
        Object.keys(r.json.errors).forEach(function (k) {
          var inp = field(k);
          if (inp) { setError(inp, r.json.errors[k]); if (!first) { first = inp; } }
        });
        if (first) { first.focus(); }
      }
      showStatus("error", (r.json && r.json.message) || "Es ist ein Fehler aufgetreten. Bitte prüfen Sie Ihre Eingaben.");
    }).catch(function () {
      if (submitBtn) { submitBtn.disabled = false; }
      showStatus("error", "Verbindung fehlgeschlagen. Bitte versuchen Sie es später erneut oder rufen Sie uns an: 02133 91630.");
    });
  });
})();
