/* Pusty formularz klienta w Excelu jak formularz LDIT (D-327, spotkanie 14.10.2026): jeden arkusz,
   na gorze dane firmy w dwoch kolumnach Pole | Wartosc (jedno pole w wierszu, sekcje na granatowym
   pasku, pola wymagane, nazwa firmy i NIP, na czerwono z gwiazdka), pod nimi tabela uczestnikow:
   kolumny to dane uczestnika, jedna osoba w wierszu. Wczesniej uczestnicy byli w osobnym arkuszu,
   ale klienci pomijali drugi arkusz, dlatego wszystko jest na jednej stronie.
   Nazwy pol to naglowki NAGLOWKI_SZABLONU_CSV (16-formularz-csv.js), wiec ten sam parser czyta plik
   z powrotem (parsujFormularzArkuszy, takze starszy plik z arkuszem Uczestnicy).
   Wymaga XlsxPlik (assets/xlsx-zapis.js). Same deklaracje. */

var LICZBA_POL_FIRMY_21 = 27;
var WIERSZE_UCZESTNIKOW_21 = 20;
var ZNAKOW_W_LINII_POLA_21 = 58;
var WYSOKOSC_LINII_21 = 15;
var WYSOKOSC_UWAGI_21 = 46;
var WYMAGANE_POLA_21 = ["Nazwa firmy", "NIP firmy"];
var KOLUMNY_ARKUSZA_21 = ["A", "B", "C", "D", "E"];
/* [nazwa sekcji, pierwszy indeks pola, indeks za ostatnim] w NAGLOWKI_SZABLONU_CSV. Nazwa sekcji
   nie moze byc nazwa pola (np. "Osoba do kontaktu"), bo import wzialby ja za pole. */
var SEKCJE_SZABLONU_21 = [
  ["Dane firmy", 0, 7], ["Kontakt w firmie", 7, 11], ["Rachunek bankowy i zatrudnienie", 11, 15],
  ["Podatki i reprezentacja", 15, 20], ["Zobowiązania i konto praca.gov.pl", 20, 23], ["Wielkość, urząd pracy i szkolenie", 23, LICZBA_POL_FIRMY_21]
];
var SEKCJA_UCZESTNIKOW_21 = "Uczestnicy szkolenia (jedna osoba w wierszu)";
var UWAGA_SZABLONU_21 = "Wpisz dane firmy w kolumnie Wartość, jedno pole w wierszu. Pola z gwiazdką (*) są wymagane: bez nazwy firmy i NIP " +
  "formularza nie da się zapisać. Zobowiązania i ugoda: wpisz TAK albo NIE. Uczestników wpisz w tabeli pod danymi firmy, " +
  "jedna osoba w wierszu. Rodzaj zatrudnienia: umowa o pracę, umowa zlecenie, umowa o dzieło albo właściciel.";

function wysokoscPola21(tekst) {
  var linie = Math.ceil(tekst.length / ZNAKOW_W_LINII_POLA_21);
  return linie > 1 ? linie * WYSOKOSC_LINII_21 + 3 : 0;
}

/* Wiersz scalony przez wszystkie kolumny tabeli uczestnikow */
function scalWiersz21(wiersze, scalenia, komorka, ostatnia) {
  wiersze.push([komorka].concat(KOLUMNY_ARKUSZA_21.slice(1, KOLUMNY_ARKUSZA_21.indexOf(ostatnia) + 1).map(function () { return { t: "", s: komorka.s }; })));
  scalenia.push("A" + wiersze.length + ":" + ostatnia + wiersze.length);
}

function polaFirmy21(wiersze, scalenia, wysokosci) {
  var S = XlsxPlik.STYL;
  wiersze.push([{ t: "Pole", s: S.NAGLOWEK }, { t: "Wartość", s: S.NAGLOWEK }]);
  SEKCJE_SZABLONU_21.forEach(function (sekcja) {
    scalWiersz21(wiersze, scalenia, { t: sekcja[0], s: S.SEKCJA }, "B");
    NAGLOWKI_SZABLONU_CSV.slice(sekcja[1], sekcja[2]).forEach(function (pole) {
      var wymagane = WYMAGANE_POLA_21.indexOf(pole) >= 0;
      var nazwa = wymagane ? pole + " *" : pole;
      if (wysokoscPola21(nazwa)) wysokosci[wiersze.length] = wysokoscPola21(nazwa);
      wiersze.push([{ t: nazwa, s: wymagane ? S.WYMAGANE : S.POLE }, { t: "", s: S.WARTOSC }]);
    });
  });
}

/* Tabela uczestnikow pod danymi firmy: naglowek z NAGLOWKI_SZABLONU_CSV i puste wiersze na osoby */
function tabelaUczestnikow21(wiersze, scalenia) {
  var S = XlsxPlik.STYL, naglowki = NAGLOWKI_SZABLONU_CSV.slice(LICZBA_POL_FIRMY_21);
  wiersze.push([]);
  scalWiersz21(wiersze, scalenia, { t: SEKCJA_UCZESTNIKOW_21, s: S.SEKCJA }, KOLUMNY_ARKUSZA_21[naglowki.length - 1]);
  wiersze.push(naglowki.map(function (n) { return { t: n, s: S.NAGLOWEK }; }));
  for (var i = 0; i < WIERSZE_UCZESTNIKOW_21; i++) wiersze.push(naglowki.map(function () { return { t: "", s: S.WARTOSC }; }));
}

/* Jeden arkusz "Formularz": tytul, uwaga, pola firmy Pole | Wartosc, tabela uczestnikow */
function arkuszFormularza21() {
  var S = XlsxPlik.STYL, wiersze = [], scalenia = [], wysokosci = { 1: WYSOKOSC_UWAGI_21 };
  scalWiersz21(wiersze, scalenia, { t: "Formularz zgłoszeniowy klienta KFS", s: S.TYTUL }, "E");
  scalWiersz21(wiersze, scalenia, { t: UWAGA_SZABLONU_21, s: S.UWAGA }, "E");
  polaFirmy21(wiersze, scalenia, wysokosci);
  tabelaUczestnikow21(wiersze, scalenia);
  return { nazwa: "Formularz", kolumny: [62, 48, 22, 24, 16], wiersze: wiersze, scalenia: scalenia, zamroz: 3, wysokosci: wysokosci };
}

/* Indeks wiersza naglowka tabeli uczestnikow w arkuszu (pierwsza komorka "Imie i nazwisko") */
function wierszNaglowkaUczestnikow21(arkusz) {
  return arkusz.wiersze.map(function (w) { return w[0] && w[0].t; }).indexOf(NAGLOWKI_SZABLONU_CSV[LICZBA_POL_FIRMY_21]);
}

/* Uint8Array pliku .xlsx z jednym arkuszem */
function szablonFormularzaXlsx21() {
  return XlsxPlik.skoroszyt([arkuszFormularza21()]);
}
