/* ============================================================================
   Walidacja danych na granicy zapisu. Odpowiednik data/validators.ts z Zod
   w Open Mercato (D-211): kazda tabela ma schemat pol, a zapis z blednymi
   danymi nie dochodzi do bazy. Wywoluje ja straznik zapisow (straznik.js).

   Puste pole przechodzi, chyba ze schemat mowi "wymagane". Przy edycji
   sprawdzane sa tylko pola, ktore sie zmieniaja, wiec stary rekord z danych
   startowych da sie edytowac, ale nowej blednej wartosci nie da sie wpisac.

   Kolejnosc dat (koniec po poczatku) sprawdzana jest na stanie po zmianie: przy edycji
   samej daty konca druga data pochodzi z zapisanego rekordu (obecny).

   API:  Walidacja.bledy(tabela, dane, obecny) -> [{ pole, komunikat }]
   ============================================================================ */

(function (global) {
  "use strict";

  var WAGI_PESEL = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  var WAGI_NIP = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  var MAX_TEKST = 300;

  function cyfry(t) { return String(t).replace(/[\s-]/g, ""); }

  var REGULY = {
    wymagane: function (v) { return String(v).trim() !== "" || "pole jest wymagane"; },
    tekst: function (v) { return String(v).length <= MAX_TEKST || "maksymalnie " + MAX_TEKST + " znaków"; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) || "niepoprawny adres e-mail"; },
    telefon: function (v) { return /^\+?[\d\s()-]{9,20}$/.test(String(v).trim()) || "niepoprawny numer telefonu"; },
    url: function (v) { return /^https?:\/\/[^\s.]+\.[^\s]{2,}$/.test(String(v).trim()) || "adres musi zaczynać się od http:// albo https://"; },
    data: function (v) { return /^\d{4}-\d{2}-\d{2}/.test(String(v)) && !isNaN(Date.parse(String(v).slice(0, 10))) || "data w formacie RRRR-MM-DD"; },
    kwota: function (v) { return (typeof v === "number" || /^-?\d+([.,]\d{1,2})?$/.test(String(v))) && Number(String(v).replace(",", ".")) >= 0 || "kwota nie może być ujemna"; },
    kwotaZnak: function (v) { return !isNaN(Number(String(v).replace(",", "."))) || "niepoprawna kwota"; },
    calkowita: function (v) { return /^\d+$/.test(String(v)) || "liczba całkowita, nie mniejsza niż 0"; },
    procent: function (v) { var n = Number(v); return (!isNaN(n) && n >= 0 && n <= 100) || "procent od 0 do 100"; },
    nip: function (v) {
      var n = cyfry(v);
      if (!/^\d{10}$/.test(n)) return "NIP ma 10 cyfr";
      var s = 0; for (var i = 0; i < 9; i++) s += WAGI_NIP[i] * +n[i];
      return s % 11 === +n[9] || "NIP ma błędną cyfrę kontrolną";
    },
    pesel: function (v) {
      var p = cyfry(v);
      if (!/^\d{11}$/.test(p)) return "PESEL ma 11 cyfr";
      var s = 0; for (var i = 0; i < 10; i++) s += WAGI_PESEL[i] * +p[i];
      return (10 - s % 10) % 10 === +p[10] || "PESEL ma błędną cyfrę kontrolną";
    }
  };

  var KONTAKTY = { osoba_kontaktowa: ["tekst"], email: ["email"], telefon: ["telefon"],
                   osoba_kontaktowa_2: ["tekst"], email_2: ["email"], telefon_2: ["telefon"],
                   osoba_kontaktowa_3: ["tekst"], email_3: ["email"], telefon_3: ["telefon"] };
  function z(baza, dodatki) { var o = {}, k; for (k in baza) o[k] = baza[k]; for (k in dodatki) o[k] = dodatki[k]; return o; }

  var SCHEMATY = {
    klienci: z(KONTAKTY, { nazwa: ["wymagane", "tekst"], nip: ["nip"], miasto: ["tekst"], adres_siedziby: ["tekst"],
               liczba_zatrudnionych: ["calkowita"], numer_konta: ["tekst"],
               /* Pelny formularz klienta (D-256) */
               telefon_biura: ["telefon"], email_firmy: ["email"], stanowisko_kontaktowej: ["tekst"],
               nazwa_banku: ["tekst"], liczba_innych_umow: ["calkowita"], forma_opodatkowania: ["tekst"],
               stawka_podatku: ["procent"], reprezentant_1: ["tekst"], reprezentant_2: ["tekst"] }),
    instytucje: z(KONTAKTY, { nazwa: ["wymagane", "tekst"], nip: ["nip"], strona_www: ["url"] }),
    wnioski: z(KONTAKTY, { liczba_zatrudnionych: ["calkowita"], koszt_calkowity_z_doplata: ["kwota"],
               kwota_doplaty_dodatkowej: ["kwota"], koszt_calkowity: ["kwota"], przyznano: ["kwota"],
               wklad_wlasny: ["kwota"], prowizja_wartosc: ["kwota"], data_wniosku: ["data"],
               data_wplyniecia_formularza: ["data"], data_wystawienia_faktury: ["data"] }),
    /* Szkolenie uczestnika i cennik (D-277, D-279) */
    uczestnik_szkolenia: { cena: ["kwota"], powod_niezakwalifikowania: ["tekst"], komentarz: ["tekst"] },
    ceny_szkolen: { cena: ["wymagane", "kwota"] },
    uczestnicy_klienta: { imie_nazwisko: ["wymagane", "tekst"], pesel: ["pesel"], zatrudnienie_do: ["data"],
                          wyksztalcenie: ["tekst"], zawod: ["tekst"] },
    terminy: { data_od: ["data"], data_do: ["data"], zapisani: ["calkowita"], limit_miejsc: ["calkowita"] },
    katalog_szkolen: { nazwa: ["wymagane", "tekst"], liczba_godzin: ["calkowita"], liczba_dni: ["calkowita"] },
    faktury: { numer: ["wymagane", "tekst"], kwota: ["kwotaZnak"], data_wystawienia: ["data"], termin_platnosci: ["data"] },
    uzytkownicy: { login: ["wymagane", "email"], imie_nazwisko: ["wymagane", "tekst"] },
    progi_dofinansowania: { procent_dofinansowania: ["procent"], obowiazuje_od: ["wymagane", "data"], obowiazuje_do: ["data"] },
    warunki_prowizyjne: { obowiazuje_od: ["wymagane", "data"], obowiazuje_do: ["data"], stawka_stala: ["procent"] },
    zadania: { tytul: ["wymagane", "tekst"], termin: ["data"] },
    notatki_klienta: { tresc: ["wymagane"] },
    notatki_wniosku: { tresc: ["wymagane"] },
    formularze_oczekujace: { firma: ["wymagane", "tekst"], nip: ["nip"], email: ["email"], telefon: ["telefon"],
                             kontakt: ["tekst"], miasto: ["tekst"], osob: ["calkowita"], uwagi: ["tekst"],
                             telefon_biura: ["telefon"], email_firmy: ["email"], liczba_zatrudnionych: ["calkowita"],
                             liczba_innych_umow: ["calkowita"], stawka_podatku: ["procent"] },
    propozycje_zmian: { uzasadnienie: ["tekst"] },
    pliki: { nazwa: ["wymagane", "tekst"], rozmiar: ["calkowita"] },
    /* Nabory i slownik urzedow (D-271, D-272) */
    nabory: { data_od: ["data"], data_do: ["data"], data_weryfikacji: ["data"], link: ["url"] },
    urzedy_pracy: { nazwa: ["wymagane", "tekst"], wojewodztwo: ["wymagane", "tekst"], powiat: ["wymagane", "tekst"] }
  };

  function pusta(v) { return v === null || v === undefined || String(v).trim() === ""; }

  function bledy(tabela, dane, obecny) {
    var schemat = SCHEMATY[tabela], out = [];
    if (!schemat || !dane) return out;
    Object.keys(schemat).forEach(function (pole) {
      if (!Object.prototype.hasOwnProperty.call(dane, pole)) return;
      var v = dane[pole], reguly = schemat[pole];
      if (pusta(v)) {
        if (reguly.indexOf("wymagane") >= 0) out.push({ pole: pole, komunikat: "pole jest wymagane" });
        return;
      }
      for (var i = 0; i < reguly.length; i++) {
        var wynik = REGULY[reguly[i]](v);
        if (wynik !== true) { out.push({ pole: pole, komunikat: wynik }); return; }
      }
    });
    var zmianaDat = Object.prototype.hasOwnProperty.call(dane, "data_od") || Object.prototype.hasOwnProperty.call(dane, "data_do");
    var od = "data_od" in dane ? dane.data_od : (obecny || {}).data_od, doD = "data_do" in dane ? dane.data_do : (obecny || {}).data_do;
    if ((tabela === "terminy" || tabela === "nabory") && zmianaDat && !pusta(od) && !pusta(doD) && doD < od) {
      out.push({ pole: "data_do", komunikat: tabela === "nabory" ? "koniec naboru przed jego początkiem" : "koniec terminu przed jego początkiem" });
    }
    return out;
  }

  global.Walidacja = { bledy: bledy, SCHEMATY: SCHEMATY };
})(window);
