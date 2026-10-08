/* Ekran 02, czesc 1: stan strony, zrodlo wnioskow zakladki, statusy i zapis zmiany statusu.
   Plik zawiera wylacznie deklaracje. Dane sa czytane dopiero w inicjuj02(). */

/* NIEPRZYPISANE to wnioski bez roku (D-165) */
var NIEPRZYPISANE = Lata.NIEPRZYPISANE;
/* forcedInst: instytucja z ?is=, rokAktywny: zakladka roczna (D-159), batch: wstrzymanie
   przerysowania przy operacjach masowych, trybKolejnosci: przyciski Wyzej/Nizej i przeciaganie
   widac dopiero po wlaczeniu "Ustaw kolejnosc" (przeglad 08.10) */
var STAN_02 = { forcedInst: null, rokAktywny: "", W: [], batch: false, wykres: {}, trybKolejnosci: false };

/* Rok z adresu (powrot z karty wniosku), jesli ma zakladke, inaczej zakladka domyslna */
function wybierzRokDomyslny() {
  var zAdresu = Nawigacja.odczytajZapytanie(location.search, ["rok"]).rok;
  if (zAdresu === NIEPRZYPISANE || DB.LATA.some(function (l) { return l.rok === zAdresu; })) return zAdresu;
  return Lata.domyslny();
}

/* Wejscie z listy instytucji w menu (?is=nazwa): pokazuj TYLKO dane tej instytucji.
   Filtr jest zakladany na zrodlowej liscie wnioskow w budujW(), nie tylko w widoku tabeli.
   Rzeczywista separacja jest w warstwie danych makiety (assets/zakres.js) (D-35). */
function znajdzWymuszonaInstytucje() {
  var nazwa = new URLSearchParams(location.search).get("is");
  return nazwa ? DB.INSTYTUCJE.filter(function (i) { return i.nazwa === nazwa; })[0] || null : null;
}

function wnioskiZakladki(rok) {
  if (rok === NIEPRZYPISANE) return DB.WNIOSKI_BEZ_ROKU;
  return DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return String(w.rok) === rok; });
}
function budujW() {
  var lista = wnioskiZakladki(STAN_02.rokAktywny);
  var inst = STAN_02.forcedInst;
  return inst ? lista.filter(function (w) { return w.is === inst.id; }) : lista;
}

/* Zmiana statusu z menu wiersza (02-zestawienia-status.js) trafia do rejestru aktywnosci (D-116).
   Koszt calkowity (reczny, D-58) i regula przyznano: karta 03-wniosek.
   Status, etap i rozliczenie zmieniaja sie razem (assets/statusy.js). */
function terazStr() {
  var d = new Date();
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function logZmiana(obiekt, pole, przed, po) {
  Store.insert("rejestr_aktywnosci", {
    czas: terazStr(), kto: Auth.sesja().imie, typ: "Zmiana statusu",
    obiekt: obiekt, pole: pole, przed: przed || "brak", po: po
  }, "AKT-");
}
function znajdzWniosek(id) {
  return STAN_02.W.filter(function (x) { return x.id === id; })[0];
}
function patchStatusu(w, status) {
  return Statusy.patch(w, Statusy.akcjaDlaStatusu(status), terazStr().slice(0, 10));
}
function ktoZmienia() { return { czas: terazStr(), uzytkownik: Auth.sesja().uzytkownik_id }; }
function zmienStatus(id, val) {
  var w = znajdzWniosek(id);
  Statusy.zmien(w, Statusy.akcjaDlaStatusu(val), ktoZmienia());
  logZmiana(id, "Status", Statusy.wartosc(w), val);
}
