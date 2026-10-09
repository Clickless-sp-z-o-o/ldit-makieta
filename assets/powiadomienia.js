/* ============================================================================
   Powiadomienia dla instytucji szkoleniowej (D-317).

   Powstaja w warstwie danych, przy operacji LDIT, nie na ekranie: decyzja
   o formularzu i o zmianie danych, decyzja urzedu i rozliczenie wniosku klienta
   instytucji, przypisanie uczestnikow do terminu. Tresc krotka, bez stawek.
   instytucja_id NULL to powiadomienie dla LDIT (D-297), tych instytucja nie widzi.

   Widocznosc: konto instytucji widzi tylko powiadomienia swojej instytucji;
   adresowane (adresat_id) tylko adresat. Handlowiec instytucji widzi adresowane do
   siebie i te o rekordach ze swojego zakresu (wnioski, formularze). Zapisy pilnuje
   tez straznik (StraznikWlasnosc.powiadomieniePozwala).

   API:  Powiadomienia.oFormularzu(f, rodzaj, powod)   rodzaj: formularz_zaakceptowany | _zwrocony | _odrzucony
         Powiadomienia.oZmianie(p, zatwierdzona, powod) p = wiersz propozycje_zmian
         Powiadomienia.oStatusieWniosku(w, akcja)      w z adaptera DB; tylko pozytywna, negatywna, rozliczony
         Powiadomienia.oTerminie(w, termin)            przypisanie uczestnikow wniosku do terminu
         Powiadomienia.widoczne(), nieprzeczytane()     dla zalogowanego konta instytucji
         Powiadomienia.oznacz(id), oznaczWszystkie()   przeczytane przez zalogowane konto
   ============================================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var STATUSY = { pozytywna: ["decyzja_urzedu", "Decyzja pozytywna urzędu"], negatywna: ["decyzja_urzedu", "Decyzja negatywna urzędu"],
                  rozliczony: ["wniosek_rozliczony", "Wniosek rozliczony"] };
  var FORMULARZ = { formularz_zaakceptowany: "Formularz zaakceptowany, klient jest w bazie", formularz_zwrocony: "Formularz zwrócony do uzupełnienia",
                    formularz_odrzucony: "Formularz odrzucony" };

  function teraz() { return new Date().toISOString(); }

  /* Adresat tylko wtedy, gdy to konto instytucji: powiadomienie dla pracownika LDIT nie ma sensu w panelu instytucji */
  function kontoInstytucji(uzytkownikId) {
    var u = uzytkownikId ? S.one("SELECT instytucja_id FROM uzytkownicy WHERE id = ?", [uzytkownikId]) : null;
    return !!(u && u.instytucja_id);
  }

  function dodaj(rodzaj, instytucjaId, tresc, tabela, rekordId, adresatId) {
    if (!instytucjaId) return null;
    return S.insert("powiadomienia", { rodzaj: rodzaj, tresc: tresc, tabela: tabela, rekord_id: rekordId, instytucja_id: instytucjaId,
      adresat_id: kontoInstytucji(adresatId) ? adresatId : null, utworzono: teraz() }, "POW-");
  }

  function oFormularzu(f, rodzaj, powod) {
    var tresc = FORMULARZ[rodzaj] + ": " + f.firma + "." + (powod ? " " + powod : "");
    return dodaj(rodzaj, f.instytucja_id, tresc, "formularze_oczekujace", f.id, f.zglosil_id);
  }

  function oZmianie(p, zatwierdzona, powod) {
    var co = p.tabela === "instytucje" ? "danych instytucji" : p.tabela === "katalog_szkolen" ? "katalogu szkoleń" : "danych klienta";
    var tresc = (zatwierdzona ? "Zmiana " + co + " zatwierdzona." : "Zmiana " + co + " odrzucona." + (powod ? " Powód: " + powod : ""));
    return dodaj(zatwierdzona ? "zmiana_zatwierdzona" : "zmiana_odrzucona", p.instytucja_id, tresc, "propozycje_zmian", p.id, p.zglosil_id);
  }

  function oStatusieWniosku(w, akcja) {
    var s = STATUSY[akcja];
    if (!s) return null;
    return dodaj(s[0], w.is, s[1] + ": " + (w.klNazwa || "klient") + " (wniosek " + (w.nr || w.id) + ").", "wnioski", w.id, null);
  }

  function oTerminie(w, termin) {
    var kiedy = termin.data_od ? " " + termin.data_od + (termin.data_do && termin.data_do !== termin.data_od ? " - " + termin.data_do : "") : "";
    return dodaj("termin_przypisany", w.is, "Uczestnicy wniosku " + (w.nr || w.id) + " (" + (w.klNazwa || "klient") + ") przypisani do terminu" + kiedy + ".",
      "wnioski", w.id, null);
  }

  /* Rekord z zakresu handlowca: wniosek albo formularz widoczny w jego DB po zawezeniu (Zakres.zakresHandlowca) */
  function wZakresieHandlowca(p) {
    var DB = global.DB || {};
    if (p.tabela === "wnioski") return (DB.WNIOSKI_WSZYSTKIE || []).some(function (w) { return w.id === p.rekord_id; });
    if (p.tabela === "formularze_oczekujace") return (DB.KOLEJKA || []).some(function (k) { return k.id === p.rekord_id; });
    return false;
  }

  function widoczne() {
    var Auth = global.Auth;
    if (!Auth || !Auth.zalogowany()) return [];
    var s = Auth.sesja();
    if (!s.instytucja_id) return [];
    var handlowiec = Auth.handlowiec();
    return S.query("SELECT * FROM powiadomienia WHERE instytucja_id = ? ORDER BY utworzono DESC", [s.instytucja_id]).filter(function (p) {
      if (p.adresat_id) return p.adresat_id === s.uzytkownik_id;
      return !handlowiec || wZakresieHandlowca(p);
    });
  }

  function nieprzeczytane() { return widoczne().filter(function (p) { return !p.rozwiazano; }); }

  function oznacz(id) {
    S.update("powiadomienia", id, { rozwiazano: teraz(), rozwiazal_id: global.Auth.sesja().uzytkownik_id });
  }

  function oznaczWszystkie() {
    var lista = nieprzeczytane();
    lista.forEach(function (p) { oznacz(p.id); });
    return lista.length;
  }

  global.Powiadomienia = {
    oFormularzu: oFormularzu, oZmianie: oZmianie, oStatusieWniosku: oStatusieWniosku, oTerminie: oTerminie,
    widoczne: widoczne, nieprzeczytane: nieprzeczytane, oznacz: oznacz, oznaczWszystkie: oznaczWszystkie
  };
})(window);
