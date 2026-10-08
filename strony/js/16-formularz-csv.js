/* Import formularza zgloszeniowego z pliku CSV (D-244, D-256, D-257) i szablon do pobrania (D-269).
   Czysta logika bez DOM, uzywana przez panel instytucji (16), Nowy formularz (21) i ekran Do akceptacji (20).

   Format: pierwszy wiersz to naglowki, kazdy kolejny wiersz to jeden uczestnik.
   Dane firmy bierzemy z pierwszego wiersza, w ktorym sa wypelnione.
   Naglowki to polskie nazwy z formularza klienta albo nazwy kolumn bazy (np. telefon_biura).
   Separator ; albo , rozpoznawany z naglowka. Excel zapisuje CSV ze srednikiem. */

/* Naglowek znormalizowany -> kolumna formularza. Klucz "bank_i_konto" i "forma_i_stawka"
   to pola zlozone z listy klienta (jedna kolumna na dwie wartosci), rozbijane przy imporcie. */
var KOLUMNY_FIRMY_CSV = {
  firma: "firma", nazwa: "firma", "nazwa firmy": "firma",
  nip: "nip", "nip firmy": "nip",
  adres: "adres_siedziby", "adres siedziby": "adres_siedziby", miasto: "miasto",
  "numer telefonu do biura firmy": "telefon_biura", "telefon do biura": "telefon_biura", telefon_biura: "telefon_biura",
  "adres e-mail firmy": "email_firmy", "adres email firmy": "email_firmy", "e-mail firmy": "email_firmy", email_firmy: "email_firmy",
  "imie i nazwisko osoby do kontaktu": "kontakt", "osoba kontaktowa": "kontakt", "osoba do kontaktu": "kontakt", kontakt: "kontakt",
  "stanowisko osoby do kontaktu": "stanowisko_kontaktowej", stanowisko_kontaktowej: "stanowisko_kontaktowej",
  "numer telefonu osoby do kontaktu": "telefon", "telefon osoby do kontaktu": "telefon", telefon: "telefon",
  "adres e-mail osoby do kontaktu": "email", "e-mail osoby do kontaktu": "email", email: "email", "e-mail": "email",
  "nazwa banku i numer firmowego rachunku bankowego": "bank_i_konto", "nazwa banku": "nazwa_banku", nazwa_banku: "nazwa_banku",
  "numer konta": "numer_konta", konto: "numer_konta", "numer rachunku": "numer_konta", "numer rachunku bankowego": "numer_konta",
  numer_konta: "numer_konta",
  "liczba zatrudnionych pracownikow w ramach umowy o prace": "liczba_zatrudnionych", "liczba zatrudnionych": "liczba_zatrudnionych",
  zatrudnieni: "liczba_zatrudnionych", liczba_zatrudnionych: "liczba_zatrudnionych",
  "liczba zatrudnionych pracownikow w ramach umowy o prace w przeliczeniu na etaty": "etaty", etaty: "etaty",
  "liczba zatrudnionych pracownikow wykonujacych prace w oparciu o inne umowy": "liczba_innych_umow",
  "inne umowy": "liczba_innych_umow", liczba_innych_umow: "liczba_innych_umow",
  "forma opodatkowania prowadzonej dzialalnosci": "forma_i_stawka", "forma opodatkowania": "forma_i_stawka",
  forma_opodatkowania: "forma_i_stawka", "stawka podatku": "stawka_podatku", stawka_podatku: "stawka_podatku",
  "imie i nazwisko osoby uprawnionej do reprezentacji i podpisania dokumentacji": "reprezentant_1", reprezentant_1: "reprezentant_1",
  "stanowisko osoby uprawnionej do reprezentacji": "reprezentant_1_stanowisko", reprezentant_1_stanowisko: "reprezentant_1_stanowisko",
  "imie i nazwisko drugiej osoby uprawnionej do reprezentacji": "reprezentant_2",
  "imie i nazwisko drugiej osoby uprawnionej do reprezentacji i podpisania dokumentacji": "reprezentant_2", reprezentant_2: "reprezentant_2",
  "stanowisko drugiej osoby uprawnionej do reprezentacji": "reprezentant_2_stanowisko", reprezentant_2_stanowisko: "reprezentant_2_stanowisko",
  "czy firma posiada nieuregulowane zobowiazania": "zadluzenie", zadluzenie: "zadluzenie",
  "rodzaj zobowiazan": "zadluzenie_rodzaj",
  "czy zostalo zawarte porozumienie badz ugoda": "zadluzenie_ugoda", "porozumienie lub ugoda": "zadluzenie_ugoda", ugoda: "zadluzenie_ugoda", zadluzenie_ugoda: "zadluzenie_ugoda",
  "czy posiada konto organizacji na praca.gov.pl": "konto_praca_gov", "konto na praca.gov.pl": "konto_praca_gov",
  konto_praca_gov: "konto_praca_gov",
  wielkosc: "wielkosc", "wielkosc przedsiebiorstwa": "wielkosc", "urzad pracy": "pup_nazwa", szkolenie: "szkolenie", uwagi: "uwagi"
};
var KOLUMNY_UCZESTNIKA_CSV = {
  "imie i nazwisko": "imie_nazwisko", uczestnik: "imie_nazwisko", "rodzaj zatrudnienia": "rodzaj_zatrudnienia",
  zatrudnienie: "rodzaj_zatrudnienia", wyksztalcenie: "wyksztalcenie", zawod: "zawod", pesel: "pesel"
};
var KODY_ZATRUDNIENIA_CSV = [
  ["prac", "umowa_o_prace"], ["uop", "umowa_o_prace"], ["zlec", "umowa_zlecenie"], ["dzie", "umowa_o_dzielo"],
  ["wlasc", "wlasciciel"], ["wlasn", "wlasciciel"], ["jdg", "wlasciciel"]
];

