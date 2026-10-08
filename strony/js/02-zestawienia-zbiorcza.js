/* Ekran 02, czesc 7: zmiana zbiorcza statusu z potwierdzeniem, cofaniem i historia (D-234).
   Kazda zmiana zbiorcza dostaje wspolny identyfikator partii w rejestrze aktywnosci, po nim
   cofa sie cala partie. Rejestr jest tylko do dopisywania (D-211): cofniecie dopisuje nowe
   wpisy z partia "COF:<partia>", niczego nie kasuje. Kolumny statusu, etapu i rozliczenia
   zmieniaja sie razem przez assets/statusy.js. Same deklaracje. */

var TYP_ZBIORCZA = "Zmiana zbiorcza";
var TYP_COFNIECIE = "Cofnięcie zmiany zbiorczej";
var PREFIKS_COFNIECIA = "COF:";
/* Wnioski zafakturowane i rozliczone nie zmieniaja statusu zbiorczo: cofniecie nie odtworzy faktury */
var ROZLICZENIA_CHRONIONE = ["Zafakturowany", "Rozliczone"];

function nowaPartia() { return "PART-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1296).toString(36); }

/* Dzieli wybrane wnioski na te, ktore zmienimy, i pominiete z powodem */
function planZmianyZbiorczej(wnioski, status) {
  var plan = { zmieniane: [], juzMaStatus: 0, chronione: 0 };
  wnioski.forEach(function (w) {
    if (Statusy.wartosc(w) === status) plan.juzMaStatus++;
    else if (ROZLICZENIA_CHRONIONE.indexOf(w.rozliczenie) >= 0) plan.chronione++;
    else plan.zmieniane.push(w);
  });
  return plan;
}

function tekstPotwierdzenia(plan, status) {
  var t = "Zmienić status na „" + status + "” w " + plan.zmieniane.length + " wnioskach?";
  if (plan.juzMaStatus) t += "\nPominięte, bo już mają ten status: " + plan.juzMaStatus + ".";
  if (plan.chronione) t += "\nPominięte, bo są zafakturowane lub rozliczone: " + plan.chronione + ".";
  return t + "\nZmianę można cofnąć przyciskiem „Cofnij ostatnią zmianę zbiorczą”.";
}

function wykonajZmianeZbiorcza(wnioski, status, kto) {
  var partia = nowaPartia();
  wnioski.forEach(function (w) {
    var przed = Statusy.wartosc(w);
    Statusy.zmien(w, Statusy.akcjaDlaStatusu(status), kto);
    Store.insert("rejestr_aktywnosci", {
      czas: kto.czas, kto: Auth.sesja().imie, typ: TYP_ZBIORCZA, obiekt: w.id, pole: "Status decyzji",
      przed: przed, po: status, partia: partia
    }, "AKT-");
  });
  return { partia: partia, liczba: wnioski.length };
}

/* Ostatnia partia zmiany zbiorczej, ktorej jeszcze nie cofnieto (kolejnosc dopisywania do rejestru) */
function ostatniaPartiaDoCofniecia() {
  var wpisy = Store.get("rejestr_aktywnosci").filter(function (r) { return r.partia; });
  var cofniete = {};
  wpisy.forEach(function (r) {
    if (r.typ === TYP_COFNIECIE) cofniete[r.partia.slice(PREFIKS_COFNIECIA.length)] = true;
  });
  var kandydaci = wpisy.filter(function (r) { return r.typ === TYP_ZBIORCZA && !cofniete[r.partia]; });
  return kandydaci.length ? kandydaci[kandydaci.length - 1].partia : null;
}

/* Przywraca wartosci "przed" z partii. Wniosek zmieniony po partii (status inny niz "po") zostaje
   bez zmian, zeby cofniecie nie nadpisalo pozniejszej, recznej edycji. */
function cofnijPartie(partia, kto) {
  var wpisy = Store.get("rejestr_aktywnosci").filter(function (r) { return r.partia === partia && r.typ === TYP_ZBIORCZA; });
  if (!wpisy.length) throw new Error("Nie ma zmiany zbiorczej o identyfikatorze " + partia);
  var wynik = { partia: partia, przywrocone: 0, pominiete: 0 };
  wpisy.forEach(function (r) {
    var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === r.obiekt; })[0];
    if (!w || Statusy.wartosc(w) !== r.po) { wynik.pominiete++; return; }
    Statusy.zmien(w, Statusy.akcjaDlaStatusu(r.przed), kto);
    Store.insert("rejestr_aktywnosci", {
      czas: kto.czas, kto: Auth.sesja().imie, typ: TYP_COFNIECIE, obiekt: r.obiekt, pole: "Status decyzji",
      przed: r.po, po: r.przed, partia: PREFIKS_COFNIECIA + partia
    }, "AKT-");
    wynik.przywrocone++;
  });
  /* Znacznik partii cofnietej, takze gdy zaden wniosek nie wymagal przywrocenia */
  if (!wynik.przywrocone) {
    Store.insert("rejestr_aktywnosci", {
      czas: kto.czas, kto: Auth.sesja().imie, typ: TYP_COFNIECIE, obiekt: partia, pole: "Partia",
      przed: String(wpisy.length), po: "0", partia: PREFIKS_COFNIECIA + partia
    }, "AKT-");
  }
  return wynik;
}

/* Wpisy rejestru dotyczace jednego wniosku, najnowsze na gorze (D-234) */
function historiaWniosku(id) {
  return DB.AKTYWNOSC.filter(function (r) { return r.obiekt === id; })
    .sort(function (a, b) { return a.czas < b.czas ? 1 : a.czas > b.czas ? -1 : 0; });
}
