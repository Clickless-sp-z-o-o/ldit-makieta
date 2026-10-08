/* ============================================================================
   Sesja i uprawnienia.

   Rola nie jest wybierana przelacznikiem, tylko wynika z zalogowanego konta
   (D-125). Uprawnienia czytamy z bazy jako features "modul.akcja" z tabel
   funkcje i role_funkcje (model Open Mercato, D-211, assets/funkcje.js),
   a nie z list zaszytych w kodzie stron (D-35, D-36).

   Trzy poziomy kontroli:
     1. modul   Auth.poziom("admin")  czy rola w ogole widzi zakladke
     2. pole    Auth.moze("finanse.prowizja")  czy widzi dana kolumne lub kwote
     3. wiersz  Auth.instytucje()  ktore instytucje sa w zasiegu konta

   Trzeci poziom jest najwazniejszy: separacja danych ma byc egzekwowana na
   danych, nie na interfejsie. Filtr wierszy zakladany jest w adapterze
   assets/db.js, zanim jakakolwiek strona zobaczy dane.
   ============================================================================ */

(function (global) {
  "use strict";

  var KLUCZ_SESJI = "kfs_sesja_v2";
  var S = global.Store;
  if (!S) throw new Error("Brak window.Store. Dolacz assets/store.js przed auth.js");
  if (!global.Haslo) throw new Error("Brak window.Haslo. Dolacz assets/haslo.js przed auth.js");
  var systemowo = S.odbierzTrybSystemowy();

  /* Zasady logowania wzorowane na Open Mercato (D-176): ogolny komunikat bledu,
     ktory nie zdradza, czy konto istnieje, blokada czasowa po serii prob,
     sesja wygasajaca po bezczynnosci. */
  var MAX_PROB = 5;
  var BLOKADA_MIN = 15;
  var SESJA_MIN = 8 * 60;
  /* Bezczynnosc do wylogowania zalezy od typu konta roli (D-250, D-275): pracownicy
     pracuja w systemie caly dzien, konta zewnetrzne maja krotki, bezpieczny czas. */
  var BEZCZYNNOSC_MIN = { pracownik: 120, instytucja: 30 };
  var ODSWIEZ_AKTYWNOSC_MS = 60 * 1000;
  var WAZNOSC_PAMIECI_MS = 1000;
  var BLAD_OGOLNY = "Nieprawidłowy login lub hasło.";

  var pamiec = { token: null, obiekt: null, czas: 0 };
  var ostatnieOdswiezenie = 0;

  function teraz() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
           " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function isoZa(minuty) { return new Date(Date.now() + minuty * 60000).toISOString(); }

  function czytajToken() {
    try { return global.localStorage ? global.localStorage.getItem(KLUCZ_SESJI) : null; }
    catch (e) { return null; }   /* localStorage niedostepny: brak sesji, czyli brak dostepu */
  }
  function zapiszToken(token) {
    try {
      if (token) global.localStorage.setItem(KLUCZ_SESJI, token);
      else global.localStorage.removeItem(KLUCZ_SESJI);
    } catch (e) {
      pamiec.token = token;       /* bez localStorage sesja zyje tylko w tej karcie */
    }
    pamiec = { token: token, obiekt: null, czas: 0 };
  }

  function losowyToken() {
    if (!global.crypto || !global.crypto.getRandomValues) {
      throw new Error("Brak bezpiecznego generatora liczb losowych, logowanie niemozliwe");
    }
    var b = global.crypto.getRandomValues(new Uint8Array(24));
    return Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }

  /* Zmiana sesji zmienia zakres widocznych danych, wiec adapter musi je przeliczyc */
  function przebudujDane() {
    if (global.DB && global.DB.przebuduj) global.DB.przebuduj();
  }

  function zapiszLogowanie(login, wynik) {
    systemowo(function () {
      S.insert("logowania", {
        czas: teraz(), kto: login, ip: "10.0.0.1", wynik: wynik, urzadzenie: "Przegladarka (makieta)"
      }, "LOG-");
    });
  }

  /* Sesja z bazy: rola, zakres i blokada czytane przy kazdym odczycie */
  function sesjaZBazy(token) {
    var r = S.one(
      "SELECT s.token, s.wygasa, s.ostatnia_aktywnosc, s.utworzono, u.id, u.login, u.imie_nazwisko, " +
      "       u.rola_id, u.instytucja_id, u.wszystkie_instytucje, u.zablokowane, " +
      "       r.nazwa AS rola_nazwa, r.typ AS rola_typ, i.nazwa AS instytucja_nazwa " +
      "FROM sesje s JOIN uzytkownicy u ON u.id = s.uzytkownik_id JOIN role r ON r.id = u.rola_id " +
      "LEFT JOIN instytucje i ON i.id = u.instytucja_id WHERE s.token = ?", [token]);
    var nieaktywna = r && new Date(r.ostatnia_aktywnosc).getTime() < Date.now() - bezczynnoscMin(r.rola_typ) * 60000;
    if (!r || r.zablokowane || r.wygasa < new Date().toISOString() || nieaktywna) {
      if (r) systemowo(function () { S.exec("DELETE FROM sesje WHERE token = ?", [token]); });
      return null;
    }
    if (Date.now() - ostatnieOdswiezenie > ODSWIEZ_AKTYWNOSC_MS) {
      ostatnieOdswiezenie = Date.now();
      /* Bez powiadamiania sluchaczy: to nie jest zmiana danych, ktora wymaga przebudowy */
      systemowo(function () {
        S.exec("UPDATE sesje SET ostatnia_aktywnosc = ? WHERE token = ?", [new Date().toISOString(), token]);
      });
      S.save();
    }
    return {
      uzytkownik_id: r.id, login: r.login, imie: r.imie_nazwisko,
      rola_id: r.rola_id, rola_nazwa: r.rola_nazwa, rola_typ: r.rola_typ,
      instytucja_id: r.instytucja_id, instytucja_nazwa: r.instytucja_nazwa,
      wszystkie_instytucje: !!r.wszystkie_instytucje, zalogowano: r.utworzono
    };
  }

  function bezczynnoscMin(typ) {
    return BEZCZYNNOSC_MIN[typ] || BEZCZYNNOSC_MIN.instytucja;
  }

  function nieudanaProba(u) {
    var proby = (u.nieudane_proby || 0) + 1;
    var patch = proby >= MAX_PROB
      ? { nieudane_proby: 0, zablokowane_do: isoZa(BLOKADA_MIN) }
      : { nieudane_proby: proby };
    systemowo(function () { S.update("uzytkownicy", u.id, patch); });
  }

  var Auth = {
    KLUCZ_SESJI: KLUCZ_SESJI,
    MAX_PROB: MAX_PROB,

    /* --------------------------- logowanie --------------------------- */

    zaloguj: function (login, haslo) {
      var u = S.one(
        "SELECT u.* FROM uzytkownicy u WHERE lower(u.login) = lower(?)", [String(login || "").trim()]);

      if (!u) {
        zapiszLogowanie(login, "blad hasla");
        return { ok: false, blad: BLAD_OGOLNY };
      }
      if (u.zablokowane_do && u.zablokowane_do > new Date().toISOString()) {
        zapiszLogowanie(login, "blokada czasowa");
        return { ok: false, blad: "Zbyt wiele nieudanych prób. Spróbuj ponownie za " + BLOKADA_MIN + " minut." };
      }
      if (global.Haslo.skrot(String(haslo), u.haslo_sol) !== u.haslo_skrot) {
        nieudanaProba(u);
        zapiszLogowanie(login, "blad hasla");
        return { ok: false, blad: BLAD_OGOLNY };
      }
      /* O blokadzie administratora mowimy dopiero po poprawnym hasle */
      if (u.zablokowane) {
        zapiszLogowanie(login, "zablokowane");
        return { ok: false, blad: "Konto zablokowane przez administratora." };
      }

      var token = losowyToken();
      var czas = new Date().toISOString();
      systemowo(function () {
        S.insert("sesje", { token: token, uzytkownik_id: u.id, utworzono: czas,
                            wygasa: isoZa(SESJA_MIN), ostatnia_aktywnosc: czas });
        S.update("uzytkownicy", u.id, { ostatnie_logowanie: teraz(), nieudane_proby: 0, zablokowane_do: null });
      });
      zapiszToken(token);
      zapiszLogowanie(login, "sukces");
      przebudujDane();
      return { ok: true, sesja: this.sesja() };
    },

    wyloguj: function () {
      var token = czytajToken() || pamiec.token;
      if (token) systemowo(function () { S.exec("DELETE FROM sesje WHERE token = ?", [token]); });
      zapiszToken(null);
      przebudujDane();
    },

    sesja: function () {
      var token = czytajToken() || pamiec.token;
      if (!token) return null;
      if (pamiec.token === token && pamiec.obiekt && Date.now() - pamiec.czas < WAZNOSC_PAMIECI_MS) {
        return pamiec.obiekt;
      }
      var obiekt = sesjaZBazy(token);
      if (!obiekt) { zapiszToken(null); return null; }
      pamiec = { token: token, obiekt: obiekt, czas: Date.now() };
      return obiekt;
    },

    zalogowany: function () { return !!this.sesja(); },

    rola: function () {
      var s = this.sesja();
      return s ? s.rola_id : null;
    },

    inicjaly: function () {
      var s = this.sesja();
      if (!s) return "??";
      return s.imie.split(/\s+/).map(function (c) { return c[0]; }).join("").slice(0, 2).toUpperCase();
    },

    /* ------------------------ uprawnienia: moduly ------------------------ */

    /* Czy rola ma feature, np. "dofin.manage" albo "finanse.prowizja" */
    maFunkcje: function (feature) {
      var s = this.sesja();
      return !!s && global.Funkcje.pasuje(global.Funkcje.nadania(s.rola_id), feature);
    },

    /* Poziom modulu wyliczony z features: manage = edycja, view = podglad */
    poziom: function (modulId) {
      if (this.maFunkcje(modulId + ".manage")) return "edycja";
      return this.maFunkcje(modulId + ".view") ? "podglad" : "brak";
    },

    widziModul: function (modulId) { return this.poziom(modulId) !== "brak"; },
    edytujeModul: function (modulId) { return this.poziom(modulId) === "edycja"; },

    moduly: function () {
      var self = this;
      if (!this.sesja()) return [];
      return S.query("SELECT * FROM moduly ORDER BY kolejnosc")
        .map(function (m) { m.poziom = self.poziom(m.id); return m; })
        .filter(function (m) { return m.poziom !== "brak"; });
    },

    /* Uprawnienie pola to tez feature (finanse.prowizja, klient.pesel) */
    moze: function (klucz) { return this.maFunkcje(klucz); },

    /* ------------------------- uprawnienia: wiersze ------------------------- */

    /* Lista instytucji, ktorych dane konto moze w ogole zobaczyc (D-113, D-35).
       Konto LDIT z flaga wszystkie_instytucje widzi wszystko, pozostale tylko
       przypisane. Zwraca null, gdy ograniczenia nie ma. */
    instytucje: function () {
      var s = this.sesja();
      if (!s) return [];
      if (s.wszystkie_instytucje) return null;
      return S.query("SELECT instytucja_id FROM v_zakres_uzytkownika WHERE uzytkownik_id = ?",
                     [s.uzytkownik_id]).map(function (r) { return r.instytucja_id; });
    },

    wZakresie: function (instytucjaId) {
      var lista = this.instytucje();
      return lista === null || lista.indexOf(instytucjaId) >= 0;
    },

    /* Klient nalezy do jednej instytucji (D-282), wiec jest w zakresie, gdy jego
       instytucja jest w zakresie konta; handlowiec widzi tylko swoich (D-210). */
    klienciWZakresie: function () {
      var lista = this.instytucje();
      if (lista === null) return null;
      if (!lista.length) return [];
      var puste = lista.map(function () { return "?"; }).join(", ");
      var handlowiec = this.handlowiec();
      return S.query("SELECT id FROM klienci WHERE instytucja_id IN (" + puste + ")" +
                     (handlowiec ? " AND handlowiec_id = ?" : ""), handlowiec ? lista.concat([handlowiec]) : lista)
        .map(function (r) { return r.id; });
    },

    /* Konto instytucji bez feature zakres.cala_instytucja to handlowiec: widzi
       wylacznie klientow i wnioski przypisane do siebie (D-210). Zwraca jego id
       albo null, gdy konto widzi cala instytucje albo nie jest kontem instytucji. */
    handlowiec: function () {
      var s = this.sesja();
      if (!s || s.rola_typ !== "instytucja") return null;
      return this.maFunkcje("zakres.cala_instytucja") ? null : s.uzytkownik_id;
    },

    /* --------------------------- brama dostepu --------------------------- */

    /* Wywolywane przez strony w ramce. Brak sesji albo brak uprawnienia do
       modulu konczy renderowanie i pokazuje komunikat zamiast danych. */
    wymagaj: function (modulId) {
      if (!this.zalogowany()) {
        this.pokazBlokade("Sesja wygasla", "Zaloguj sie ponownie, zeby zobaczyc te strone.");
        return false;
      }
      if (modulId && !this.widziModul(modulId)) {
        var s = this.sesja();
        this.pokazBlokade("Brak dostepu",
          "Rola <b>" + s.rola_nazwa + "</b> nie ma dostepu do tego modulu. " +
          "Uprawnienia nadawane sa per rola, nie per osoba (D-35, D-36).");
        return false;
      }
      return true;
    },

    pokazBlokade: function (tytul, tresc) {
      document.body.innerHTML =
        '<div class="blokada-dostepu">' +
        '<div class="blokada-ikona">&#9888;</div>' +
        '<h2>' + tytul + '</h2><p>' + tresc + '</p></div>';
    }
  };

  global.Auth = Auth;
})(window);
