/* Panel instytucji: eksporty danych instytucji do CSV i Excela (D-317), przez assets/eksport.js.
   Dane z tych samych list co ekran (STAN_16, czyli DB.* zawezone do zakresu konta: handlowiec
   widzi tylko swoich klientow). Pola wedlug uprawnien: PESEL tylko z funkcja klient.pesel,
   kwoty tylko z finanse.kwoty_wniosku, stawki i kwoty prowizji nigdy (D-07). Same deklaracje. */

var POZYCJE_EKSPORTU_16 = [
  { klucz: "klienci", etykieta: "Klienci" }, { klucz: "projekty", etykieta: "Projekty (wnioski)" },
  { klucz: "zlozone", etykieta: "Złożone wnioski" }, { klucz: "uczestnicy", etykieta: "Uczestnicy szkoleń" },
  { klucz: "terminy", etykieta: "Terminy szkoleń" }, { klucz: "katalog", etykieta: "Katalog szkoleń" }
];
var PESEL_UKRYTY_16 = "(ukryty)";

function kwotyWidoczne16() { return Auth.moze("finanse.kwoty_wniosku"); }

function terminTekst16(id) {
  var t = DB.TERMINY.filter(function (x) { return x.id === id; })[0];
  return t ? DB.fmtDate(t.od) + (t.do && t.do !== t.od ? " - " + DB.fmtDate(t.do) : "") : "";
}

function kolumnyProjektow16() {
  var kolumny = [{ k: "nr", n: "Numer" }, { k: "klient", n: "Klient" }, { k: "nip", n: "NIP" }, { k: "urzad", n: "Urząd pracy" },
    { k: "szkolenia", n: "Szkolenia" }, { k: "osob", n: "Osób" }, { k: "zlozenie", n: "Status złożenia" }, { k: "decyzja", n: "Decyzja" },
    { k: "rozliczenie", n: "Rozliczenie" }, { k: "data", n: "Data wniosku" }];
  if (!kwotyWidoczne16()) return kolumny;
  return kolumny.concat([{ k: "wartosc", n: "Wartość wnioskowana" }, { k: "przyznano", n: "Przyznano" }, { k: "wklad", n: "Wkład własny" }]);
}

function wierszProjektu16(w) {
  return { nr: w.nr, klient: w.klNazwa, nip: w.nip, urzad: w.pupNazwa, osob: w.osob, zlozenie: w.statusSkl, decyzja: w.statusDec,
    rozliczenie: w.rozliczenie, data: DB.fmtDate(w.dataWniosku),
    szkolenia: (w.szkoleniaWniosku || []).map(function (s) { return s.nazwa; }).join(", "),
    wartosc: w.kwotaWnioskowana, przyznano: w.przyznano, wklad: w.wklad };
}

function kolumnyUczestnikow16() {
  var kolumny = [{ k: "nr", n: "Numer wniosku" }, { k: "klient", n: "Klient" }, { k: "imie", n: "Uczestnik" }, { k: "pesel", n: "PESEL" },
    { k: "szkolenie", n: "Szkolenie" }, { k: "termin", n: "Termin" }, { k: "status", n: "Kwalifikacja" }];
  return kwotyWidoczne16() ? kolumny.concat([{ k: "kwota", n: "Kwota szkolenia" }]) : kolumny;
}

function wierszeUczestnikow16() {
  var pesel = Auth.moze("klient.pesel");
  return STAN_16.W.reduce(function (wynik, w) {
    return wynik.concat((w.uczestnicy || []).map(function (u) {
      return { nr: w.nr, klient: w.klNazwa, imie: u.imie, pesel: pesel ? u.pesel : (u.pesel ? PESEL_UKRYTY_16 : ""),
               szkolenie: u.szkNazwa, termin: terminTekst16(u.termin), status: u.status, kwota: u.kwota };
    }));
  }, []);
}

/* Definicja kazdej pozycji: kolumny i wiersze w chwili eksportu (filtry zakresu z warstwy danych) */
function danePozycji16(klucz) {
  if (klucz === "klienci") {
    return { kolumny: NAGLOWKI_EKSPORTU_16.map(function (n, i) { return { k: "c" + i, n: n }; }),
      wiersze: STAN_16.KL.map(function (k) {
        var w = {};
        [k.nr, k.nazwa, k.nip, k.miasto, k.adres, k.osoba, k.tel, k.mail, nazwyUrzedow16(k), k.wielkosc, k.zatrudnienie].forEach(function (v, i) { w["c" + i] = v; });
        return w;
      }) };
  }
  if (klucz === "projekty") return { kolumny: kolumnyProjektow16(), wiersze: STAN_16.W.map(wierszProjektu16) };
  if (klucz === "zlozone") return { kolumny: kolumnyProjektow16(), wiersze: zlozone16().map(wierszProjektu16) };
  if (klucz === "uczestnicy") return { kolumny: kolumnyUczestnikow16(), wiersze: wierszeUczestnikow16() };
  if (klucz === "terminy") {
    return { kolumny: [{ k: "nazwa", n: "Szkolenie" }, { k: "od", n: "Od" }, { k: "do", n: "Do" }, { k: "miejsce", n: "Miejsce" },
      { k: "status", n: "Status" }, { k: "zapisani", n: "Zapisani" }, { k: "limit", n: "Limit miejsc" }],
      wiersze: STAN_16.TR.map(function (t) { return { nazwa: t.nazwa, od: DB.fmtDate(t.od), do: DB.fmtDate(t.do), miejsce: t.miejsce, status: t.status, zapisani: t.zapisani, limit: t.limit }; }) };
  }
  return { kolumny: [{ k: "nazwa", n: "Szkolenie" }, { k: "godz", n: "Godzin" }, { k: "dni", n: "Dni" }, { k: "tryb", n: "Tryb" }, { k: "ceny", n: "Ceny" }],
    wiersze: STAN_16.SZ.map(function (s) { return { nazwa: s.nazwa, godz: s.godz, dni: s.dni, tryb: s.tryb, ceny: (s.ceny || [s.cena]).join(", ") }; }) };
}

function eksportuj16(klucz, format) {
  var pozycja = POZYCJE_EKSPORTU_16.filter(function (p) { return p.klucz === klucz; })[0];
  var dane = danePozycji16(klucz);
  Eksport.pobierz({ nazwa: klucz + "-" + STAN_16.inst.id, kolumny: dane.kolumny, wiersze: dane.wiersze, format: format,
    arkusz: pozycja.etykieta, opis: "Panel instytucji: " + pozycja.etykieta });
}

function podepnijEksporty16() {
  var kontener = el16("btnEksportKlientow");
  kontener.hidden = !Auth.moze("klienci.eksport");
  kontener.innerHTML = Eksport.menuHtml("menuEksportu16", POZYCJE_EKSPORTU_16, "eksportuj16");
}
