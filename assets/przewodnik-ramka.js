/* ============================================================================
   Przewodnik makiety po stronie ekranu w ramce (strony/*.html).

   Wycieczke rysuje powloka (assets/przewodnik.js), ale kotwice data-przewodnik
   sa w dokumencie ramki, a na file:// powloka nie moze go czytac. Ekran odpowiada
   wiec na komunikaty postMessage od powloki:
     sprawdz     ktore kotwice z listy sa widoczne,
     podswietl   przewija do kotwicy i podaje jej prostokat (takze po przewinieciu
                 i zmianie rozmiaru, dopoki trwa krok),
     zakoncz     koniec wycieczki.
   Skroty przewodnika (Shift+?, Shift+P) z ekranu w ramce trafiaja do powloki.
   ============================================================================ */

(function (global) {
  "use strict";

  if (global.top === global.self) return;

  var ATRYBUT = "data-przewodnik";
  var biezacy = null;   /* { kotwica, nr } podswietlanego kroku */

  /* Na file:// origin to "null", wtedy zostaje "*" (jak assets/nawigacja.js) */
  function cel() { return global.location.origin && global.location.origin !== "null" ? global.location.origin : "*"; }
  function wyslij(tresc) { global.parent.postMessage(tresc, cel()); }

  function widoczny(el) {
    if (typeof el.checkVisibility === "function" && !el.checkVisibility()) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /* Pierwszy widoczny element kotwicy: ta sama kotwica bywa na kilku zakladkach (tresc karty instytucji) */
  function znajdz(kotwica) {
    return Array.prototype.filter.call(document.querySelectorAll("[" + ATRYBUT + "]"), function (x) {
      return x.getAttribute(ATRYBUT) === kotwica && widoczny(x);
    })[0] || null;
  }

  function prostokat(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function zglosProstokat() {
    if (!biezacy) return;
    var el = znajdz(biezacy.kotwica);
    wyslij({ typ: "kfs:przewodnik-prostokat", nr: biezacy.nr, kotwica: biezacy.kotwica, prostokat: el ? prostokat(el) : null });
  }

  var zaplanowane = false;
  function odswiez() {
    if (zaplanowane) return;
    zaplanowane = true;
    global.requestAnimationFrame(function () { zaplanowane = false; zglosProstokat(); });
  }

  function podswietl(kotwica, nr) {
    biezacy = { kotwica: kotwica, nr: nr };
    var el = znajdz(kotwica);
    if (el) el.scrollIntoView({ block: "center", inline: "nearest" });
    global.requestAnimationFrame(zglosProstokat);
  }

  global.addEventListener("message", function (ev) {
    if (ev.source !== global.parent || !ev.data || ev.data.typ !== "kfs:przewodnik") return;
    var d = ev.data;
    if (d.akcja === "sprawdz") {
      var kotwice = Array.isArray(d.kotwice) ? d.kotwice : [];
      wyslij({ typ: "kfs:przewodnik-widoczne", nr: d.nr, widoczne: kotwice.filter(function (k) { return znajdz(String(k)) !== null; }) });
    } else if (d.akcja === "podswietl") {
      podswietl(String(d.kotwica), d.nr);
    } else if (d.akcja === "zakoncz") {
      biezacy = null;
    }
  });

  global.addEventListener("scroll", odswiez, true);
  global.addEventListener("resize", odswiez);

  document.addEventListener("keydown", function (e) {
    var skrot = global.PrzewodnikLogika ? global.PrzewodnikLogika.skrot(e) : null;
    if (!skrot) return;
    e.preventDefault();
    wyslij({ typ: "kfs:przewodnik-skrot", skrot: skrot });
  });
})(window);
