/* ============================================================================
   Strażnik zapisów, reguły własności wiersza. Wydzielone ze straznik.js.

     uczestnicy_klienta, klient_urzedy  zmienia tylko konto, które widzi klienta,
                                        także przy edycji i usuwaniu (D-236, D-238)
     zadania                            bez feature zespol.zadania tylko własne,
                                        przypisuje innym administrator (D-246); tylko
                                        konto typu pracownik (D-285)
     pliki                              moduł z rekordu, do którego należy plik (D-278)

   API:  StraznikWlasnosc.sprawdz(operacja, tabela, dane, id, odmowa)
         StraznikWlasnosc.modulyPliku(operacja, dane, id), plikFormularzaPozwala(dane, odmowa)
         odmowa(kod, tresc) rzuca StraznikError ze straznik.js
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;
  if (!S) throw new Error("Brak window.Store. Dolacz assets/store.js przed straznik-wlasnosc.js");

  var TABELE_DANYCH_KLIENTA = { uczestnicy_klienta: true, klient_urzedy: true };

  function klientWierszaPozwala(operacja, tabela, dane, id, odmowa) {
    if (!TABELE_DANYCH_KLIENTA[tabela]) return;
    var zakres = global.Auth.klienciWZakresie();
    if (zakres === null) return;
    var klienci = [];
    if (operacja !== "insert") {
      var r = S.one("SELECT klient_id AS k FROM " + tabela + " WHERE id = ?", [id]);
      if (r) klienci.push(r.k);
    }
    if (operacja !== "remove" && dane && dane.klient_id !== undefined) klienci.push(dane.klient_id);
    if (klienci.some(function (k) { return zakres.indexOf(k) < 0; })) {
      odmowa("poza_zakresem", "Ten klient jest spoza Twojego zakresu.");
    }
  }

  /* Zadanie dostaje tylko konto pracownika, w tym administrator (D-285) */
  function przypisanyPracownik(tabela, dane, odmowa) {
    if (tabela !== "zadania" || !dane || !dane.przypisane_do) return;
    var r = S.one("SELECT r.typ FROM uzytkownicy u JOIN role r ON r.id = u.rola_id WHERE u.id = ?", [dane.przypisane_do]);
    if (!r || r.typ !== "pracownik") odmowa("walidacja", "Zadanie można przypisać tylko pracownikowi albo administratorowi.");
  }

  var MODUL_PLIKU = { szkolenie_id: ["inst"], formularz_id: ["dofin", "panelIS", "akcept"], certyfikat_id: ["dofin"], faktura_id: ["admin"] };
  function modulyPliku(operacja, dane, id) {
    var wiersz = operacja === "insert" ? (dane || {}) : (S.one("SELECT * FROM pliki WHERE id = ?", [id]) || {});
    var klucz = Object.keys(MODUL_PLIKU).filter(function (k) { return wiersz[k]; })[0];
    return klucz ? MODUL_PLIKU[klucz] : null;
  }

  /* Plik formularza od zglaszajacego: tylko do wlasnego, czekajacego formularza */
  function plikFormularzaPozwala(dane, odmowa) {
    var f = S.one("SELECT zglosil_id, status FROM formularze_oczekujace WHERE id = ?", [dane.formularz_id]);
    if (!f || f.zglosil_id !== global.Auth.sesja().uzytkownik_id || f.status !== "oczekuje") {
      odmowa("brak_uprawnien", "Plik dołączasz tylko do własnego formularza czekającego na akceptację.");
    }
  }

  function zadaniePozwala(operacja, tabela, dane, id, odmowa) {
    if (tabela !== "zadania" || global.Auth.moze("zespol.zadania")) return;
    var ja = global.Auth.sesja().uzytkownik_id;
    if (operacja !== "insert") {
      var r = S.one("SELECT przypisane_do AS p FROM zadania WHERE id = ?", [id]);
      if (r && r.p !== ja) odmowa("poza_zakresem", "To zadanie jest przypisane do innej osoby.");
    }
    if (operacja !== "remove" && dane && dane.przypisane_do !== undefined && dane.przypisane_do !== ja) {
      odmowa("poza_zakresem", "Zadania innym osobom przypisuje administrator.");
    }
  }

  global.StraznikWlasnosc = {
    sprawdz: function (operacja, tabela, dane, id, odmowa) {
      klientWierszaPozwala(operacja, tabela, dane, id, odmowa);
      zadaniePozwala(operacja, tabela, dane, id, odmowa);
      if (operacja !== "remove") przypisanyPracownik(tabela, dane, odmowa);
    },
    modulyPliku: modulyPliku, plikFormularzaPozwala: plikFormularzaPozwala
  };
})(window);
