/* ============================================================================
   Separacja danych. Jedno miejsce, w ktorym z kompletu danych zostaje to,
   co wolno zobaczyc zalogowanemu kontu.

   Dlaczego tutaj, a nie na stronach: instytucje szkoleniowe sa wobec siebie
   konkurencyjne, a wyciek do niewlasciwego katalogu to scenariusz krytyczny.
   Ukrycie kolumny w HTML nie jest zabezpieczeniem, bo dane i tak sa w pamieci
   strony. Dlatego filtr zaklada sie na wynik adaptera, zanim jakakolwiek
   strona go zobaczy (D-35, D-76, D-114, D-144).

   Filtr dziala na dwoch poziomach:
     wiersze  ktore instytucje, ktorzy klienci, ktore wnioski
     pola     prowizja, zysk firmy, PESEL uczestnika

   Zastosowanie:  Zakres.zastosuj(DB)  na koncu przebudowy DB.
   ============================================================================ */

(function (global) {
  "use strict";

  function nalezy(lista, wartosc) {
    return lista === null || lista.indexOf(wartosc) >= 0;
  }

  function filtruj(tablica, lista, pole) {
    if (lista === null) return tablica;
    return tablica.filter(function (r) { return lista.indexOf(r[pole]) >= 0; });
  }

  var Zakres = {

    zastosuj: function (DB) {
      var Auth = global.Auth;
      if (!Auth || !Auth.zalogowany()) {
        this.wyczysc(DB);
        return DB;
      }

      var instytucje = Auth.instytucje();          /* null = brak ograniczenia */
      var klienci = Auth.klienciWZakresie();

      DB.INSTYTUCJE = filtruj(DB.INSTYTUCJE, instytucje, "id");

      /* Klient nalezy do jednej instytucji (D-282), wiec jego pole "is" nie zdradza innych instytucji */
      DB.KLIENCI = filtruj(DB.KLIENCI, klienci, "id");
      DB.SZKOLENIA = filtruj(DB.SZKOLENIA, instytucje, "is");
      DB.TERMINY = filtruj(DB.TERMINY, instytucje, "is");
      DB.FAKTURY = filtruj(DB.FAKTURY, instytucje, "isId");
      DB.WNIOSKI_WSZYSTKIE = filtruj(DB.WNIOSKI_WSZYSTKIE, instytucje, "is");
      DB.WNIOSKI_2026 = filtruj(DB.WNIOSKI_2026, instytucje, "is");
      DB.WNIOSKI_2025 = filtruj(DB.WNIOSKI_2025, instytucje, "is");
      DB.WNIOSKI_BEZ_ROKU = filtruj(DB.WNIOSKI_BEZ_ROKU, instytucje, "is");
      DB.WNIOSKI = DB.WNIOSKI_2026;
      DB.KOLEJKA = filtruj(DB.KOLEJKA, instytucje, "isId");
      DB.PROPOZYCJE = filtruj(DB.PROPOZYCJE, instytucje, "isId");
      /* Korespondencja bez przypisanej instytucji nie trafia do konta z ograniczonym
         zakresem: brak przypisania oznacza brak dostepu, nie dostep dla wszystkich */
      DB.MAILE = filtruj(DB.MAILE, instytucje, "isId");
      DB.ZADANIA = this.zadaniaWZakresie(DB.ZADANIA, DB.WNIOSKI_WSZYSTKIE, instytucje);
      DB.PODSUMOWANIA = filtruj(DB.PODSUMOWANIA, instytucje, "isId");
      this.zakresHandlowca(DB, Auth.handlowiec());
      DB.UCZESTNICY_KLIENTA = this.uczestnicyWidocznychKlientow(DB.UCZESTNICY_KLIENTA, DB.KLIENCI);
      var sesja = Auth.sesja();
      /* Korespondencja administratora z instytucjami jest tylko dla niego (D-248) */
      DB.MAILE = DB.MAILE.filter(function (m) { return !m.skrzynkaAdmina || m.skrz === sesja.login; });
      /* Skutecznosc: kazdy widzi wlasna, calosc tylko statystyka zbiorcza (D-242) */
      if (!Auth.moze("statystyki.zbiorcze")) {
        DB.SKUTECZNOSC = DB.SKUTECZNOSC.filter(function (r) { return r.uzytkownik === sesja.uzytkownik_id; });
      }
      /* Czarna lista to wiedza z wewnetrznej bazy zgloszen, instytucja jej nie widzi (D-249) */
      if (!Auth.moze("zgloszenia.dostep")) DB.KLIENCI = this.bezCzarnejListy(DB.KLIENCI);
      /* Podsumowanie calej firmy (bez instytucji) to statystyka zbiorcza LDIT */
      if (!Auth.moze("statystyki.zbiorcze")) {
        DB.PODSUMOWANIA = DB.PODSUMOWANIA.filter(function (p) { return p.isId != null; });
      }

      /* Stawki prowizji widzi wylacznie administrator (D-07). Instytucja nie widzi
         nawet wlasnej (D-76), pracownik LDIT nie widzi zadnej (D-34, D-114). */
      if (!Auth.moze("finanse.prowizja")) {
        DB.INSTYTUCJE = DB.INSTYTUCJE.map(function (i) {
          var kopia = {};
          for (var k in i) if (k !== "prowizja") kopia[k] = i[k];
          kopia.prowizja = null;
          return kopia;
        });
        [DB.WNIOSKI_WSZYSTKIE, DB.WNIOSKI_2026, DB.WNIOSKI_2025].forEach(function (lista) {
          lista.forEach(function (w) {
            w.prowizjaProcent = null;
            w.prowizjaKwota = null;
            w.prowizjaTyp = null;
            w.podstawaProwizji = null;
          });
        });
      }

      /* PESEL uczestnika to dane wrazliwe. Handlowiec instytucji ich nie widzi,
         bo jego rola konczy sie na wypelnieniu formularza (D-75). */
      if (!Auth.moze("klient.pesel")) {
        DB.WNIOSKI_WSZYSTKIE.forEach(function (w) {
          w.uczestnicy.forEach(function (u) { u.pesel = null; });
        });
        DB.UCZESTNICY_KLIENTA.forEach(function (u) { u.pesel = null; });
      }

      /* Kwoty wniosku: role bez tego uprawnienia dostaja wnioski bez finansow. */
      if (!Auth.moze("finanse.kwoty_wniosku")) {
        DB.WNIOSKI_WSZYSTKIE.forEach(function (w) {
          w.kosztCalkowity = null; w.przyznano = null; w.kosztZDoplata = null;
          w.calkowita = null; w.wartosc = null; w.doplata = null; w.wartoscWszystkich = null;
          w.przyznanoZReguly = null; w.wklad = null; w.wkladZReguly = null; w.podstawaProwizji = null;
          w.kosztZDoplataZapisany = null;
        });
      }

      if (!Auth.moze("finanse.faktury")) DB.FAKTURY = [];
      if (!Auth.moze("zgloszenia.dostep")) DB.ZGLOSZENIA = [];
      if (!Auth.moze("admin.rejestr")) { DB.AKTYWNOSC = []; DB.LOGOWANIA = []; }
      /* Stawki prowizji pracownikow to dane prowizyjne: potrzebne obie funkcje */
      if (!Auth.moze("statystyki.zbiorcze") || !Auth.moze("finanse.prowizja")) DB.WARUNKI_PRACOWNIKOW = [];

      /* Liste kont widzi administrator LDIT. Administrator instytucji widzi
         wylacznie wlasnych pracownikow (D-126). */
      if (!Auth.moze("admin.konta")) {
        var s = Auth.sesja();
        var mojeInst = s.instytucja_nazwa;
        DB.UZYTKOWNICY = mojeInst
          ? DB.UZYTKOWNICY.filter(function (u) { return u.inst === mojeInst; })
          : [];
        /* Handlowiec nie wie, ze istnieja inni handlowcy (D-251) */
        if (Auth.handlowiec()) {
          DB.UZYTKOWNICY = DB.UZYTKOWNICY.filter(function (u) { return u.login === s.login; });
        }
      }

      return DB;
    },

    /* Handlowiec instytucji widzi wylacznie swoje wnioski, formularze i korespondencje
       swoich klientow; klientow zaweza juz Auth.klienciWZakresie (D-210).
       Statystyk instytucji nie dostaje (D-209). */
    zakresHandlowca: function (DB, handlowiec) {
      if (!handlowiec) return;
      var moje = function (w) { return w.handlowiec === handlowiec; };
      ["WNIOSKI_WSZYSTKIE", "WNIOSKI_2026", "WNIOSKI_2025", "WNIOSKI_BEZ_ROKU"].forEach(function (k) { DB[k] = DB[k].filter(moje); });
      DB.WNIOSKI = DB.WNIOSKI_2026;
      DB.KOLEJKA = DB.KOLEJKA.filter(function (k) { return k.handlowiec === handlowiec; });
      DB.PROPOZYCJE = DB.PROPOZYCJE.filter(function (p) { return p.zglosil === handlowiec; });
      var klienci = {};
      DB.KLIENCI.forEach(function (k) { klienci[k.id] = true; });
      DB.MAILE = DB.MAILE.filter(function (m) { return m.klient && klienci[m.klient]; });
      var wnioski = {};
      DB.WNIOSKI_WSZYSTKIE.forEach(function (w) { wnioski[w.id] = true; });
      DB.ZADANIA = DB.ZADANIA.filter(function (z) { return z.wniosek_id && wnioski[z.wniosek_id]; });
      DB.PODSUMOWANIA = [];
    },

    /* Uczestnicy klienta trafiaja do konta tylko razem z widocznym klientem (D-236) */
    uczestnicyWidocznychKlientow: function (uczestnicy, klienci) {
      var widoczni = {};
      klienci.forEach(function (k) { widoczni[k.id] = true; });
      return uczestnicy.filter(function (u) { return widoczni[u.klient]; });
    },

    bezCzarnejListy: function (klienci) {
      return klienci.map(function (k) {
        var kopia = {};
        for (var p in k) if (Object.prototype.hasOwnProperty.call(k, p)) kopia[p] = k[p];
        kopia.czarnaLista = false; kopia.czarnaListaZReguly = false; kopia.niezlozonych = 0;
        return kopia;
      });
    },

    /* Zadanie jest widoczne, gdy dotyczy wniosku w zakresie konta. Zadanie bez
       wniosku (ogolne) widza tylko konta LDIT bez ograniczen. */
    zadaniaWZakresie: function (zadania, wnioski, instytucje) {
      if (instytucje === null) return zadania;
      var widoczne = {};
      wnioski.forEach(function (w) { widoczne[w.id] = true; });
      return zadania.filter(function (z) { return z.wniosek_id && widoczne[z.wniosek_id]; });
    },

    /* Brak sesji: zero danych. Strona i tak pokaze komunikat o wygasnieciu. */
    wyczysc: function (DB) {
      ["INSTYTUCJE", "KLIENCI", "SZKOLENIA", "TERMINY", "FAKTURY", "WNIOSKI",
       "WNIOSKI_WSZYSTKIE", "WNIOSKI_2026", "WNIOSKI_2025", "WNIOSKI_BEZ_ROKU", "KOLEJKA", "PROPOZYCJE", "MAILE",
       "PODSUMOWANIA", "UCZESTNICY_KLIENTA", "SKUTECZNOSC",
       "UZYTKOWNICY", "ZGLOSZENIA", "AKTYWNOSC", "LOGOWANIA", "WARUNKI_PRACOWNIKOW", "ZADANIA", "LATA"
      ].forEach(function (k) { DB[k] = []; });
      return DB;
    },

    nalezy: nalezy
  };

  global.Zakres = Zakres;
})(window);
