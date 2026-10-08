/* ============================================================================
   Wczytanie naborow z plikow zrodlowych (D-271, D-272, D-297).

   W aplikacji robi to automatyzacja; makieta pokazuje ten sam przebieg recznie:
   1. kazdy wiersz pliku trafia bez zmian do tabeli zrodlowej src_ (warstwa brazowa),
   2. urzad dopasowuje sie po nazwie albo aliasie z jednego slownika urzedow,
   3. dopasowany wiersz tworzy albo aktualizuje nabor (klucz: urzad, rodzaj, data od),
   4. urzad spoza slownika nie trafia do naborow, tylko do powiadomien.
   Zapis idzie przez Store, wiec przechodzi przez straznika i walidacje.

   API:  NaboryImport.wczytaj(rodzaj, wiersze, plik) -> {wczytane, nowe, zaktualizowane, nieznane, partia}
         NaboryImport.ostatnieWczytanie()           -> {partia, plik, czas, wierszy} albo null
         NaboryImport.cofnijWczytanie(partia)       -> {usuniete, przywrocone} (P-79 b, tylko edycja Naborow)
         NaboryImport.dopasujUrzad(nazwa)           -> wiersz urzedy_pracy albo null
         NaboryImport.parsujCsv(tekst)              -> [{kolumna: wartosc}]
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;
  if (!S) throw new Error("Brak window.Store. Dolacz assets/store.js przed nabory-import.js");

  var RODZAJE = {
    ogloszone: { tabela: "src_nabory_ogloszone", prefiks: "SRO-", rodzaj: "ogloszony",
                 kolumny: ["wojewodztwo", "urzad", "deficyt_wojewodzki", "deficyt_powiatowy", "data_weryfikacji", "data_od", "data_do", "status", "srodki", "link", "podsumowanie"] },
    prognozowane: { tabela: "src_nabory_prognozowane", prefiks: "SRP-", rodzaj: "prognozowany",
                    kolumny: ["wojewodztwo", "urzad", "prognoza_opis", "data_od", "data_do", "data_weryfikacji", "podsumowanie"] }
  };
  var STATUSY_OGLOSZONYCH = ["trwa", "zakończony", "oczekuje"];

  function NaboryImportError(kod, komunikat) {
    this.name = "NaboryImportError"; this.kod = kod; this.message = komunikat;
  }
  NaboryImportError.prototype = Object.create(Error.prototype);
  NaboryImportError.prototype.constructor = NaboryImportError;

  function normalizuj(t) { return String(t || "").trim().replace(/\s+/g, " ").toLowerCase(); }

  function dopasujUrzad(nazwa) {
    var szukana = normalizuj(nazwa);
    if (!szukana) return null;
    return S.get("urzedy_pracy").filter(function (u) {
      return normalizuj(u.nazwa) === szukana || JSON.parse(u.aliasy || "[]").some(function (a) { return normalizuj(a) === szukana; });
    })[0] || null;
  }

  function dzis() {
    var meta = S.one("SELECT wartosc FROM meta WHERE klucz = 'data_biezaca'");
    return meta && meta.wartosc ? meta.wartosc : new Date().toISOString().slice(0, 10);
  }

  /* Status z pliku, a gdy go brak albo jest nieznany: z dat wzgledem dnia biezacego */
  function statusOgloszonego(w, data) {
    var s = normalizuj(w.status);
    if (STATUSY_OGLOSZONYCH.indexOf(s) >= 0) return s;
    if (w.data_od && w.data_od > data) return "oczekuje";
    if (w.data_do && w.data_do < data) return "zakończony";
    return "trwa";
  }

  function pusteNaNull(v) { return v == null || String(v).trim() === "" ? null : String(v).trim(); }

  function naborZWiersza(def, w, urzad, zrodloId, data) {
    var prognoza = def.rodzaj === "prognozowany";
    return {
      pup_id: urzad.id, rodzaj: def.rodzaj, status: prognoza ? "prognozowany" : statusOgloszonego(w, data),
      deficyt_wojewodzki: pusteNaNull(w.deficyt_wojewodzki), deficyt_powiatowy: pusteNaNull(w.deficyt_powiatowy),
      data_weryfikacji: pusteNaNull(w.data_weryfikacji), data_od: pusteNaNull(w.data_od), data_do: pusteNaNull(w.data_do),
      prognoza_opis: prognoza ? pusteNaNull(w.prognoza_opis) : null, srodki: pusteNaNull(w.srodki),
      link: pusteNaNull(w.link), podsumowanie: pusteNaNull(w.podsumowanie), zrodlo_id: zrodloId
    };
  }

  function zglosNieznany(def, w, zrodloId, plik) {
    return S.insert("powiadomienia", {
      rodzaj: "nieznany_urzad", tabela: def.tabela, rekord_id: zrodloId, utworzono: new Date().toISOString(),
      tresc: "Nabór z pliku " + (plik || "bez nazwy") + " wskazuje urząd „" + (w.urzad || "bez nazwy") +
        "”, którego nie ma w słowniku urzędów ani w aliasach. Dodaj alias w Ustawieniach > Słowniki albo popraw plik."
    }, "POW-");
  }

  /* ------------------------------ cofanie wczytania (P-79 wariant b) ------------------------------
     Kazde wczytanie to partia w rejestrze aktywnosci: wpis na kazdy dodany wiersz src_, nabor
     i powiadomienie oraz na kazdy zmieniony nabor z jego poprzednimi wartosciami. Rejestr jest
     tylko do dopisywania (D-211), wiec cofniecie dopisuje wlasny wpis z partia "COF:<partia>". */
  var TYP_WCZYTANIA = "Wczytanie naborów";
  var TYP_COFNIECIA = "Cofnięcie wczytania naborów";
  var PREFIKS_COFNIECIA = "COF:";

  function ktoZmienia() {
    var s = global.Auth && global.Auth.sesja();
    return s ? s.imie : "automatyzacja";
  }

  var Cofanie = {
    rejestrWczytania: function (czas, plik) {
      var partia = "WCZ-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1296).toString(36);
      var kto = ktoZmienia();
      return {
        partia: partia,
        zapisz: function (tabela, id, pole, przed) {
          S.insert("rejestr_aktywnosci", { czas: czas, kto: kto, typ: TYP_WCZYTANIA, obiekt: plik || "plik bez nazwy", pole: pole,
                                           przed: przed, po: null, partia: partia, tabela: tabela, rekord_id: id }, "AKT-");
        }
      };
    },
    /* Poprzednie wartosci tych pol, ktore wczytanie nadpisuje */
    przed: function (istniejacy, nowy) {
      var o = {};
      Object.keys(nowy).forEach(function (k) { o[k] = istniejacy[k] == null ? null : istniejacy[k]; });
      return JSON.stringify(o);
    }
  };

  /* Ostatnie wczytanie, ktorego jeszcze nie cofnieto, albo null */
  function ostatnieWczytanie() {
    var wpisy = S.get("rejestr_aktywnosci").filter(function (r) { return r.partia && (r.typ === TYP_WCZYTANIA || r.typ === TYP_COFNIECIA); });
    var cofniete = {};
    wpisy.forEach(function (r) { if (r.typ === TYP_COFNIECIA) cofniete[r.partia.slice(PREFIKS_COFNIECIA.length)] = true; });
    var wczytania = wpisy.filter(function (r) { return r.typ === TYP_WCZYTANIA && !cofniete[r.partia]; });
    if (!wczytania.length) return null;
    var ostatni = wczytania.reduce(function (a, b) { return String(b.czas) >= String(a.czas) ? b : a; });
    var partii = wczytania.filter(function (r) { return r.partia === ostatni.partia; });
    return { partia: ostatni.partia, plik: ostatni.obiekt, czas: ostatni.czas, wpisy: partii,
             wierszy: partii.filter(function (r) { return /^src_/.test(r.tabela); }).length };
  }

  /* Usuwa wiersze dodane przez wczytanie i przywraca nabory sprzed niego, w odwrotnej kolejnosci zapisu */
  function cofnijWczytanie(partia) {
    if (!global.Auth || !global.Auth.edytujeModul("nabory")) {
      throw new NaboryImportError("brak_uprawnien", "Cofnąć wczytanie może tylko konto z edycją modułu Nabory.");
    }
    var biezace = ostatnieWczytanie();
    if (!biezace || biezace.partia !== partia) throw new NaboryImportError("nie_ostatnie", "Cofnąć można tylko ostatnie wczytanie pliku.");
    var wynik = { usuniete: 0, przywrocone: 0 };
    biezace.wpisy.slice().reverse().forEach(function (r) {
      if (r.pole === "zmieniony") { S.update(r.tabela, r.rekord_id, JSON.parse(r.przed)); wynik.przywrocone++; return; }
      var wiersz = S.find(r.tabela, r.rekord_id);
      if (!wiersz || (r.tabela === "powiadomienia" && wiersz.rozwiazano)) return;
      S.remove(r.tabela, r.rekord_id);
      wynik.usuniete++;
    });
    S.insert("rejestr_aktywnosci", { czas: new Date().toISOString(), kto: ktoZmienia(), typ: TYP_COFNIECIA, obiekt: biezace.plik, pole: "Wczytanie",
                                     przed: String(biezace.wpisy.length), po: "usunięte " + wynik.usuniete + ", przywrócone " + wynik.przywrocone,
                                     partia: PREFIKS_COFNIECIA + partia }, "AKT-");
    return wynik;
  }

  function wczytaj(rodzaj, wiersze, plik) {
    var def = RODZAJE[rodzaj];
    if (!def) throw new NaboryImportError("zly_rodzaj", "Nieznany rodzaj pliku naborów: " + rodzaj);
    if (!Array.isArray(wiersze) || !wiersze.length) throw new NaboryImportError("pusty_plik", "Plik nie ma żadnego wiersza naborów.");
    var data = dzis(), teraz = new Date().toISOString();
    var wpis = Cofanie.rejestrWczytania(teraz, plik);
    var wynik = { wczytane: 0, nowe: 0, zaktualizowane: 0, nieznane: [], partia: wpis.partia };
    wiersze.forEach(function (w) {
      var surowy = { wczytano: teraz, plik_zrodlowy: plik || null };
      def.kolumny.forEach(function (k) { surowy[k] = pusteNaNull(w[k]); });
      var zrodlo = S.insert(def.tabela, surowy, def.prefiks);
      wpis.zapisz(def.tabela, zrodlo.id, "dodany", null);
      wynik.wczytane++;
      var urzad = dopasujUrzad(w.urzad);
      if (!urzad) {
        wpis.zapisz("powiadomienia", zglosNieznany(def, w, zrodlo.id, plik).id, "dodany", null);
        wynik.nieznane.push(w.urzad || "");
        return;
      }
      var nabor = naborZWiersza(def, w, urzad, zrodlo.id, data);
      var istniejacy = S.one("SELECT * FROM nabory WHERE pup_id = ? AND rodzaj = ? AND COALESCE(data_od, '') = ?",
                             [nabor.pup_id, nabor.rodzaj, nabor.data_od || ""]);
      if (istniejacy) {
        wpis.zapisz("nabory", istniejacy.id, "zmieniony", Cofanie.przed(istniejacy, nabor));
        S.update("nabory", istniejacy.id, nabor);
        wynik.zaktualizowane++;
      } else {
        wpis.zapisz("nabory", S.insert("nabory", nabor, "NAB-").id, "dodany", null);
        wynik.nowe++;
      }
    });
    return wynik;
  }

  /* CSV z naglowkiem w pierwszym wierszu; separator ; albo , (wykrywany z naglowka) */
  function parsujCsv(tekst) {
    var linie = String(tekst || "").replace(/^﻿/, "").split(/\r?\n/).filter(function (l) { return l.trim() !== ""; });
    if (linie.length < 2) throw new NaboryImportError("pusty_plik", "Plik CSV musi mieć nagłówek i co najmniej jeden wiersz.");
    var sep = linie[0].indexOf(";") >= 0 ? ";" : ",";
    var naglowek = rozbij(linie[0], sep).map(normalizuj);
    return linie.slice(1).map(function (l) {
      var pola = rozbij(l, sep), o = {};
      naglowek.forEach(function (k, i) { o[k] = pola[i]; });
      return o;
    });
  }

  function rozbij(linia, sep) {
    var pola = [], biezace = "", wCudzyslowie = false;
    for (var i = 0; i < linia.length; i++) {
      var z = linia[i];
      if (z === '"' && linia[i + 1] === '"' && wCudzyslowie) { biezace += '"'; i++; }
      else if (z === '"') wCudzyslowie = !wCudzyslowie;
      else if (z === sep && !wCudzyslowie) { pola.push(biezace.trim()); biezace = ""; }
      else biezace += z;
    }
    pola.push(biezace.trim());
    return pola;
  }

  global.NaboryImport = { wczytaj: wczytaj, dopasujUrzad: dopasujUrzad, parsujCsv: parsujCsv,
                          ostatnieWczytanie: ostatnieWczytanie, cofnijWczytanie: cofnijWczytanie,
                          RODZAJE: RODZAJE, NaboryImportError: NaboryImportError };
})(window);