/* Naglowki szablonu do pobrania: polskie nazwy z formularza klienta (kolejnosc jak u klienta), D-256, D-257 */
var NAGLOWKI_SZABLONU_CSV = [
  "Nazwa firmy", "Adres siedziby", "Miasto", "Numer telefonu do biura firmy", "Adres e-mail firmy", "NIP firmy",
  "Imię i nazwisko osoby do kontaktu", "Stanowisko osoby do kontaktu", "Numer telefonu osoby do kontaktu", "Adres e-mail osoby do kontaktu",
  "Nazwa banku i numer firmowego rachunku bankowego",
  "Liczba zatrudnionych pracowników w ramach umowy o pracę",
  "Liczba zatrudnionych pracowników w ramach umowy o pracę w przeliczeniu na etaty",
  "Liczba zatrudnionych pracowników wykonujących pracę w oparciu o inne umowy",
  "Forma opodatkowania prowadzonej działalności (wpisać właściwą oraz podać odpowiedni % podatku)",
  "Imię i nazwisko osoby uprawnionej do reprezentacji i podpisania dokumentacji", "Stanowisko osoby uprawnionej do reprezentacji",
  "Imię i nazwisko drugiej osoby uprawnionej do reprezentacji", "Stanowisko drugiej osoby uprawnionej do reprezentacji",
  "Czy firma posiada nieuregulowane zobowiązania? (TAK/NIE)", "Rodzaj zobowiązań (ZUS / US / ZUS i US / inne)",
  "Czy zostało zawarte porozumienie bądź ugoda? (TAK/NIE)",
  "Czy posiada konto organizacji na praca.gov.pl? (TAK/NIE, konto musi być zweryfikowane)",
  "Wielkość", "Urząd pracy", "Szkolenie", "Uwagi",
  "Imię i nazwisko", "Rodzaj zatrudnienia", "Wykształcenie", "Zawód", "PESEL"
];

/* Male litery bez polskich znakow, pojedyncze spacje */
function normalizujCsv(tekst) {
  var mapa = { "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z" };
  return String(tekst || "").toLowerCase().replace(/[ąćęłńóśźż]/g, function (z) { return mapa[z]; })
    .replace(/\s+/g, " ").trim();
}

/* Naglowek bez uwag w nawiasach i pytajnika: "Czy firma ma dlugi? (TAK/NIE)" -> "czy firma ma dlugi" */
function bezUwagCsv(tekst) {
  return normalizujCsv(String(tekst || "").replace(/\([^)]*\)/g, " ").replace(/[?:]/g, " "));
}

/* Rozbija tekst na wiersze i komorki z obsluga cudzyslowow ("" to cudzyslow w tekscie) */
function rozbijCsv(tekst, separator) {
  var wiersze = [], wiersz = [], komorka = "", wCudzyslowie = false;
  var zakoncz = function () { wiersz.push(komorka); komorka = ""; };
  for (var i = 0; i < tekst.length; i++) {
    var z = tekst.charAt(i);
    if (wCudzyslowie) {
      if (z === '"' && tekst.charAt(i + 1) === '"') { komorka += '"'; i++; }
      else if (z === '"') wCudzyslowie = false;
      else komorka += z;
    } else if (z === '"') wCudzyslowie = true;
    else if (z === separator) zakoncz();
    else if (z === "\n" || z === "\r") {
      if (z === "\r" && tekst.charAt(i + 1) === "\n") i++;
      zakoncz(); wiersze.push(wiersz); wiersz = [];
    } else komorka += z;
  }
  if (komorka !== "" || wiersz.length) { zakoncz(); wiersze.push(wiersz); }
  return wiersze.filter(function (w) { return w.some(function (c) { return c.trim() !== ""; }); });
}

