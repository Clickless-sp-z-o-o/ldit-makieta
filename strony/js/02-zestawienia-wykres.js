/* Ekran 02, czesc 5: filtry z wykresow (drill through, D-212). Klik w slupek, wiersz
   albo kafelek na dashboardzie i w statystykach otwiera te liste z parametrem
   w adresie. Filtr widac jako znacznik nad tabela i zdejmuje sie go krzyzykiem.
   Korzysta ze STAN_02. Same deklaracje. */

var MIESIACE_02 = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień",
                   "wrzesień", "październik", "listopad", "grudzień"];

/* parametr -> { etykieta(wartosc), pasuje(wniosek, wartosc) } */
var FILTRY_WYKRESU = {
  miesiac: {
    etykieta: function (v) { return "miesiąc wniosku: " + (MIESIACE_02[parseInt(v, 10) - 1] || v); },
    pasuje: function (w, v) { return !!w.dataWniosku && w.dataWniosku.slice(5, 7) === v; }
  },
  decyzja: {
    etykieta: function () { return "bez decyzji"; },
    pasuje: function (w) { return !w.statusDec; }
  },
  zlozone: {
    etykieta: function () { return "złożone w urzędzie"; },
    pasuje: function (w) { return w.statusSkl === "Złożony"; }
  },
  wielkosc: {
    etykieta: function (v) { return "wielkość: " + v; },
    pasuje: function (w, v) { return w.wielkosc === v; }
  },
  szkolenie: {
    etykieta: function (v) { return "szkolenie: " + v; },
    pasuje: function (w, v) { return w.szkolenie === v; }
  },
  rozl: {
    etykieta: function (v) { return "rozliczenie: " + v; },
    pasuje: function (w, v) { return w.rozliczenie === v; }
  },
  brak: {
    etykieta: function (v) { return { koszt: "pozytywne bez kosztu całkowitego", uczestnicy: "bez uczestników", niezakw: "z niezakwalifikowanymi" }[v] || v; },
    pasuje: function (w, v) {
      if (v === "koszt") return w.statusDec === "Pozytywna" && w.kosztCalkowity == null;
      if (v === "uczestnicy") return !w.uczestnicy.length;
      if (v === "niezakw") return w.osob > w.osobZakw;
      return true;
    }
  }
};

function wczytajFiltryWykresu() {
  var z = Nawigacja.odczytajZapytanie(location.search, Object.keys(FILTRY_WYKRESU));
  STAN_02.wykres = {};
  Object.keys(z).forEach(function (k) { if (z[k]) STAN_02.wykres[k] = z[k]; });
}

function pasujeDoWykresu(w) {
  return Object.keys(STAN_02.wykres).every(function (k) { return FILTRY_WYKRESU[k].pasuje(w, STAN_02.wykres[k]); });
}

function rysujChipyWykresu() {
  document.getElementById("chipyWykresu").innerHTML = Object.keys(STAN_02.wykres).map(function (k) {
    return '<span class="chip-filtr">' + esc(FILTRY_WYKRESU[k].etykieta(STAN_02.wykres[k])) +
      '<button type="button" title="Zdejmij filtr" onclick="zdejmijFiltrWykresu(\'' + escJs(k) + '\')">&times;</button></span>';
  }).join("");
}

function zdejmijFiltrWykresu(k) {
  delete STAN_02.wykres[k];
  rysujChipyWykresu();
  render();
}
