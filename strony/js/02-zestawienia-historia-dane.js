/* Logika bez DOM: historia wniosku na liscie Dofinansowan jako przebieg wniosku (spotkanie 14.10.2026):
   co i kiedy sie dzialo, chronologicznie, zamiast technicznej listy zmian pol.
   Zrodla, te same co na karcie wniosku (03-wniosek-os-logika.js), czytane tylko dla wniosku z zakresu konta:
     - daty z wniosku (formularz, data wniosku, faktura, prosba o usuniecie),
     - przebieg_wniosku: zmiany etapu i wpisy reczne z wykonawca,
     - zadania wniosku z terminem (DB.ZADANIA, juz zawezone do zakresu konta),
     - korespondencja klienta (DB.MAILE, zawezone do zakresu konta, prywatna skrzynka administratora odpada),
     - rejestr aktywnosci (DB.AKTYWNOSC, tylko dla kont z rejestrem): zmiany statusu, wysylka maila,
       usuniecie i przywrocenie. Zmiany kwot i kolejnosci zostaja w historii rekordu na karcie.
   Zmiana statusu z listy zapisuje wpis etapu w przebiegu i wpis w rejestrze z ta sama minuta:
   na osi to jedno zdarzenie "Status", z etapem w opisie.

   HistoriaWniosku.pozycje(w, dzis) -> [{ czas, rodzaj, tytul, opis, kto, zaplanowane }] rosnaco po czasie.
   rodzaj: "wniosek" | "status" | "etap" | "wpis" | "zadanie" | "mail" */
