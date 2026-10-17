/* ============================================================================
   Kto rozpatruje zgloszenia instytucji (ankieta klienta 09.10, D-330) i jak dlugo
   zgloszenie moze czekac na decyzje (D-332).

   D-330. Rozpatrujacy ma funkcje zmiany.zatwierdzanie, a ponadto:
     - formularz zgloszeniowy i zmiane danych klienta (wnioski, projekty) rozpatruje
       opiekun tej instytucji (instytucja_opiekunowie, D-275) albo administrator,
     - zmiane danych instytucji i katalogu szkolen rozpatruje tylko administrator.
   Administrator to konto z edycja modulu Instytucje szkoleniowe: ta sama rola
   zarzadza instytucjami i ich katalogiem, wiec nie potrzeba osobnej funkcji.
   Regule sprawdza straznik zapisow (assets/straznik.js) i Akceptacje przed zapisem.

   D-332. Zgloszenie czekajace dluzej niz PROG_PRZYPOMNIENIA_DNI jest zalegle:
   ekran Do akceptacji oznacza je napisem "czeka N dni" i pokazuje przypomnienie.

   API:  AkceptacjeUprawnienia.mozeRozpatrzyc(rodzaj, instytucjaId)  rodzaj: formularz | klienci | instytucje | katalog_szkolen
         AkceptacjeUprawnienia.powodOdmowy(rodzaj)                   komunikat dla odmowy
         AkceptacjeUprawnienia.wymagaj(tabela, id, odmowa)            straznik: decyzja o formularzu albo propozycji z bazy
         AkceptacjeUprawnienia.doRozpatrzenia(lista)                  wiersze DB.KOLEJKA albo DB.PROPOZYCJE, ktore konto rozpatruje
         AkceptacjeUprawnienia.dniOczekiwania(data, dzis)             pelne dni od zgloszenia do dzis
         AkceptacjeUprawnienia.zalegle(lista, dzis)                   oczekujace dluzej niz prog
         AkceptacjeUprawnienia.PROG_PRZYPOMNIENIA_DNI
   ============================================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var PROG_PRZYPOMNIENIA_DNI = 1;
  var MS_DNIA = 86400000;
  var TYLKO_ADMINISTRATOR = { instytucje: true, katalog_szkolen: true };

  function administrator() { return global.Auth.edytujeModul("inst"); }

  function opiekun(instytucjaId) {
    var ja = global.Auth.sesja().uzytkownik_id;
    return !!S.one("SELECT id FROM instytucja_opiekunowie WHERE instytucja_id = ? AND uzytkownik_id = ?", [instytucjaId, ja]);
  }

  function mozeRozpatrzyc(rodzaj, instytucjaId) {
    if (!global.Auth.moze("zmiany.zatwierdzanie")) return false;
    if (administrator()) return true;
    return !TYLKO_ADMINISTRATOR[rodzaj] && opiekun(instytucjaId);
  }

  function powodOdmowy(rodzaj) {
    if (TYLKO_ADMINISTRATOR[rodzaj]) return "Zmianę danych instytucji i katalogu szkoleń zatwierdza administrator.";
    return "To zgłoszenie rozpatruje opiekun instytucji albo administrator.";
  }

  /* Dla straznika zapisow: decyzja o istniejacym zgloszeniu, z wiersza w bazie; odmowa(kod, tresc) rzuca */
  function wymagaj(tabela, id, odmowa) {
    var formularz = tabela === "formularze_oczekujace";
    var r = S.one(formularz ? "SELECT instytucja_id FROM formularze_oczekujace WHERE id = ?"
      : "SELECT instytucja_id, tabela FROM propozycje_zmian WHERE id = ?", [id]);
    var rodzaj = formularz ? "formularz" : (r || {}).tabela;
    if (!r || !mozeRozpatrzyc(rodzaj, r.instytucja_id)) odmowa("brak_uprawnien", powodOdmowy(rodzaj));
  }

  /* Wiersz z DB.KOLEJKA (formularz, bez pola tabela) albo z DB.PROPOZYCJE (tabela) */
  function rodzajWiersza(r) { return r.tabela || "formularz"; }

  /* Konto bez prawa decyzji widzi liste do podgladu w calosci; rozpatrujacy tylko swoje zgloszenia */
  function doRozpatrzenia(lista) {
    if (!global.Auth.moze("zmiany.zatwierdzanie")) return lista;
    return lista.filter(function (r) { return mozeRozpatrzyc(rodzajWiersza(r), r.isId); });
  }

  /* data: "RRRR-MM-DD" albo "RRRR-MM-DD GG:MM"; dzis: obiekt Date (domyslnie teraz) */
  function dniOczekiwania(data, dzis) {
    if (!data) return 0;
    var od = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10));
    var d = dzis || new Date();
    return Math.max(0, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - od) / MS_DNIA));
  }

  function zalegle(lista, dzis) {
    return lista.filter(function (r) {
      return r.status === "oczekuje" && dniOczekiwania(r.data || r.zgloszono, dzis) > PROG_PRZYPOMNIENIA_DNI;
    });
  }

  global.AkceptacjeUprawnienia = {
    mozeRozpatrzyc: mozeRozpatrzyc, powodOdmowy: powodOdmowy, wymagaj: wymagaj, doRozpatrzenia: doRozpatrzenia,
    dniOczekiwania: dniOczekiwania, zalegle: zalegle, PROG_PRZYPOMNIENIA_DNI: PROG_PRZYPOMNIENIA_DNI
  };
})(window);
