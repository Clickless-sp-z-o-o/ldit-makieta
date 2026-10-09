/* ============================================================================
   Strażnik zapisów, reguły własności wiersza. Wydzielone ze straznik.js.

     uczestnicy_klienta, klient_urzedy  zmienia tylko konto, które widzi klienta,
                                        także przy edycji i usuwaniu (D-236, D-238)
     zadania                            bez feature zespol.zadania tylko własne,
                                        przypisuje innym administrator (D-246); tylko
                                        konto typu pracownik (D-285)
     pliki                              moduł z rekordu, do którego należy plik (D-278)

   API:  StraznikWlasnosc.sprawdz(operacja, tabela, dane, id, odmowa)
         StraznikWlasnosc.modulyPliku(operacja, dane, id), plikFormularzaPozwala(dane, odmowa),
         ponowneWyslanie(dane, id, polaDecyzji) autor ponownie wysyla zwrocony formularz (D-314)
         odczytZgloszeniaPozwala(operacja, dane, id, odmowa) tylko wlasne odczyty zgloszen (D-315)
         powiadomieniePozwala(operacja, dane, id, odmowa) powiadomienia instytucji: tworzy LDIT, oznacza adresat (D-317)
         pracownicyInstytucji(operacja, tabela, dane, id, odmowa) Administrator IS i konta swojej instytucji (D-318)
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

  /* Autor albo konto calej tej instytucji (Administrator IS) ponownie wysyla formularz zwrocony do
     uzupelnienia (D-314). Wolno tylko wrocic do "oczekuje" i wyczyscic decyzje (polaDecyzji);
     akceptacji ani odrzucenia instytucja sama sobie nie ustawi. */
  function ponowneWyslanie(dane, id, polaDecyzji) {
    var f = S.one("SELECT zglosil_id, instytucja_id, status, powod_odrzucenia FROM formularze_oczekujace WHERE id = ?", [id]);
    var A = global.Akceptacje;
    var prefiks = A ? A.PREFIKS_ZWROTU : null;
    return !!(f && prefiks && A.wysylaZaInstytucje && A.wysylaZaInstytucje(f) && f.status === "odrzucony" &&
      String(f.powod_odrzucenia || "").indexOf(prefiks) === 0 && dane.status === "oczekuje" &&
      polaDecyzji.every(function (k) { return !(k in dane) || dane[k] == null; }));
  }

  /* Odczyt zgloszenia (D-315): konto z dostepem do Zgloszen (D-107) zapisuje tylko wlasne odczyty */
  function odczytZgloszeniaPozwala(operacja, dane, id, odmowa) {
    if (!global.Auth.moze("zgloszenia.dostep")) odmowa("brak_uprawnien", "Zgłoszenia widzi tylko administrator i pracownik LDIT.");
    var ja = global.Auth.sesja().uzytkownik_id;
    var wiersz = operacja === "insert" ? dane : S.one("SELECT uzytkownik_id FROM zgloszenia_odczyty WHERE id = ?", [id]);
    if (!wiersz || wiersz.uzytkownik_id !== ja || (dane && dane.uzytkownik_id !== undefined && dane.uzytkownik_id !== ja)) {
      odmowa("brak_uprawnien", "Odczyt zgłoszenia zapisujesz tylko na swoim koncie.");
    }
  }

  /* Przypisanie terminu uczestnikowi wniosku (Terminy, uwaga 08.10). Termin musi nalezec do instytucji
     wniosku. Zmiana samego termin_id jest dozwolona z modulu Terminy (instytucja wystawia terminy),
     bez edycji Dofinansowan; zwraca true, gdy ten wyjatek zastepuje sprawdzenie modulu. */
  function terminUczestnika(operacja, tabela, dane, id, odmowa) {
    if (tabela !== "uczestnik_szkolenia" || operacja !== "update" || !dane || !("termin_id" in dane)) return false;
    if (dane.termin_id != null) {
      var t = S.one("SELECT instytucja_id AS i FROM terminy WHERE id = ?", [dane.termin_id]);
      var s = S.one("SELECT instytucja_id AS i FROM uczestnik_szkolenia WHERE id = ?", [id]);
      if (!t || !s || t.i !== s.i) odmowa("poza_zakresem", "Termin musi należeć do instytucji wniosku.");
    }
    var tylkoTermin = Object.keys(dane).every(function (k) { return k === "termin_id"; });
    return tylkoTermin && global.Auth.edytujeModul("terminy");
  }

  /* Powiadomienia (D-297, D-317). Wiersz instytucji (instytucja_id) tworzy wylacznie konto LDIT, przy swojej
     operacji; konto instytucji tylko oznacza jako przeczytane wlasne (swoja instytucja, adresat pusty albo ono),
     a usunac nie moze nikt. Powiadomien LDIT (instytucja_id NULL) konto instytucji nie dotyka.
     Zwraca true, gdy regula rozstrzygnela zapis (bez sprawdzenia modulu); false: zwykle sprawdzenie modulu. */
  function powiadomieniePozwala(operacja, dane, id, odmowa) {
    var s = global.Auth.sesja();
    var wiersz = operacja === "insert" ? (dane || {}) : (S.one("SELECT instytucja_id, adresat_id FROM powiadomienia WHERE id = ?", [id]) || {});
    if (!wiersz.instytucja_id) {
      if (s.instytucja_id) odmowa("poza_zakresem", "Powiadomienia LDIT nie są dostępne dla konta instytucji.");
      return false;
    }
    if (operacja === "insert") {
      if (s.instytucja_id) odmowa("brak_uprawnien", "Powiadomienie dla instytucji powstaje przy operacji LDIT.");
      return true;
    }
    var swoje = s.instytucja_id === wiersz.instytucja_id && (!wiersz.adresat_id || wiersz.adresat_id === s.uzytkownik_id);
    var tylkoOdczyt = operacja === "update" && Object.keys(dane || {}).every(function (k) { return k === "rozwiazano" || k === "rozwiazal_id"; }) &&
      (!("rozwiazal_id" in dane) || dane.rozwiazal_id === s.uzytkownik_id);
    if (!swoje || !tylkoOdczyt) odmowa("brak_uprawnien", "Powiadomienie oznacza jako przeczytane tylko jego adresat w instytucji.");
    return true;
  }

  /* Administrator IS zarzadza pracownikami swojej instytucji (D-126, D-318): zmienia im imie i role
     (tylko role instytucji, nie sobie) i przypisuje klientow oraz ich wnioski. Kont nie zaklada,
     nie usuwa i nie blokuje: to administrator LDIT. Zwraca true, gdy zapis konta instytucji rozstrzygnieto tu. */
  var POLA_KONTA_IS = ["imie_nazwisko", "rola_id"];
  function adminInstytucji() {
    return global.Auth.moze("zakres.cala_instytucja") && global.Auth.edytujeModul("panelIS");
  }
  function kontoPracownika(operacja, dane, id, odmowa, s) {
    if (!adminInstytucji()) odmowa("brak_uprawnien", "Pracownikami instytucji zarządza jej administrator.");
    if (operacja !== "update") odmowa("brak_uprawnien", "Konta zakłada, usuwa i blokuje administrator LDIT.");
    var konto = S.one("SELECT instytucja_id FROM uzytkownicy WHERE id = ?", [id]);
    if (!konto || konto.instytucja_id !== s.instytucja_id) odmowa("poza_zakresem", "To konto należy do innej instytucji.");
    Object.keys(dane || {}).forEach(function (k) {
      if (POLA_KONTA_IS.indexOf(k) < 0) odmowa("pole_chronione", "Administrator instytucji nie zmienia pola " + k + ".");
    });
    if (!dane || !("rola_id" in dane)) return;
    if (id === s.uzytkownik_id) odmowa("brak_uprawnien", "Nie zmienisz roli własnego konta.");
    var rola = S.one("SELECT typ FROM role WHERE id = ?", [dane.rola_id]);
    if (!rola || rola.typ !== "instytucja") odmowa("brak_uprawnien", "Administrator instytucji nadaje tylko role instytucji.");
  }
  function przypisanieHandlowca(tabela, dane, id, odmowa, s) {
    var wiersz = S.one("SELECT instytucja_id FROM " + (tabela === "klienci" ? "klienci" : "wnioski") + " WHERE id = ?", [id]);
    if (!wiersz || wiersz.instytucja_id !== s.instytucja_id) odmowa("poza_zakresem", "Ten rekord należy do innej instytucji.");
    if (dane.handlowiec_id == null) return;
    var konto = S.one("SELECT instytucja_id FROM uzytkownicy WHERE id = ?", [dane.handlowiec_id]);
    if (!konto || konto.instytucja_id !== s.instytucja_id) odmowa("poza_zakresem", "Klienta przypisujesz tylko pracownikowi swojej instytucji.");
  }
  function pracownicyInstytucji(operacja, tabela, dane, id, odmowa) {
    var s = global.Auth.sesja();
    if (!s || s.rola_typ !== "instytucja") return false;
    if (tabela === "uzytkownicy") { kontoPracownika(operacja, dane, id, odmowa, s); return true; }
    var tylkoHandlowiec = dane && Object.keys(dane).length === 1 && "handlowiec_id" in dane;
    if ((tabela === "klienci" || tabela === "wnioski") && operacja === "update" && tylkoHandlowiec && adminInstytucji()) {
      przypisanieHandlowca(tabela, dane, id, odmowa, s);
      return true;
    }
    return false;
  }

  global.StraznikWlasnosc = {
    pracownicyInstytucji: pracownicyInstytucji,
    terminUczestnika: terminUczestnika, powiadomieniePozwala: powiadomieniePozwala,
    sprawdz: function (operacja, tabela, dane, id, odmowa) {
      klientWierszaPozwala(operacja, tabela, dane, id, odmowa);
      zadaniePozwala(operacja, tabela, dane, id, odmowa);
      if (operacja !== "remove") przypisanyPracownik(tabela, dane, odmowa);
    },
    modulyPliku: modulyPliku, plikFormularzaPozwala: plikFormularzaPozwala, ponowneWyslanie: ponowneWyslanie,
    odczytZgloszeniaPozwala: odczytZgloszeniaPozwala
  };
})(window);
