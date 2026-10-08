/* Administracja 08: zamykanie okresu prowizji (D-276, R-03). Silnik liczy prowizje na biezaco,
   a zamkniety miesiac ma zamrozony wynik w prowizje_zamkniete: pozniejsza poprawka starego
   wniosku go nie zmienia, korekta trafia do biezacego okresu (D-162). Zamyka administrator
   (zapis wymaga edycji Administracji). Tylko deklaracje. */

function zamknieteOkresu08(okres) {
  var m = {};
  if (!okres) return m;
  Store.query("SELECT * FROM prowizje_zamkniete WHERE okres = ?", [okres]).forEach(function (r) { m[r.instytucja_id] = r; });
  return m;
}

/* Wiersz instytucji z zamknietego okresu bierze liczby z zapisu, nie z silnika */
function zZamkniecia08(r, zapis) {
  if (!zapis) return r;
  r.n = zapis.liczba_wnioskow; r.obrot = zapis.podstawa; r.prow = zapis.prowizja; r.zamkniety = zapis.zamknieto;
  return r;
}

/* Zwraca liczbe zamknietych instytucji; okres to miesiac RRRR-MM, caly rok sie nie zamyka */
function zamknijOkres08(okres, wiersze) {
  if (!/^\d{4}-\d{2}$/.test(okres || "")) return { ok: false, bledy: ["Wybierz miesiąc, cały rok nie jest okresem rozliczeniowym."] };
  var juz = zamknieteOkresu08(okres), kto = Akceptacje.ktoTeraz(), n = 0;
  wiersze.filter(function (r) { return !r.blad && !juz[r.inst.id]; }).forEach(function (r) {
    Store.insert("prowizje_zamkniete", { instytucja_id: r.inst.id, okres: okres, liczba_wnioskow: r.n, podstawa: r.obrot,
      prowizja: Math.round(r.prow * 100) / 100, zamknieto: kto.czas, zamknal_id: kto.uzytkownik }, "PZM-");
    n++;
  });
  return { ok: true, zamknieto: n };
}

function przyciskZamkniecia08(okres) {
  var juz = Object.keys(zamknieteOkresu08(okres)).length;
  return /^\d{4}-\d{2}$/.test(okres || "") ? (juz ? '<span class="tag set">okres zamknięty</span>'
    : '<button class="btn sm" id="btnZamknijOkres" title="Zamraża wynik prowizji tego miesiąca">Zamknij okres</button>') : "";
}

function klikZamknijOkres08() {
  var okres = STAN_08.selOkres.value;
  if (!window.confirm("Zamknąć okres " + nazwaOkresu(okres) + "? Prowizje tego miesiąca przestaną się przeliczać.")) return;
  var wynik = zamknijOkres08(okres, wierszeProwizji(okres));
  if (!wynik.ok) { window.alert(wynik.bledy.join(" ")); return; }
  renderProwizje();
}
