/* ============================================================================
   Zakladki roczne Dofinansowan (D-129, D-159).

   Kazdy rok to osobna zakladka, jak arkusz w Excelu. Kolejny rok dodaje
   administrator sam, bez wykonawcy. Uprawnienie sprawdzane jest tutaj, na
   warstwie danych, a nie tylko przez ukrycie przycisku (D-148).

   API:  Lata.lista()          lata z tabeli lata_zestawien, rosnaco
         Lata.domyslny()       rok otwierany domyslnie (biezacy albo ostatni)
         Lata.zLiczbami(db)    lata z liczba wnioskow w zakresie konta, do menu
         Lata.nastepny()       propozycja kolejnego roku (ostatni + 1)
         Lata.dodaj(rok, kto)  nowa, pusta zakladka; rzuca LataError
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;
  if (!S) throw new Error("Brak window.Store. Dolacz assets/store.js przed lata.js");

  var ROK_MIN = 2020;
  var ROK_MAX = 2100;
  var UPRAWNIENIE = "zestawienia.dodawanie_lat";
  /* Wnioski bez roku (D-165) maja w menu i w adresie osobna pozycje */
  var NIEPRZYPISANE = "nieprzypisane";

  function LataError(kod, komunikat) {
    this.name = "LataError";
    this.kod = kod;
    this.message = komunikat;
  }
  LataError.prototype = Object.create(Error.prototype);
  LataError.prototype.constructor = LataError;

  function dzis() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, "0"); }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function lista() {
    return S.query("SELECT rok, opis, utworzono, utworzyl FROM lata_zestawien ORDER BY rok");
  }

  /* Zakladka otwierana domyslnie w Zestawieniach: rok biezacy, jesli ma zakladke,
     inaczej ostatni rok z listy. Z niej licza sie liczniki "Wnioski (n)" na innych ekranach. */
  function domyslny() {
    var biezacy = String(new Date().getFullYear());
    var lata = lista().map(function (l) { return l.rok; });
    if (lata.indexOf(biezacy) >= 0) return biezacy;
    return lata.length ? lata[lata.length - 1] : biezacy;
  }

  /* Lata z liczba wnioskow w zakresie konta, do menu Dofinansowan (D-129, D-159).
     db to adapter DB po separacji danych, wiec liczby nie zdradzaja cudzych wnioskow.
     Wnioski bez roku (D-165) pojawiaja sie jako osobna pozycja tylko, gdy sa. */
  function zLiczbami(db) {
    var wynik = lista().map(function (l) {
      return { rok: l.rok, n: db.WNIOSKI_WSZYSTKIE.filter(function (w) { return String(w.rok) === l.rok; }).length };
    });
    if (db.WNIOSKI_BEZ_ROKU.length) wynik.push({ rok: NIEPRZYPISANE, n: db.WNIOSKI_BEZ_ROKU.length });
    return wynik;
  }

  function nastepny() {
    var r = S.one("SELECT MAX(CAST(rok AS INTEGER)) AS m FROM lata_zestawien");
    return String(r && r.m ? r.m + 1 : new Date().getFullYear());
  }

  function dodaj(rok, kto) {
    var tekst = String(rok == null ? "" : rok).trim();
    if (!global.Auth || !global.Auth.moze(UPRAWNIENIE)) {
      throw new LataError("brak_uprawnien", "Nowy rok może dodać administrator albo pracownik LDIT.");
    }
    if (!/^\d{4}$/.test(tekst)) {
      throw new LataError("zly_format", "Rok musi mieć cztery cyfry, np. 2028.");
    }
    var liczba = parseInt(tekst, 10);
    if (liczba < ROK_MIN || liczba > ROK_MAX) {
      throw new LataError("poza_zakresem", "Rok musi mieścić się w przedziale " + ROK_MIN + "-" + ROK_MAX + ".");
    }
    if (S.one("SELECT 1 AS x FROM lata_zestawien WHERE rok = ?", [tekst])) {
      throw new LataError("istnieje", "Zakładka " + tekst + " już istnieje.");
    }
    return S.insert("lata_zestawien", {
      rok: tekst, opis: "Nowa zakładka, bez wniosków.", utworzono: dzis(), utworzyl: kto || null
    });
  }

  global.Lata = { NIEPRZYPISANE: NIEPRZYPISANE, lista: lista, domyslny: domyslny, zLiczbami: zLiczbami, nastepny: nastepny, dodaj: dodaj, LataError: LataError };
})(window);
