/* ============================================================================
   Eksporty danych do CSV i Excela (uwaga 08.10, D-317).

   CSV: UTF-8 z BOM, separator srednik, konce linii CRLF, jak Excel w polskich
   ustawieniach; komorki zaczynajace sie od = + - @ dostaja apostrof, zeby arkusz
   nie wykonal formuly (poza numerami telefonow). Excel: assets/xlsx.js, wszystkie
   kolumny tekstowe. Eksport zapisuje zdarzenie "Eksport" w rejestrze aktywnosci
   (zdarzenie istotne, D-189). Dane do eksportu przygotowuje ekran z tych samych
   warstw co widok (DB.*, zakres konta), ten modul niczego nie filtruje.

   API:  Eksport.csv(kolumny, wiersze) -> tekst pliku CSV
         Eksport.xlsx(kolumny, wiersze, arkusz) -> Uint8Array pliku .xlsx
         Eksport.plik({ nazwa, kolumny, wiersze, format, arkusz, opis }) -> { nazwa, typ, tresc, wierszy }
         Eksport.pobierz(opcje) jak plik, plus pobranie w przegladarce i wpis w rejestrze
         Eksport.menuHtml(id, pozycje) -> przycisk "Eksport" z lista [{ klucz, etykieta }], CSV i Excel
   kolumny: [{ k: klucz w wierszu, n: naglowek }], format: "csv" | "xlsx"
   ============================================================================ */
(function (global) {
  "use strict";

  function EksportError(kod, komunikat) { this.name = "EksportError"; this.kod = kod; this.message = komunikat; }
  EksportError.prototype = Object.create(Error.prototype);
  EksportError.prototype.constructor = EksportError;

  var TELEFON = /^[+\-]?[\d\s()\-]+$/;
  var TYPY = { csv: "text/csv;charset=utf-8", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };

  function tekst(wartosc) { return wartosc == null ? "" : String(wartosc); }

  /* Komorka CSV: ochrona przed formulami arkusza, cudzyslowy przy separatorze i nowej linii */
  function komorkaCsv(wartosc) {
    var t = tekst(wartosc);
    if (/^[=+\-@\t\r]/.test(t) && !TELEFON.test(t)) t = "'" + t;
    return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }

  function wartosci(kolumny, wiersz) { return kolumny.map(function (c) { return tekst(wiersz[c.k]); }); }

  function csv(kolumny, wiersze) {
    var linie = [kolumny.map(function (c) { return komorkaCsv(c.n); }).join(";")].concat((wiersze || []).map(function (w) {
      return wartosci(kolumny, w).map(komorkaCsv).join(";");
    }));
    return "﻿" + linie.join("\r\n") + "\r\n";
  }

  function xlsx(kolumny, wiersze, arkusz) {
    if (!global.XlsxPlik) throw new EksportError("brak_xlsx", "Zapis do Excela jest niedostępny na tym ekranie.");
    return global.XlsxPlik.szablon(kolumny.map(function (c) { return c.n; }), (wiersze || []).map(function (w) { return wartosci(kolumny, w); }), arkusz);
  }

  function dzis() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function plik(o) {
    if (!o || !o.nazwa || !Array.isArray(o.kolumny) || !o.kolumny.length) throw new EksportError("zle_dane", "Eksport wymaga nazwy i listy kolumn.");
    if (!TYPY[o.format]) throw new EksportError("zly_format", "Nieznany format eksportu: " + o.format + ".");
    var wiersze = o.wiersze || [];
    return { nazwa: o.nazwa + "-" + dzis() + "." + o.format, typ: TYPY[o.format], wierszy: wiersze.length,
             tresc: o.format === "csv" ? csv(o.kolumny, wiersze) : xlsx(o.kolumny, wiersze, o.arkusz || o.opis) };
  }

  /* Zdarzenie istotne (D-189): kto, co i ile wierszy wyeksportowal */
  function doRejestru(o, wynik) {
    var A = global.Akceptacje, s = global.Auth && global.Auth.sesja();
    if (!s || !global.Store) return;
    var czas = A ? A.ktoTeraz().czas : dzis();
    global.Store.insert("rejestr_aktywnosci", { czas: czas, kto: s.imie || s.uzytkownik_id, typ: "Eksport", obiekt: o.opis || o.nazwa,
      pole: o.format.toUpperCase(), przed: "brak", po: wynik.wierszy + " wierszy, plik " + wynik.nazwa }, "AKT-");
  }

  function zapiszWPrzegladarce(wynik) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([wynik.tresc], { type: wynik.typ }));
    a.download = wynik.nazwa;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function pobierz(o) {
    var wynik = plik(o);
    doRejestru(o, wynik);
    if (global.KFS && global.KFS.zapiszTeraz) global.KFS.zapiszTeraz();
    if (global.document && global.document.body) zapiszWPrzegladarce(wynik);
    return wynik;
  }

  /* Przycisk "Eksport" z lista pozycji; klikniecie pozycji wola funkcje ekranu: obsluga(klucz, format) */
  function menuHtml(id, pozycje, obsluga) {
    var esc = global.esc || function (t) { return tekst(t); };
    return '<details class="eksport-menu" id="' + esc(id) + '"><summary class="btn sm">Eksport</summary><div class="eksport-lista" role="menu">' +
      pozycje.map(function (p) {
        return '<div class="eksport-poz"><span>' + esc(p.etykieta) + '</span>' +
          ["csv", "xlsx"].map(function (f) {
            return '<button type="button" class="btn xs" role="menuitem" onclick="' + obsluga + "('" + p.klucz + "','" + f + "')\">" + (f === "csv" ? "CSV" : "Excel") + "</button>";
          }).join("") + "</div>";
      }).join("") + "</div></details>";
  }

  global.Eksport = { csv: csv, xlsx: xlsx, plik: plik, pobierz: pobierz, menuHtml: menuHtml, komorkaCsv: komorkaCsv, EksportError: EksportError };
})(window);
