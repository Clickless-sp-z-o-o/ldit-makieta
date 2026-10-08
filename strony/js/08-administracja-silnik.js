/* Administracja 08: silnik rozliczenia prowizji per instytucja. Tylko deklaracje. */
/* ---------- Wersje warunkow i silnik: jedno zrodlo prowizji naliczonej ---------- */
function wersjeInstytucji(isId) {
  return Store.query("SELECT * FROM warunki_prowizyjne WHERE instytucja_id = ? ORDER BY obowiazuje_od", [isId])
    .map(function (r) {
      return { id: r.id, od: r.obowiazuje_od, do: r.obowiazuje_do, model: r.model,
               kumulacja: r.rodzaj_kumulacji, sposob: r.sposob_liczenia, stala: r.stawka_stala,
               progi: JSON.parse(r.progi || "[]") };
    });
}
function warunkiNaDzien(wersje, data) {
  try { return Prowizja.warunkiNaDzien(wersje, data); }
  catch (e) {
    if (e instanceof Prowizja.ProwizjaError) return null;
    throw e;
  }
}

function fakturyInstytucji(isId) {
  var projekty = STAN_08.poz.filter(function (w) { return w.is === isId; });
  var zwykle = projekty.map(function (w) { return { id: w.id, data: w.dataFaktury, kwota: w.podstawaProwizji }; });
  var korekty = DB.FAKTURY.filter(function (f) { return f.isId === isId && f.rodzaj === "korygujaca"; })
    .map(function (f) {
      var pierwotny = projekty.filter(function (w) { return w.fakturaId === f.korygowana; })[0];
      return { id: f.id, data: f.wystawiona, kwota: f.kwota, korygowana: pierwotny ? pierwotny.id : f.korygowana };
    });
  return { projekty: projekty, faktury: zwykle.concat(korekty) };
}

/* Nadpisanie per wniosek (D-136): procent albo kwota. Obrot zostaje w puli progowej (D-137),
   zmienia sie tylko prowizja tej pozycji. */
function zastosujNadpisanie(pozycja, w) {
  pozycja.wyliczona = pozycja.prowizja;
  if (!w || w.prowizjaRegula || !w.prowizjaTyp) return;
  pozycja.nadpisana = true;
  pozycja.prowizja = w.prowizjaTyp === "procent" ? pozycja.kwota * w.prowizjaProcent / 100 : w.prowizjaKwota;
  pozycja.stawka = pozycja.kwota ? pozycja.prowizja / pozycja.kwota * 100 : 0;
}

function rozliczInstytucje(inst) {
  var dane = fakturyInstytucji(inst.id);
  var wynik = { inst: inst, wersje: wersjeInstytucji(inst.id), projekty: dane.projekty.length,
                pozycje: [], blad: null };
  if (!dane.faktury.length) return wynik;
  var rozliczenie;
  try { rozliczenie = Prowizja.rozliczOkresy(wynik.wersje, dane.faktury); }
  catch (e) {
    if (!(e instanceof Prowizja.ProwizjaError)) throw e;
    wynik.blad = e.message;
    return wynik;
  }
  rozliczenie.okresy.forEach(function (okres) {
    var przed = 0;
    okres.pozycje.forEach(function (p) {
      var w = p.korekta ? null : STAN_08.mapWniosek[p.id];
      p.wniosek = w;
      p.faktura = p.korekta ? STAN_08.fakturyPoId[p.id] : null;
      p.klucz = okres.klucz;
      p.przed = p.korekta ? null : przed;
      zastosujNadpisanie(p, w);
      if (!p.korekta) przed += p.kwota;
      wynik.pozycje.push(p);
    });
  });
  return wynik;
}

/* Pozycje instytucji w wybranym okresie: rok biezacy, opcjonalnie miesiac daty faktury */
function pozycjeIS(isId, okres) {
  return STAN_08.wyniki[isId].pozycje.filter(function (p) {
    return p.data.slice(0, 4) === STAN_08.rok && (!okres || p.data.slice(0, 7) === okres);
  });
}
function podsumujPozycje(lista) {
  var s = { n: 0, obrot: 0, prow: 0, rozl: 0 };
  lista.forEach(function (p) {
    s.prow += p.prowizja;
    if (p.korekta) return;
    s.n++;
    s.obrot += p.kwota;
    if (p.wniosek && p.wniosek.rozliczenie === "Rozliczone") s.rozl += p.prowizja;
  });
  return s;
}
