/* ============================================================================
   Przewodnik w powloce makiety (index.html), tak jak w aplikacji (docs/30):
     - dwa przyciski w prawym gornym rogu paska: "Pokaz" od razu prowadzi po biezacym
       ekranie (Shift+?), "Przewodnik" otwiera panel z opisem ekranu i spisem tresci (Shift+P),
     - Pokaz bez krokow otwiera panel na zakladce "Na tym ekranie",
     - pierwsze wejscie konta demo: wycieczka powitalna startuje sama (menu, pasek,
       przyciski Pokaz i Przewodnik, Dashboard), znacznik "widziane" w localStorage.
   Tresci: assets/przewodnik-tresci.js (generowany z tekstow aplikacji), filtrowane po roli
   konta demo. Wycieczka: assets/przewodnik-wycieczka.js, panel: assets/przewodnik-panel.js,
   ekran w ramce odpowiada przez assets/przewodnik-ramka.js.
   ============================================================================ */

(function (global) {
  "use strict";

  var L = global.PrzewodnikLogika;
  var DANE = global.PrzewodnikTresci;
  var DASHBOARD = "01-dashboard.html";

  var stan = { tryb: "zamkniety" };   /* zamkniety | panel (zakladka) | wycieczka */
  var biezacy = { plik: null, zapytanie: "" };
  var naDashboardzie = false;          /* wycieczka powitalna czeka na Dashboard w ramce */
  var pierwszyEkran = true;
  var przyciski = {};
  var oknoPanelu = null;

  function ramka() { return document.getElementById("view"); }
  function sesja() { return global.Auth.sesja(); }
  function grupa() { return L.grupaKonta(sesja()); }
  function T(klucz) { return L.tekst(DANE.teksty, klucz); }

  function widziStrone(plik) {
    var N = global.Nawigacja;
    if (N.STRONY_KAZDEGO.indexOf(plik) >= 0) return true;
    var modul = N.modulEkranu(plik);
    return Boolean(modul) && global.Auth.widziModul(modul);
  }

  function ekranBiezacy() {
    return biezacy.plik ? L.ekranStrony(DANE, biezacy.plik, biezacy.zapytanie, grupa()) : null;
  }

  /* ------------------------------ przyciski paska ------------------------------ */

  function utworzPrzycisk(ikona, klucz, skrot, akcja) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn sm pomoc";
    b.setAttribute("aria-keyshortcuts", skrot);
    b.setAttribute("aria-label", T("ldit.panel.przewodnik.przycisk." + klucz + "Etykieta"));
    b.setAttribute("data-tip", T("ldit.panel.przewodnik.przycisk." + klucz + "Dymek"));
    b.innerHTML = global.Ikony.svg(ikona);
    var napis = document.createElement("span");
    napis.className = "pomoc-napis";
    napis.textContent = T("ldit.panel.przewodnik.przycisk." + klucz + "Napis");
    b.appendChild(napis);
    b.addEventListener("click", akcja);
    return b;
  }

  function wstawPrzyciski() {
    var blok = document.createElement("div");
    blok.className = "pomoc-przyciski";
    blok.setAttribute("data-przewodnik", "pasek-pomoc");
    przyciski.pokaz = utworzPrzycisk("pomoc", "pokaz", "Shift+?", pokazEkran);
    przyciski.panel = utworzPrzycisk("przewodnik", "panel", "Shift+P", function () {
      if (stan.tryb === "panel") zamknij(); else otworz("ekran");
    });
    przyciski.panel.setAttribute("aria-haspopup", "dialog");
    przyciski.panel.setAttribute("aria-expanded", "false");
    blok.appendChild(przyciski.pokaz);
    blok.appendChild(przyciski.panel);
    document.querySelector(".topbar-right").appendChild(blok);
  }

  /* ------------------------------ panel ------------------------------ */

  function usunPanel() {
    if (!oknoPanelu) return;
    oknoPanelu.tlo.remove();
    oknoPanelu.panel.remove();
    oknoPanelu = null;
    przyciski.panel.setAttribute("aria-expanded", "false");
    przyciski.panel.removeAttribute("aria-controls");
  }

  function otworz(zakladka) {
    if (global.PrzewodnikWycieczka.trwa()) global.PrzewodnikWycieczka.zakoncz();
    usunPanel();
    stan = { tryb: "panel", zakladka: zakladka || "ekran" };
    var g = grupa();
    var kontekst = { teksty: DANE.teksty, dane: DANE, grupa: g, biezacy: ekranBiezacy(), ekrany: L.ekranyKonta(DANE, g, widziStrone) };
    oknoPanelu = global.PrzewodnikPanel.zbuduj(kontekst, stan.zakladka, {
      zamknij: zamknij,
      zakladka: otworz,
      pokazEkran: pokazEkran,
      pokazSystem: pokazSystem,
      przejdz: function (adres) { zamknij(); ramka().src = "strony/" + adres; }
    });
    document.body.appendChild(oknoPanelu.tlo);
    document.body.appendChild(oknoPanelu.panel);
    przyciski.panel.setAttribute("aria-expanded", "true");
    przyciski.panel.setAttribute("aria-controls", oknoPanelu.panel.id);
    oknoPanelu.panel.focus();
  }

  /* Zamkniecie panelu oddaje fokus przyciskowi Przewodnik, koniec wycieczki przyciskowi Pokaz */
  function zamknij() {
    var bylPanel = stan.tryb === "panel";
    usunPanel();
    stan = { tryb: "zamkniety" };
    (bylPanel ? przyciski.panel : przyciski.pokaz).focus();
  }

  /* ------------------------------ wycieczki ------------------------------ */

  function wycieczka(kroki, opcje) {
    usunPanel();
    stan = { tryb: "wycieczka" };
    return global.PrzewodnikWycieczka.start({
      kroki: kroki, teksty: DANE.teksty, ramka: ramka(), wiecej: opcje.wiecej || null,
      koniec: zamknij, brak: opcje.brak || zamknij
    });
  }

  /* Pokaz: od razu wycieczka po ekranie; bez widocznych krokow panel "Na tym ekranie" */
  function pokazEkran() {
    var e = ekranBiezacy();
    var otworzEkran = function () { otworz("ekran"); };
    wycieczka(e ? e.kroki : [], { wiecej: otworzEkran, brak: otworzEkran });
  }

  /* Wycieczka powitalna po systemie: zaczyna sie na Dashboardzie, gdy konto go widzi */
  function pokazSystem() {
    global.localStorage.setItem(L.kluczWidzianego(sesja().login), new Date().toISOString());
    if (biezacy.plik !== DASHBOARD && global.Auth.widziModul("dash")) {
      usunPanel();
      stan = { tryb: "zamkniety" };
      naDashboardzie = true;
      ramka().src = "strony/" + DASHBOARD;
      return;
    }
    wycieczka(L.krokiSystemu(DANE, grupa()), {});
  }

  /* ------------------------------ zdarzenia ------------------------------ */

  function obsluzSkrot(skrot) {
    if (stan.tryb === "wycieczka") return;
    if (skrot === "pokaz") pokazEkran();
    else if (stan.tryb === "panel") zamknij();
    else otworz("ekran");
  }

  function poZgloszeniuEkranu(ekran) {
    biezacy = { plik: ekran.plik, zapytanie: ekran.zapytanie || "" };
    if (naDashboardzie && ekran.plik === DASHBOARD) {
      naDashboardzie = false;
      wycieczka(L.krokiSystemu(DANE, grupa()), {});
      return;
    }
    if (!pierwszyEkran) return;
    pierwszyEkran = false;
    if (global.localStorage.getItem(L.kluczWidzianego(sesja().login)) === null) pokazSystem();
  }

  global.addEventListener("message", function (ev) {
    if (!ramka() || ev.source !== ramka().contentWindow || !ev.data) return;
    if (ev.data.typ === "kfs:ekran") poZgloszeniuEkranu(ev.data);
    if (ev.data.typ === "kfs:przewodnik-skrot") obsluzSkrot(ev.data.skrot);
  });

  document.addEventListener("keydown", function (e) {
    var skrot = L.skrot(e);
    if (skrot) { e.preventDefault(); obsluzSkrot(skrot); return; }
    if (e.key === "Escape" && stan.tryb === "panel") { e.preventDefault(); zamknij(); }
  });

  global.KFS.gotowe(wstawPrzyciski);

  global.Przewodnik = { pokazEkran: pokazEkran, otworz: otworz, zamknij: zamknij, pokazSystem: pokazSystem,
                        stan: function () { return stan.tryb; } };
})(window);
