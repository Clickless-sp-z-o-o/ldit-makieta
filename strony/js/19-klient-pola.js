/* Pelny formularz klienta jako dane: sekcje, pola i lista brakow (D-256, D-257).
   Z tej deklaracji korzystaja karta klienta (widok i edycja) oraz formularz nowego klienta w Bazie danych,
   wiec pola sa w obu miejscach identyczne. Klucz pola "kol" to nazwa kolumny w tabeli klienci.
   Typy: tekst, email, tel, liczba (calkowita), dziesietna, wybor, tn (tak/nie), kolejny, pup.
   Sekcja Zobowiazania ma wlasny sposob zapisu (zob), bo trzy pytania skladaja sie na kolumny zadluzenie i zadluzenie_ugoda. */
(function (global) {
  "use strict";

  var WIELKOSCI = [["", "nie podano"], ["mikro", "mikro"], ["mały", "mały"], ["średni", "średni"], ["duży", "duży"], ["inny", "inny"]];
  var RODZAJE_ZOBOWIAZAN = [["", "wybierz rodzaj"], ["zus", "ZUS"], ["us", "US"], ["zus_us", "ZUS i US"], ["inne", "inne"]];

  var SEKCJE = [
    { id: "firma", tytul: "Firma", tip: "Dane firmy z formularza (D-256). Wielkość decyduje o progu dofinansowania: mikro to do 9 osób na umowie o pracę.", pola: [
      { kol: "nazwa", etyk: "Nazwa firmy", wym: true },
      { kol: "nip", etyk: "NIP", wym: true },
      { kol: "miasto", etyk: "Miasto" },
      { kol: "adres_siedziby", etyk: "Adres siedziby", wym: true },
      { kol: "telefon_biura", etyk: "Telefon do biura", typ: "tel", wym: true },
      { kol: "email_firmy", etyk: "E-mail firmy", typ: "email", wym: true },
      { kol: "wielkosc_przedsiebiorstwa", etyk: "Wielkość", typ: "wybor", opcje: WIELKOSCI, wym: true },
      { kol: "pup_id", etyk: "Główny urząd pracy", typ: "pup" },
      { kol: "zainteresowany_naborem", etyk: "Kolejny nabór", typ: "kolejny",
        tip: "Czy klient chce kolejnego naboru. Zmieniasz tylko tutaj, w edycji klienta, nie z listy (D-265)." }
    ] },
    { id: "kontakt", tytul: "Osoba do kontaktu", tip: "Osoba główna i do dwóch dodatkowych osób kontaktowych (D-169, D-256).", pola: [
      { kol: "osoba_kontaktowa", etyk: "Imię i nazwisko", wym: true },
      { kol: "stanowisko_kontaktowej", etyk: "Stanowisko", wym: true },
      { kol: "telefon", etyk: "Telefon", typ: "tel", wym: true },
      { kol: "email", etyk: "E-mail", typ: "email", wym: true },
      { kol: "osoba_kontaktowa_2", etyk: "Osoba kontaktowa 2" },
      { kol: "telefon_2", etyk: "Telefon 2", typ: "tel" },
      { kol: "email_2", etyk: "E-mail 2", typ: "email" },
      { kol: "osoba_kontaktowa_3", etyk: "Osoba kontaktowa 3" },
      { kol: "telefon_3", etyk: "Telefon 3", typ: "tel" },
      { kol: "email_3", etyk: "E-mail 3", typ: "email" }
    ] },
    { id: "rachunek", tytul: "Rachunek", tip: "Rachunek bankowy firmy (D-256).", pola: [
      { kol: "nazwa_banku", etyk: "Nazwa banku", wym: true },
      { kol: "numer_konta", etyk: "Numer rachunku", wym: true }
    ] },
    { id: "zatrudnienie", tytul: "Zatrudnienie", tip: "Liczba zatrudnionych na umowę o pracę, w przeliczeniu na pełne etaty i na innych umowach (D-256). Projekt kopiuje liczbę na dzień wniosku (D-169).", pola: [
      { kol: "liczba_zatrudnionych", etyk: "Zatrudnieni na umowę o pracę (osoby)", typ: "liczba", wym: true },
      { kol: "etaty", etyk: "Umowy o pracę w przeliczeniu na etaty", typ: "dziesietna", wym: true },
      { kol: "liczba_innych_umow", etyk: "Zatrudnieni na innych umowach", typ: "liczba", wym: true }
    ] },
    { id: "podatki", tytul: "Podatki", tip: "Forma opodatkowania firmy i stawka w procentach (D-256).", pola: [
      { kol: "forma_opodatkowania", etyk: "Forma opodatkowania", wym: true },
      { kol: "stawka_podatku", etyk: "Stawka podatku (%)", typ: "dziesietna", wym: true }
    ] },
    { id: "reprezentacja", tytul: "Reprezentacja", tip: "Dwie osoby uprawnione do reprezentowania firmy i podpisu (D-256). Druga jest opcjonalna.", pola: [
      { kol: "reprezentant_1", etyk: "Osoba uprawniona 1, imię i nazwisko", wym: true },
      { kol: "reprezentant_1_stanowisko", etyk: "Osoba uprawniona 1, stanowisko", wym: true },
      { kol: "reprezentant_2", etyk: "Osoba uprawniona 2, imię i nazwisko" },
      { kol: "reprezentant_2_stanowisko", etyk: "Osoba uprawniona 2, stanowisko" }
    ] },
    { id: "zobowiazania", tytul: "Zobowiązania", zob: true, tip: "Czy firma ma nieuregulowane zobowiązania. Przy odpowiedzi TAK pytamy o rodzaj i o porozumienie lub ugodę (D-256). Przy NIE pytanie o ugodę jest ukryte, a w bazie zostaje pusta wartość.", pola: [
      { kol: "zadluzenie", etyk: "Nieuregulowane zobowiązania", typ: "zob" },
      { kol: "zadluzenie_ugoda", etyk: "Porozumienie lub ugoda", typ: "tn" }
    ] },
    { id: "praca-gov", tytul: "Konto na praca.gov.pl", tip: "Pytanie z formularza (D-257). Konto organizacji musi być zweryfikowane, samo założenie konta nie wystarczy.", pola: [
      { kol: "konto_praca_gov", etyk: "Zweryfikowane konto organizacji na praca.gov.pl", typ: "tn", wym: true,
        tip: "Konto organizacji musi być zweryfikowane. Bez weryfikacji firma nie złoży wniosku (D-257)." }
    ] }
  ];

  function pusty(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function tak(zadluzenie) { return !pusty(zadluzenie) && zadluzenie !== "brak"; }

  /* Lista nazw pol, ktore trzeba jeszcze uzupelnic (wiersz = rekord z tabeli klienci) */
  function braki(wiersz) {
    var lista = [];
    SEKCJE.forEach(function (s) {
      s.pola.forEach(function (p) { if (p.wym && pusty(wiersz[p.kol])) lista.push(p.etyk); });
    });
    if (pusty(wiersz.zadluzenie)) lista.push("Nieuregulowane zobowiązania");
    else if (tak(wiersz.zadluzenie) && pusty(wiersz.zadluzenie_ugoda)) lista.push("Porozumienie lub ugoda");
    return lista;
  }

  global.KlientPola = { SEKCJE: SEKCJE, WIELKOSCI: WIELKOSCI, RODZAJE_ZOBOWIAZAN: RODZAJE_ZOBOWIAZAN, braki: braki, pusty: pusty, tak: tak };
})(window);
