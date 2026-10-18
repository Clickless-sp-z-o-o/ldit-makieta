/* ============================================================================
   Przewodnik makiety: logika bez DOM, ta sama co w aplikacji
   (aplikacja/src/modules/ldit/panel/przewodnik/logika.ts i kroki-wycieczki.ts).

   - grupa rol konta (zespol LDIT albo instytucja) i ekrany widoczne dla konta,
   - dopasowanie strony makiety z adresem do ekranu aplikacji (warunki ?id=* jak trasy),
   - teksty z parametrami ({liczba}), linie tekstu, wyszukiwarka bez polskich znakow,
   - polozenie podswietlenia i okienka wycieczki.
   Dane: window.PrzewodnikTresci (assets/przewodnik-tresci.js, generowany).
   ============================================================================ */

(function (global) {
  "use strict";

  var ODSTEP_PODSWIETLENIA = 6;
  var ODSTEP_OKIENKA = 12;
  var MARGINES_OKNA = 8;
  var PREFIKS_WIDZIANEGO = "ldit.przewodnik.widziany:";

  /* Konto instytucji ma role typu "instytucja", reszta to zespol LDIT */
  function grupaKonta(sesja) {
    return sesja && sesja.rola_typ === "instytucja" ? "instytucja" : "zespol";
  }

  /* Tekst z kluczem i parametrami {nazwa}; brak klucza daje zapas (domyslnie pusty tekst) */
  function tekst(teksty, klucz, parametry, zapas) {
    var t = Object.prototype.hasOwnProperty.call(teksty, klucz) ? teksty[klucz] : (zapas === undefined ? "" : zapas);
    return String(t).replace(/\{(\w+)\}/g, function (calosc, nazwa) {
      return parametry && parametry[nazwa] !== undefined ? String(parametry[nazwa]) : calosc;
    });
  }

  function kluczEkranu(id, grupa, pole) { return "ldit.panel.przewodnik.ekran." + id + "." + grupa + "." + pole; }
  function kluczKotwicy(kotwica, pole) { return "ldit.panel.przewodnik.kotwica." + kotwica + "." + pole; }

  function linie(t) {
    return String(t || "").split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
  }

  /* "06-instytucje.html?id=*" -> { plik, warunki: [[nazwa, wartosc]] } */
  function rozbierzWzorzec(wzorzec) {
    var czesci = String(wzorzec).split("?");
    return { plik: czesci[0], warunki: Array.from(new URLSearchParams(czesci[1] || "")) };
  }

  /* Czy strona z zapytaniem pasuje do wzorca: ten sam plik i spelnione warunki (gwiazdka to dowolna niepusta wartosc) */
  function pasujeStrona(wzorzec, plik, zapytanie) {
    var w = rozbierzWzorzec(wzorzec);
    if (w.plik !== plik) return false;
    var p = new URLSearchParams(zapytanie || "");
    return w.warunki.every(function (warunek) {
      var wartosc = p.get(warunek[0]);
      return warunek[1] === "*" ? Boolean(wartosc) : wartosc === warunek[1];
    });
  }

  /* Wpis ograniczony do grup rol (karta projektu zespolu i projekt instytucji) dotyczy tylko tych grup */
  function dlaGrupy(wpis, grupa) { return !grupa || !wpis.grupy || wpis.grupy.indexOf(grupa) >= 0; }

  /* Wpis mapowania dla strony: najwiecej spelnionych warunkow wygrywa; brak to ogolna pomoc */
  function wpisStrony(strony, plik, zapytanie, grupa) {
    var najlepszy = null;
    strony.forEach(function (s) {
      if (!dlaGrupy(s, grupa) || !pasujeStrona(s.strona, plik, zapytanie)) return;
      var dokladnosc = rozbierzWzorzec(s.strona).warunki.length;
      if (!najlepszy || dokladnosc > najlepszy.dokladnosc) najlepszy = { wpis: s, dokladnosc: dokladnosc };
    });
    return najlepszy ? najlepszy.wpis : null;
  }

  function ekranPoId(dane, id) {
    return dane.ekrany.filter(function (e) { return e.id === id; })[0] || null;
  }

  /* Ekran biezacej strony dla grupy rol: { ekran, kroki } albo null (ogolna pomoc) */
  function ekranStrony(dane, plik, zapytanie, grupa) {
    var wpis = wpisStrony(dane.strony, plik, zapytanie, grupa);
    var ekran = wpis && ekranPoId(dane, wpis.ekran);
    if (!ekran || ekran.grupy.indexOf(grupa) < 0) return null;
    var kroki = wpis.pomocnicza ? [] : (ekran.wycieczka[grupa] || []);
    return { ekran: ekran, kroki: kroki };
  }

  /* Ekrany dla konta jak menu: ekran ma tresc dla grupy i konto widzi ktoras z jego stron.
     Adres to pierwsza widoczna strona bez warunkow w adresie (karta rekordu nie ma stalego adresu). */
  function ekranyKonta(dane, grupa, widziStrone) {
    return dane.ekrany.filter(function (e) { return e.grupy.indexOf(grupa) >= 0; }).map(function (e) {
      var strony = dane.strony.filter(function (s) { return s.ekran === e.id && dlaGrupy(s, grupa) && widziStrone(rozbierzWzorzec(s.strona).plik); });
      if (!strony.length) return null;
      var zLinkiem = strony.filter(function (s) { return !s.pomocnicza && s.strona.indexOf("?") < 0; })[0];
      return { ekran: e, adres: zLinkiem ? zLinkiem.strona : null };
    }).filter(Boolean);
  }

  /* Kroki wycieczki po systemie: pasek i menu, potem Dashboard grupy rol */
  function krokiSystemu(dane, grupa) {
    var dash = ekranPoId(dane, "dash");
    return dane.krokiPowloki.concat(dash ? (dash.wycieczka[grupa] || []) : []);
  }

  function doSzukania(t) {
    return String(t).toLocaleLowerCase("pl").replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /* Kazde slowo frazy musi wystapic w tytule albo tresci wpisu; pusta fraza nie daje wynikow */
  function szukaj(wpisy, fraza) {
    var slowa = doSzukania(fraza).split(/\s+/).filter(function (s) { return s.length > 0; });
    if (!slowa.length) return [];
    return wpisy.filter(function (w) {
      var t = doSzukania(w.tytul + " " + w.tresc);
      return slowa.every(function (s) { return t.indexOf(s) >= 0; });
    });
  }

  /* Podswietlenie: prostokat elementu z odstepem, przyciety do obszaru (okna albo ramki ekranu).
     Element poza obszarem (schowane menu na telefonie) daje pusty prostokat, wiec krok jest pomijany. */
  function prostokatPodswietlenia(cel, obszar) {
    var poza = cel.left + cel.width <= obszar.left || cel.left >= obszar.left + obszar.width ||
      cel.top + cel.height <= obszar.top || cel.top >= obszar.top + obszar.height;
    if (poza) return { left: obszar.left, top: obszar.top, width: 0, height: 0 };
    var left = Math.max(obszar.left, cel.left - ODSTEP_PODSWIETLENIA);
    var top = Math.max(obszar.top, cel.top - ODSTEP_PODSWIETLENIA);
    var right = Math.min(obszar.left + obszar.width, cel.left + cel.width + ODSTEP_PODSWIETLENIA);
    var bottom = Math.min(obszar.top + obszar.height, cel.top + cel.height + ODSTEP_PODSWIETLENIA);
    return { left: left, top: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  /* Okienko pod podswietleniem, a gdy brak miejsca nad nim; gdy element zajmuje caly ekran, w prawym dolnym rogu */
  function pozycjaOkienka(podswietlenie, okienko, okno) {
    var maxLeft = Math.max(MARGINES_OKNA, okno.szerokosc - okienko.szerokosc - MARGINES_OKNA);
    var left = Math.min(Math.max(MARGINES_OKNA, podswietlenie.left), maxLeft);
    var pod = podswietlenie.top + podswietlenie.height + ODSTEP_OKIENKA;
    if (pod + okienko.wysokosc <= okno.wysokosc - MARGINES_OKNA) return { left: left, top: pod };
    var nad = podswietlenie.top - ODSTEP_OKIENKA - okienko.wysokosc;
    if (nad >= MARGINES_OKNA) return { left: left, top: nad };
    return { left: maxLeft, top: Math.max(MARGINES_OKNA, okno.wysokosc - okienko.wysokosc - MARGINES_OKNA) };
  }

  /* Pierwsze wejscie: znacznik "widziane" per konto demo, ten sam klucz co w aplikacji */
  function kluczWidzianego(login) { return PREFIKS_WIDZIANEGO + String(login || "").trim().toLowerCase(); }

  /* Skrot klawisza poza polami tekstowymi: Shift+? pokazuje ekran, Shift+P otwiera i zamyka panel */
  function skrot(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return null;
    var nazwa = e.key === "?" ? "pokaz" : (e.shiftKey && e.code === "KeyP" ? "panel" : null);
    if (!nazwa) return null;
    var cel = e.target;
    if (cel && cel.closest && (cel.isContentEditable || cel.closest("input, textarea, select"))) return null;
    return nazwa;
  }

  global.PrzewodnikLogika = {
    grupaKonta: grupaKonta, tekst: tekst, kluczEkranu: kluczEkranu, kluczKotwicy: kluczKotwicy, linie: linie,
    pasujeStrona: pasujeStrona, wpisStrony: wpisStrony, ekranStrony: ekranStrony, ekranyKonta: ekranyKonta,
    krokiSystemu: krokiSystemu, doSzukania: doSzukania, szukaj: szukaj,
    prostokatPodswietlenia: prostokatPodswietlenia, pozycjaOkienka: pozycjaOkienka,
    kluczWidzianego: kluczWidzianego, skrot: skrot
  };
})(window);
