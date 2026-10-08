/* ============================================================================
   Adapter widoku, czesc instytucji: instytucje z aktualnymi warunkami
   prowizyjnymi i opiekunami. Wydzielone z db.js, ktory sklada z tego window.DB.

   Opiekunowie instytucji to konta pracownikow, wybor wielokrotny (D-274,
   tabela instytucja_opiekunowie zamiast pola opiekun_ldit).
   ============================================================================ */

(function (global) {
  "use strict";

  /* {instytucja_id: {ids: [...], lista: ["Imie Nazwisko"], nazwy: "Imie Nazwisko, ..."}} */
  function opiekunowie(S) {
    var m = {};
    S.query("SELECT o.instytucja_id, u.id, u.imie_nazwisko FROM instytucja_opiekunowie o " +
            "JOIN uzytkownicy u ON u.id = o.uzytkownik_id ORDER BY u.imie_nazwisko").forEach(function (r) {
      var o = m[r.instytucja_id] = m[r.instytucja_id] || { ids: [], lista: [] };
      o.ids.push(r.id);
      o.lista.push(r.imie_nazwisko);
    });
    Object.keys(m).forEach(function (k) { m[k].nazwy = m[k].lista.join(", "); });
    return m;
  }

  /* ---------- Kolor instytucji (kalendarz i kafelki, D-267) ----------
     Kazda instytucja ma kolor i kazda inny. Zapisany kolor zostaje, chyba ze jest zbyt
     podobny do koloru instytucji wczesniejszej w kolejnosci identyfikatorow; wtedy, jak
     i przy braku koloru, instytucja dostaje kolor wygenerowany. Liczone na calej tabeli,
     zanim zakres konta ja zawezi, wiec kazde konto widzi ten sam kolor instytucji. */
  var WZOR_KOLORU = /^#[0-9A-Fa-f]{6}$/;
  var MIN_ROZNICA = 60;          /* odleglosc w przestrzeni RGB (0 - 441), ponizej kolory sa myliste */
  var ZLOTY_KAT = 137.508;       /* kolejne odcienie rozkladaja sie rownomiernie po kole barw */
  /* Warianty nasycenia i jasnosci: przy wielu instytucjach same odcienie przestaja wystarczac.
     Jasnosc do 0.46, zeby kolor dalo sie odroznic na jasnym tle kafelka i kalendarza. */
  var WARIANTY = [[0.62, 0.38], [0.55, 0.28], [0.70, 0.46], [0.40, 0.33], [0.80, 0.33], [0.48, 0.44], [0.65, 0.22],
                  [0.85, 0.42], [0.35, 0.25], [0.75, 0.50], [0.50, 0.36], [0.90, 0.28]];
  var ODCIENI = 120;

  function naRgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }); }
  function roznica(a, b) {
    var x = naRgb(a), y = naRgb(b);
    return Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2));
  }
  function zHsl(h, s, l) {
    var a = s * Math.min(l, 1 - l);
    function kanal(n) {
      var k = (n + h / 30) % 12;
      var v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return ("0" + Math.round(v * 255).toString(16)).slice(-2);
    }
    return ("#" + kanal(0) + kanal(8) + kanal(4)).toUpperCase();
  }
  function wolny(kolor, zajete) {
    return zajete.every(function (z) { return roznica(kolor, z) >= MIN_ROZNICA; });
  }

  function kandydaci() {
    var lista = [];
    WARIANTY.forEach(function (w) {
      for (var k = 0; k < ODCIENI; k++) lista.push(zHsl((k * ZLOTY_KAT) % 360, w[0], w[1]));
    });
    return lista;
  }

  /* Pierwszy kandydat wyraznie rozny od zajetych; gdy takiego nie ma, najdalszy od nich */
  function kolorDlaNowej(zajete) {
    var lista = kandydaci(), najlepszy = lista[0], odleglosc = -1;
    for (var i = 0; i < lista.length; i++) {
      if (wolny(lista[i], zajete)) return lista[i];
      var min = Math.min.apply(null, zajete.map(function (z) { return roznica(lista[i], z); }));
      if (min > odleglosc) { odleglosc = min; najlepszy = lista[i]; }
    }
    return najlepszy;
  }

  /* wiersze: [{id, kolor_kalendarza}] -> {id: kolor}, kazda instytucja inny kolor */
  function koloryInstytucji(wiersze) {
    var wynik = {}, zajete = [], doUzupelnienia = [];
    wiersze.slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }).forEach(function (w) {
      var k = WZOR_KOLORU.test(w.kolor_kalendarza || "") ? w.kolor_kalendarza.toUpperCase() : null;
      if (k && wolny(k, zajete)) { wynik[w.id] = k; zajete.push(k); } else doUzupelnienia.push(w.id);
    });
    doUzupelnienia.forEach(function (id) { wynik[id] = kolorDlaNowej(zajete); zajete.push(wynik[id]); });
    return wynik;
  }

  /* Instytucje z aktualnymi warunkami prowizyjnymi (D-22) */
  function instytucjeView(S, indexBy) {
    var warunki = S.query(
      "SELECT w.*, i.id AS inst FROM v_warunki_aktywne w JOIN instytucje i ON i.id = w.instytucja_id");
    /* Progi leza przy warunkach jako lista JSON (D-168) */
    var warunkiPoInst = indexBy(warunki, "instytucja_id");
    var opiek = opiekunowie(S);
    var wszystkie = S.get("instytucje");
    var kolory = koloryInstytucji(wszystkie);

    return wszystkie.map(function (i) {
      var w = warunkiPoInst[i.id];
      var o = opiek[i.id] || { ids: [], lista: [], nazwy: "" };
      /* Instytucja bez warunkow nie dostaje po cichu stawki domyslnej: brak = null */
      var prowizja = w
        ? { model: w.model, kumulacja: w.rodzaj_kumulacji, sposob: w.sposob_liczenia,
            stala: w.stawka_stala, progi: JSON.parse(w.progi || "[]"), od: w.obowiazuje_od }
        : null;
      return {
        id: i.id, nazwa: i.nazwa, skrot: i.skrot, miasto: i.siedziba_miejscowosc, nip: i.nip,
        kontakt: i.osoba_kontaktowa, mail: i.email, tel: i.telefon, opis: i.opis_dzialalnosci,
        www: i.strona_www,
        kontakty: [1, 2, 3].map(function (n) {
          var sfx = n === 1 ? "" : "_" + n;
          return { osoba: i["osoba_kontaktowa" + sfx], tel: i["telefon" + sfx], mail: i["email" + sfx] };
        }).filter(function (k) { return k.osoba || k.tel || k.mail; }),
        standard: i.standard_godzinowy,
        opiekun: o.nazwy || "-", opiekunowie: o.lista, opiekunowieIds: o.ids,
        modelTerminow: i.model_terminow, mailProsbaOTermin: i.mail_prosba_o_termin !== 0, prowizja: prowizja,
        kolor: kolory[i.id],                    /* kalendarz terminow i kafelek instytucji (D-267) */
        kolorZapisany: i.kolor_kalendarza || null
      };
    });
  }

  global.DBInstytucje = {
    instytucjeView: instytucjeView, opiekunowie: opiekunowie,
    koloryInstytucji: koloryInstytucji, kolorDlaNowej: kolorDlaNowej, roznicaKolorow: roznica, MIN_ROZNICA: MIN_ROZNICA
  };
})(window);