(function (global) {
  "use strict";

  var DLUGOSC_MINUTY = 16;
  var DLUGOSC_DATY = 10;
  var TYPY_STATUSU = ["Zmiana statusu", "Zmiana zbiorcza", "Cofnięcie zmiany zbiorczej"];
  var TYPY_ZDARZEN = { "Nowy projekt": "wniosek", "Usunięcie wniosku": "wniosek", "Przywrócenie wniosku": "wniosek",
                       "Wysyłka maila": "mail" };
  var STATUS_ZADANIA = { otwarte: "do zrobienia", zrobione: "zrobione", anulowane: "anulowane" };

  function osoba(id) {
    if (!id) return "";
    var zespol = global.DB.ZESPOL_LDIT || {};
    if (zespol[id]) return zespol[id];
    var u = (global.DB.UZYTKOWNICY || []).filter(function (x) { return x.login === id; })[0];
    return u && u.imie ? u.imie : (global.Auth.sesja() && global.Auth.sesja().instytucja_nazwa ? "LDIT" : id);
  }

  function pozycja(czas, rodzaj, tytul, opis, kto) {
    return { czas: String(czas || ""), rodzaj: rodzaj, tytul: tytul, opis: opis || "", kto: kto || "", zaplanowane: false };
  }

  function zDat(w) {
    var p = [];
    if (w.dataFormularza) p.push(pozycja(w.dataFormularza, "wniosek", "Formularz zgłoszeniowy wpłynął"));
    if (w.dataWniosku) p.push(pozycja(w.dataWniosku, "wniosek", "Data wniosku"));
    var zafakturowany = w.fakturaWystawiona || w.rozliczenie === "Zafakturowany" || w.rozliczenie === "Rozliczone";
    if (w.dataFaktury && zafakturowany) p.push(pozycja(w.dataFaktury, "wniosek", "Faktura wystawiona"));
    if (w.usuniecieProsba) {
      p.push(pozycja(w.usuniecieProsba.czas, "wniosek", "Prośba o usunięcie wniosku, czeka na akceptację administratora",
        w.usuniecieProsba.powod ? "powód: " + w.usuniecieProsba.powod : "", osoba(w.usuniecieProsba.od)));
    }
    return p;
  }

  function nazwaEtapu(n) {
    var etapy = global.Statusy.ETAPY || [];
    return "etap " + n + (etapy[n] ? ": " + etapy[n] : "");
  }

  function zPrzebiegu(w) {
    return global.Store.query("SELECT * FROM przebieg_wniosku WHERE wniosek_id = ? ORDER BY czas", [w.id]).map(function (r) {
      if (r.rodzaj === "reczny") {
        return pozycja(r.czas, "wpis", r.komentarz, r.wykonawca_id ? "wykonuje: " + osoba(r.wykonawca_id) : "", osoba(r.uzytkownik_id));
      }
      var opis = r.komentarz ? r.komentarz + (r.etap_z != null ? ", wcześniej etap " + r.etap_z : "") : "";
      var p = pozycja(r.czas, "etap", nazwaEtapu(r.etap_do).replace(/^e/, "E"), opis, osoba(r.uzytkownik_id));
      p.etapDo = r.etap_do;
      return p;
    });
  }

  function zZadan(w, dzis) {
    return (global.DB.ZADANIA || []).filter(function (z) { return z.wniosek_id === w.id && z.termin; }).map(function (z) {
      var opis = "termin " + global.DB.fmtDate(String(z.termin).slice(0, DLUGOSC_DATY)) + ", " + (STATUS_ZADANIA[z.status] || z.status) +
        (z.przypisane_do ? ", przypisane: " + osoba(z.przypisane_do) : "");
      var p = pozycja(String(z.termin).slice(0, DLUGOSC_DATY), "zadanie", z.tytul, opis, osoba(z.utworzyl_id));
      p.zaplanowane = z.status === "otwarte" && String(z.termin).slice(0, DLUGOSC_DATY) >= dzis;
      return p;
    });
  }

  function zMaili(w) {
    return (global.DB.MAILE || []).filter(function (m) { return m.klient && m.klient === w.klient; }).map(function (m) {
      var wyslany = m.kier !== "in";
      return pozycja(m.data, "mail", (wyslany ? "Wysłany mail: " : "Odebrany mail: ") + (m.temat || "bez tematu"),
        "korespondencja klienta" + (m.zal ? ", załączniki: " + m.zal : ""),
        wyslany ? osoba(m.od) : m.od);
    });
  }

  function dotyczyWniosku(r, w) {
    return r.obiekt === w.id || (r.tabela === "wnioski" && r.rekord_id === w.id) ||
      (r.typ === "Wysyłka maila" && (r.rekord_id === w.klient || r.obiekt === w.klient));
  }

  function zRejestru(w) {
    return (global.DB.AKTYWNOSC || []).filter(function (r) {
      return dotyczyWniosku(r, w) && (TYPY_STATUSU.indexOf(r.typ) >= 0 || TYPY_ZDARZEN[r.typ]);
    }).map(function (r) {
      if (TYPY_STATUSU.indexOf(r.typ) >= 0) {
        var tytul = "Status: " + (r.przed && r.przed !== "brak" ? r.przed + " → " : "") + r.po;
        return pozycja(r.czas, "status", tytul, r.typ === "Zmiana statusu" ? "" : r.typ.toLowerCase(), r.kto);
      }
      var tytulZd = r.typ === "Wysyłka maila" ? "Wysłany mail z systemu: " + (r.po || "") : r.typ;
      return pozycja(r.czas, TYPY_ZDARZEN[r.typ], tytulZd, r.typ === "Wysyłka maila" ? "" : r.po, r.kto);
    });
  }

  /* Zmiana statusu i wynikajaca z niej zmiana etapu w tej samej minucie to jedno zdarzenie */
  function polaczStatusyZEtapami(statusy, przebieg) {
    var wolne = statusy.slice();
    var reszta = przebieg.filter(function (p) {
      if (p.rodzaj !== "etap") return true;
      var para = wolne.filter(function (s) { return s.czas.slice(0, DLUGOSC_MINUTY) === p.czas.slice(0, DLUGOSC_MINUTY); })[0];
      if (!para) return true;
      para.opis = (para.opis ? para.opis + ", " : "") + nazwaEtapu(p.etapDo);
      wolne.splice(wolne.indexOf(para), 1);
      return false;
    });
    return statusy.concat(reszta);
  }

  function pozycje(w, dzis) {
    if (!w) return [];
    var rejestr = zRejestru(w);
    var statusy = rejestr.filter(function (p) { return p.rodzaj === "status"; });
    var inne = rejestr.filter(function (p) { return p.rodzaj !== "status"; });
    var lista = zDat(w).concat(polaczStatusyZEtapami(statusy, zPrzebiegu(w)), zZadan(w, dzis || ""), zMaili(w), inne);
    return lista.filter(function (p) { return p.czas; }).sort(function (a, b) { return a.czas < b.czas ? -1 : a.czas > b.czas ? 1 : 0; });
  }

  global.HistoriaWniosku = { pozycje: pozycje };
})(window);
