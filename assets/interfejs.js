/* ============================================================================
   Wspolne zachowania interfejsu wszystkich ekranow i powloki (przeglad 08.10).

   1. Uwagi projektowe: ramki z numerami decyzji i same numery D-xx / P-xx sa
      domyslnie ukryte. Przelacznik w gornym pasku powloki je pokazuje; wybor
      lezy w pamieci przegladarki i dziala tez w ekranach w ramce.
   2. Klawiatura: zakladki, pozycje menu i wiersze otwierane kliknieciem
      dostaja fokus i reaguja na Enter i spacje (w aplikacji docelowej beda to
      natywne przyciski i linki).
   3. Okna (.okno-tlo): fokus wchodzi do okna, Escape je zamyka, po zamknieciu
      fokus wraca do elementu, ktory je otworzyl.
   4. Tytul karty przegladarki z naglowka ekranu.
   ============================================================================ */
(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc) return;

  var KLUCZ_UWAG = "ldit-uwagi-projektowe";
  var KLASA_UWAG = "pokaz-uwagi";
  var KLIKALNE = ".tab, .nav-item, .mod-tabs a:not([href]), tr[data-id], [data-klik]";
  var FOKUSOWALNE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
  /* Numery decyzji, pytan i rekomendacji w tekstach podpowiedzi */
  var NUMERY = /\s*[\(\[]?\b(?:D|P|R|Z|M)-\d+[a-z]?\b[\)\]]?(?:\s*(?:,|i|oraz)\s*(?=[\(\[]?\b(?:D|P|R|Z|M)-\d))?/g;

  /* ------------------------------ uwagi projektowe ------------------------------ */
  function uwagiWlaczone() {
    try { return global.localStorage.getItem(KLUCZ_UWAG) === "1"; }
    catch (e) { console.warn("Pamięć przeglądarki niedostępna, uwagi projektowe ukryte:", e.message); return false; }
  }

  function zastosujUwagi() {
    doc.documentElement.classList.toggle(KLASA_UWAG, uwagiWlaczone());
  }

  function ustawUwagi(wlaczone) {
    try { global.localStorage.setItem(KLUCZ_UWAG, wlaczone ? "1" : "0"); }
    catch (e) { console.warn("Nie zapisano ustawienia uwag projektowych:", e.message); }
    zastosujUwagi();
    var ramka = doc.getElementById("view");
    if (ramka && ramka.contentDocument) ramka.contentDocument.documentElement.classList.toggle(KLASA_UWAG, wlaczone);
  }

  /* Tekst podpowiedzi bez numerow decyzji, gdy uwagi sa ukryte (uzywa tips.js) */
  function tekstPodpowiedzi(tekst) {
    if (uwagiWlaczone()) return tekst;
    return String(tekst).replace(NUMERY, "").replace(/\s+\./g, ".").replace(/\s{2,}/g, " ").replace(/[\s,]+$/, "").trim();
  }

  /* Spacja przed numerem przechodzi do znacznika, zeby po ukryciu numeru nie zostawalo "slowo ." */
  function dociagnijNumery(korzen) {
    Array.prototype.forEach.call((korzen || doc).querySelectorAll(".ref:not(.ref-odstep)"), function (r) {
      var przed = r.previousSibling;
      if (przed && przed.nodeType === 3 && /\s$/.test(przed.nodeValue)) przed.nodeValue = przed.nodeValue.replace(/\s+$/, "");
      r.classList.add("ref-odstep");
    });
  }

  /* ------------------------------ klawiatura ------------------------------ */
  function udostepnij(el) {
    if (el.hasAttribute("tabindex") || el.tagName === "BUTTON" || (el.tagName === "A" && el.hasAttribute("href"))) return;
    el.setAttribute("tabindex", "0");
    if (!el.getAttribute("role")) el.setAttribute("role", el.classList.contains("tab") ? "tab" : "button");
  }

  function udostepnijWszystkie(korzen) {
    Array.prototype.forEach.call((korzen || doc).querySelectorAll(KLIKALNE), udostepnij);
  }

  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var el = e.target;
    if (!el.matches || !el.matches(KLIKALNE) || el.tagName === "BUTTON" || el.tagName === "INPUT") return;
    e.preventDefault();
    el.click();
  });

  /* ------------------------------ okna ------------------------------ */
  var otwierajacy = null;

  function otwarteOkno() {
    var okna = doc.querySelectorAll(".okno-tlo");
    return okna.length ? okna[okna.length - 1] : null;
  }

  function wejdzDoOkna(tlo) {
    var okno = tlo.querySelector(".okno") || tlo;
    okno.setAttribute("role", "dialog");
    okno.setAttribute("aria-modal", "true");
    var naglowek = okno.querySelector(".okno-head, h3");
    if (naglowek && !okno.getAttribute("aria-label")) okno.setAttribute("aria-label", naglowek.textContent.trim());
    var pierwszy = okno.querySelector("textarea, input, select") || okno.querySelector(FOKUSOWALNE);
    if (pierwszy) pierwszy.focus();
  }

  /* Zamkniecie przez przycisk okna, ktory ma Anuluj albo Zamknij w tekscie, inaczej przez usuniecie tla */
  function zamknijOkno(tlo) {
    var przyciski = Array.prototype.filter.call(tlo.querySelectorAll("button"), function (b) {
      return /anuluj|zamknij|×/i.test(b.textContent);
    });
    if (przyciski.length) przyciski[0].click(); else tlo.remove();
  }

  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var tlo = otwarteOkno();
    if (tlo) { e.preventDefault(); zamknijOkno(tlo); }
  });

  function obserwuj() {
    new MutationObserver(function (zmiany) {
      zmiany.forEach(function (z) {
        Array.prototype.forEach.call(z.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList.contains("okno-tlo")) { otwierajacy = doc.activeElement; wejdzDoOkna(n); }
          if (n.matches(KLIKALNE)) udostepnij(n);
          udostepnijWszystkie(n);
          dociagnijNumery(n);
        });
        Array.prototype.forEach.call(z.removedNodes, function (n) {
          if (n.nodeType === 1 && n.classList.contains("okno-tlo") && otwierajacy && doc.contains(otwierajacy)) otwierajacy.focus();
        });
      });
    }).observe(doc.body, { childList: true, subtree: true });
  }

  /* ------------------------------ tytul i punkt orientacyjny ------------------------------ */
  function oznaczTresc() {
    var strona = doc.querySelector(".page");
    if (strona && !strona.getAttribute("role")) strona.setAttribute("role", "main");
    var h1 = doc.querySelector(".page h1, .page-head h1");
    if (h1 && global.top === global.self) doc.title = h1.textContent.trim() + " · System KFS";
  }

  function start() {
    zastosujUwagi();
    udostepnijWszystkie(doc);
    dociagnijNumery(doc);
    oznaczTresc();
    obserwuj();
  }

  zastosujUwagi();
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
  global.addEventListener("storage", function (e) { if (e.key === KLUCZ_UWAG) zastosujUwagi(); });

  global.Interfejs = { ustawUwagi: ustawUwagi, uwagiWlaczone: uwagiWlaczone, tekstPodpowiedzi: tekstPodpowiedzi };
})(window);
