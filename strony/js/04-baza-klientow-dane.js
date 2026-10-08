/* Ekran 04, czesc 1: stan strony, budowa wierszy klientow z naborami, statusy wnioskow.
   Plik zawiera wylacznie deklaracje. Dane sa czytane dopiero w inicjuj04() i przebuduj04(). */

var MS_NA_DOBE = 86400000;
var STAN_04 = { DZIS: null, NAB: {}, K: [], WN_BY_KL: {}, expanded: {}, edytowanyKlient: null };

/* Jeden nabor per urzad wybiera widok v_urzedy_nabory (D-272): trwajacy albo oczekujacy
   nabor ogloszony, potem prognoza, na koncu ostatni zakonczony (DB.PUPY[].stan). */
function budujNabory() {
  var nab = {};
  DB.PUPY.forEach(function (p) { nab[p.id] = p; });
  return nab;
}

function naborKlienta(kl) {
  return STAN_04.NAB[kl.pup] || null;
}
function dniDo(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso) - STAN_04.DZIS) / MS_NA_DOBE);
}
function nazwaIS(id) {
  var i = DB.INSTYTUCJE.filter(function (x) { return x.id === id; })[0];
  return i ? i.nazwa : "-";
}

function kluczSortowania(status, koniec) {
  if (status === "trwa") return 1000 + (dniDo(koniec) || 0);
  if (status === "oczekuje") return 20000;
  if (status === "prognozowany") return 30000;
  return 40000;
}
function budujK() {
  return DB.KLIENCI.map(function (kl) {
    var urzad = naborKlienta(kl);
    var st = urzad && urzad.stan ? urzad.stan : "Bez informacji";
    var koniec = urzad && urzad.nabor && st !== "prognozowany" ? urzad.nabor.do || "" : "";
    var n = urzad ? { status: st, prognoza: urzad.prognoza ? urzad.prognoza.opis || urzad.prognoza.od : null } : null;
    return {
      kl: kl, nab: n, status: st, koniec: koniec,
      dni: koniec ? dniDo(koniec) : null,
      wnioski: STAN_04.WN_BY_KL[kl.id] || [],
      isNazwa: nazwaIS(kl.is),
      pupNazwa: (DB.PUPY.filter(function (p) { return p.id === kl.pup; })[0] || {}).nazwa || "-",
      klucz: kluczSortowania(st, koniec)
    };
  }).sort(function (a, b) { return a.klucz - b.klucz || a.kl.nr - b.kl.nr; });
}

/* ---------- Filtr statusu: klienci i ich rozwiniete wnioski ----------
   Wybor wielokrotny, lacznie (lub). Domyslnie "przed": klienci bez wniosku albo
   z wnioskiem Niezlozony / NW. Brak wyboru = wszyscy klienci i wszystkie wnioski. */
function wybraneStatusy04() { return Wielowybor.wartosci(document.getElementById("fStatusWn")); }

function wniosekPasuje(w, f) {
  if (f === "przed") return Statusy.przedZlozeniem(w);
  if (f === "aktywne") return w.rozliczenie !== "Rozliczone";
  if (f === "Rozliczone") return w.rozliczenie === "Rozliczone";
  return Statusy.wartosc(w) === f;
}
function wnioskiWFiltrze(list) {
  var wybrane = wybraneStatusy04();
  return list.filter(function (w) { return !wybrane.length || wybrane.some(function (f) { return wniosekPasuje(w, f); }); });
}
function klientWFiltrzeStatusu(r) {
  var wybrane = wybraneStatusy04();
  if (!wybrane.length) return true;
  if (wybrane.indexOf("przed") >= 0 && !r.wnioski.length) return true;
  return wnioskiWFiltrze(r.wnioski).length > 0;
}

/* Przebudowa danych po starcie i po kazdej zmianie bazy */
function przebuduj04() {
  STAN_04.WN_BY_KL = Statusy.wnioskiPoKlientach(DB.WNIOSKI_WSZYSTKIE);
  STAN_04.K = budujK();
  renderKPI(); render();
}
