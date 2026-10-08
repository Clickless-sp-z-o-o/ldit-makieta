/* Ekran Instytucje: stan wspolny i pomocnicze selektory danych.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
var STAN_06 = { wybrana: null, edytowanyPlan: null, widok: "przeglad", zakladka: "p-dane" };

/* Odmiana rzeczownika po liczebniku: 1 program, 2 programy, 5 programow (Intl.PluralRules dla polskiego) */
var REGULY_LICZBY_06 = new Intl.PluralRules("pl-PL");
var FORMY_06 = {
  klient: { one: "klient", few: "klienci", many: "klientów" },
  program: { one: "program", few: "programy", many: "programów" },
  projekt: { one: "projekt", few: "projekty", many: "projektów" }
};
function OdmianaError(komunikat) { this.name = "OdmianaError"; this.message = komunikat; }
OdmianaError.prototype = Object.create(Error.prototype);
function odmiana06(n, slowo) {
  var formy = FORMY_06[slowo];
  if (!formy) throw new OdmianaError("Brak form odmiany dla słowa: " + slowo);
  return formy[REGULY_LICZBY_06.select(n)] || formy.many;
}

var MODEL_TERMINOW = { kalendarz: "kalendarz instytucji", z_gory: "z góry (bez kalendarza)" };

function moznaEdytowac() { return Auth.edytujeModul("inst"); }
function jestInstytucja() { var s = Auth.sesja(); return !!s && s.instytucja_id != null; }

function klienciIS(id) { return DB.KLIENCI.filter(function (k) { return k.is === id; }); }
function szkoleniaIS(id) { return DB.SZKOLENIA.filter(function (s) { return s.is === id; }); }
function wnioski2026() { return DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.rok === "2026"; }); }
function wnioskiIS(id) { return wnioski2026().filter(function (w) { return w.is === id; }); }
function aktywneIS(id) {
  return wnioskiIS(id).filter(function (w) {
    if (w.statusSkl === "Złożony" && !w.statusDec) return true;
    return w.statusDec === "Pozytywna" && w.rozliczenie !== "Rozliczone";
  });
}
function aktualnaIS() { return DB.INSTYTUCJE.filter(function (x) { return x.id === STAN_06.wybrana; })[0] || null; }
function czyAktywna(id) { var r = Store.find("instytucje", id); return !!r && r.aktywna !== 0; }
function el(id) { return document.getElementById(id); }
function pokazTylkoGdyEdycja(id) { el(id).style.display = moznaEdytowac() ? "" : "none"; }
