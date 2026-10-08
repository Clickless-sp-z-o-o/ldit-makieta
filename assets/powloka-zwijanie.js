/* ============================================================================
   Lewe menu powloki (index.html) na roznych szerokosciach ekranu.

   Komputer: menu mozna zwinac do samych ikon, stan jest pamietany w przegladarce.
   Wezszy ekran (768 - 1180 px): menu zwija sie samo, bez zapisywania wyboru.
   Telefon (ponizej 768 px): menu jest szuflada otwierana przyciskiem Menu,
   zamykana Escape, dotknieciem tla albo wyborem pozycji.
   Klikniecie Dofinansowan w zwinietym menu rozwija je, bo lata i instytucje
   wymagaja pelnej szerokosci.
   ============================================================================ */

(function (global) {
  "use strict";

  var KLUCZ = "kfs_menu_zwiniete";
  var doc = global.document;
  var app = doc.querySelector(".app");
  var przycisk = doc.getElementById("zwinMenu");
  var menuTel = doc.getElementById("menuTel");
  var telefon = global.matchMedia("(max-width: 767px)");
  var waski = global.matchMedia("(min-width: 768px) and (max-width: 1180px)");

  function zapamietaj(zwiniete) {
    try { global.localStorage.setItem(KLUCZ, zwiniete ? "1" : "0"); }
    catch (e) { console.warn("Stan menu zostanie do przeładowania strony:", e.message); }
  }

  function odczytaj() {
    try { return global.localStorage.getItem(KLUCZ) === "1"; }
    catch (e) { console.warn("Nie odczytano stanu menu:", e.message); return false; }
  }

  function ustaw(zwiniete, zapisz) {
    app.classList.toggle("menu-zwiniete", zwiniete);
    przycisk.innerHTML = zwiniete ? "&raquo;" : "&laquo;";
    przycisk.setAttribute("data-tip", zwiniete ? "Rozwiń menu" : "Zwiń menu");
    przycisk.setAttribute("aria-label", zwiniete ? "Rozwiń menu" : "Zwiń menu");
    przycisk.setAttribute("aria-expanded", String(!zwiniete));
    if (zapisz) zapamietaj(zwiniete);
  }

  function szuflada(otwarta) {
    app.classList.toggle("menu-otwarte", otwarta);
    menuTel.setAttribute("aria-expanded", String(otwarta));
    if (otwarta) {
      var pierwsza = doc.querySelector("#nav .nav-item");
      if (pierwsza) pierwsza.focus();
    }
  }

  /* Uklad zalezy od szerokosci: na telefonie menu nie jest zwiniete, tylko schowane w szufladzie */
  function dopasuj() {
    szuflada(false);
    if (telefon.matches) ustaw(false, false);
    else ustaw(waski.matches || odczytaj(), false);
  }

  przycisk.addEventListener("click", function () { ustaw(!app.classList.contains("menu-zwiniete"), true); });
  menuTel.addEventListener("click", function () { szuflada(!app.classList.contains("menu-otwarte")); });

  /* Faza przechwytywania: rozwijamy menu, zanim obsluga pozycji otworzy lata */
  doc.getElementById("nav").addEventListener("click", function (e) {
    if (app.classList.contains("menu-zwiniete") && e.target.closest('.nav-item[data-id="dofin"]')) ustaw(false, !waski.matches);
    var pozycja = e.target.closest(".nav-item");
    if (telefon.matches && pozycja && !pozycja.matches('[data-id="dofin"], .sub-rok')) szuflada(false);
  }, true);

  /* Tlo szuflady to pseudo-element .app, wiec klik poza menu trafia w .app albo w tresc */
  doc.addEventListener("click", function (e) {
    if (app.classList.contains("menu-otwarte") && !e.target.closest(".sidebar, #menuTel")) szuflada(false);
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && app.classList.contains("menu-otwarte")) { szuflada(false); menuTel.focus(); }
  });

  telefon.addEventListener("change", dopasuj);
  waski.addEventListener("change", dopasuj);
  dopasuj();
})(window);