function rodzajZatrudnieniaCsv(tekst) {
  var n = normalizujCsv(tekst);
  if (!n) return null;
  for (var i = 0; i < KODY_ZATRUDNIENIA_CSV.length; i++) {
    if (n.indexOf(KODY_ZATRUDNIENIA_CSV[i][0]) >= 0) return KODY_ZATRUDNIENIA_CSV[i][1];
  }
  return "inna";
}

/* ------------------------------ wartosci pol formularza klienta ------------------------------ */

/* TAK/NIE na 1/0, inna wartosc to null */
function takNieCsv(tekst) {
  var n = normalizujCsv(tekst);
  if (["tak", "t", "yes", "y", "1", "prawda"].indexOf(n) >= 0) return 1;
  if (["nie", "n", "no", "0", "falsz"].indexOf(n) >= 0) return 0;
  return null;
}

/* Liczba z przecinkiem dziesietnym i znakiem % ("19 %", "6,5"), inaczej null */
function liczbaCsv(tekst) {
  var czysty = String(tekst || "").replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(czysty)) return null;
  return parseFloat(czysty);
}

/* Rodzaj nieuregulowanych zobowiazan: ZUS, US, oba albo inne */
function rodzajZadluzeniaCsv(tekst) {
  var n = normalizujCsv(tekst);
  var maZus = /zus/.test(n);
  var maUs = /(^|[^a-z])us($|[^a-z])|urzad skarbowy/.test(n.replace(/zus/g, " "));
  return maZus && maUs ? "zus_us" : maZus ? "zus" : maUs ? "us" : "inne";
}

/* "mBank PL10 1020 3000 0000 0000 0000 0000": numer rachunku to najdluzszy ciag cyfr, reszta to nazwa banku */
function rozbijBankCsv(tekst) {
  var m = String(tekst).match(/(?:[A-Za-z]{2}\s*)?\d[\d\s-]{18,}\d/);
  if (!m) return { nazwa_banku: String(tekst).trim() };
  var bank = String(tekst).replace(m[0], " ").replace(/[,;:\-]+/g, " ").replace(/\s+/g, " ").trim();
  var wynik = { numer_konta: m[0].trim() };
  if (bank) wynik.nazwa_banku = bank;
  return wynik;
}

/* "podatek liniowy 19%": forma bez procentu, stawka jako liczba */
function rozbijOpodatkowanieCsv(tekst) {
  var m = String(tekst).match(/(\d+(?:[.,]\d+)?)\s*%/);
  var forma = String(tekst).replace(/(\d+(?:[.,]\d+)?)\s*%/, " ").replace(/\s+/g, " ").replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, "");
  var wynik = {};
  if (forma) wynik.forma_opodatkowania = forma;
  if (m) wynik.stawka_podatku = liczbaCsv(m[1]);
  return wynik;
}

var KOLUMNY_CALKOWITE_CSV = ["liczba_zatrudnionych", "liczba_innych_umow"];
var KOLUMNY_DZIESIETNE_CSV = ["etaty", "stawka_podatku"];
var KOLUMNY_TAK_NIE_CSV = ["zadluzenie_ugoda", "konto_praca_gov"];
var GORNA_STAWKA_PODATKU_CSV = 100;

/* Komorka firmy po konwersji: obiekt {kolumna: wartosc} albo { ostrzezenie } gdy wartosci nie da sie odczytac */
function wartoscFirmyCsv(kolumna, tekst) {
  if (kolumna === "bank_i_konto") return { pola: rozbijBankCsv(tekst) };
  if (kolumna === "forma_i_stawka") return { pola: rozbijOpodatkowanieCsv(tekst) };
  var pola = {};
  if (KOLUMNY_TAK_NIE_CSV.indexOf(kolumna) >= 0) pola[kolumna] = takNieCsv(tekst);
  else if (KOLUMNY_DZIESIETNE_CSV.indexOf(kolumna) >= 0) pola[kolumna] = liczbaCsv(tekst);
  else if (KOLUMNY_CALKOWITE_CSV.indexOf(kolumna) >= 0) pola[kolumna] = /^\d+$/.test(tekst.trim()) ? parseInt(tekst, 10) : null;
  else if (kolumna === "zadluzenie") pola.zadluzenie = takNieCsv(tekst) === 0 || normalizujCsv(tekst) === "brak" ? "brak" :
    takNieCsv(tekst) === 1 ? "tak" : rodzajZadluzeniaCsv(tekst);
  else if (kolumna === "zadluzenie_rodzaj") pola.zadluzenie_rodzaj = rodzajZadluzeniaCsv(tekst);
  else pola[kolumna] = tekst.trim();
  var kluczowa = Object.keys(pola)[0];
  if (pola[kluczowa] === null || (kluczowa === "stawka_podatku" && pola[kluczowa] > GORNA_STAWKA_PODATKU_CSV)) {
    return { ostrzezenie: "Nie odczytano wartości \"" + tekst.trim() + "\" (" + kolumna + ")." };
  }
  return { pola: pola };
}

/* TAK bez rodzaju to "inne"; przy NIE pytanie o ugode nie ma sensu (D-256) */
function domknijZadluzenieCsv(firma) {
  if (firma.zadluzenie === "tak") firma.zadluzenie = firma.zadluzenie_rodzaj || "inne";
  else if (!firma.zadluzenie && firma.zadluzenie_rodzaj) firma.zadluzenie = firma.zadluzenie_rodzaj;
  delete firma.zadluzenie_rodzaj;
  if (firma.zadluzenie === "brak") delete firma.zadluzenie_ugoda;
}

function kolumnaNaglowkaCsv(naglowek) {
  var pelny = normalizujCsv(naglowek), skrocony = bezUwagCsv(naglowek);
  var firmy = KOLUMNY_FIRMY_CSV[pelny] || KOLUMNY_FIRMY_CSV[skrocony];
  if (firmy) return ["firma", firmy];
  var uczestnika = KOLUMNY_UCZESTNIKA_CSV[pelny] || KOLUMNY_UCZESTNIKA_CSV[skrocony];
  return uczestnika ? ["uczestnik", uczestnika] : null;
}

function dodajKomorkeFirmyCsv(wynik, kolumna, tekst) {
  var odczyt = wartoscFirmyCsv(kolumna, tekst);
  if (odczyt.ostrzezenie) { wynik.ostrzezenia.push(odczyt.ostrzezenie); return; }
  Object.keys(odczyt.pola).forEach(function (k) { if (wynik.firma[k] == null) wynik.firma[k] = odczyt.pola[k]; });
}

/* Zwraca { firma: {...}, uczestnicy: [...], ostrzezenia: [...] } albo { blad: "komunikat" } */
function parsujFormularzCsv(tekst) {
  var czysty = String(tekst || "").replace(/^﻿/, "");
  var pierwsza = czysty.split(/\r\n|\n|\r/)[0] || "";
  var separator = pierwsza.split(";").length >= pierwsza.split(",").length ? ";" : ",";
  var wiersze = rozbijCsv(czysty, separator);
  if (wiersze.length < 2) return { blad: "Plik CSV jest pusty albo ma tylko nagłówek." };
  var kolumny = wiersze[0].map(kolumnaNaglowkaCsv);
  if (!kolumny.some(Boolean)) return { blad: "Nie rozpoznano żadnej kolumny. Pobierz szablon CSV i wpisz dane pod jego nagłówkami." };
  var wynik = { firma: {}, uczestnicy: [], ostrzezenia: [] };
  wiersze.slice(1).forEach(function (w) {
    var uczestnik = {};
    kolumny.forEach(function (k, i) {
      var v = (w[i] || "").trim();
      if (!k || !v) return;
      if (k[0] === "firma") dodajKomorkeFirmyCsv(wynik, k[1], v);
      else uczestnik[k[1]] = k[1] === "rodzaj_zatrudnienia" ? rodzajZatrudnieniaCsv(v) : v;
    });
    if (uczestnik.imie_nazwisko) wynik.uczestnicy.push(uczestnik);
  });
  domknijZadluzenieCsv(wynik.firma);
  return wynik;
}

function komorkaSzablonuCsv(tekst) {
  return /[;"\r\n]/.test(tekst) ? '"' + tekst.replace(/"/g, '""') + '"' : tekst;
}

/* Tresc pliku szablonu: BOM UTF-8 (Excel czyta polskie znaki), separator ; (polski Excel) */
function szablonCsv() {
  return "﻿" + NAGLOWKI_SZABLONU_CSV.map(komorkaSzablonuCsv).join(";") + "\r\n";
}
