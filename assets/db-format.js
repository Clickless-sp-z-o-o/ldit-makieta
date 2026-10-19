/* ============================================================================
   Formatowanie liczb, kwot i dat dla uzytkownika. Wydzielone z db.js,
   ktory udostepnia te funkcje stronom jako DB.fmtPLN, DB.fmtDate itd.
   ============================================================================ */

(function (global) {
  "use strict";

  var fmtPLN = function (n) { return n == null ? "" : Math.round(n).toLocaleString("pl-PL") + " zł"; };
  var fmtPLN2 = function (n) { return n == null ? "" : n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł"; };
  var fmtNum = function (n) { return n == null ? "" : Math.round(n).toLocaleString("pl-PL"); };
  var fmtPct = function (n) { return n == null ? "" : n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "%"; };
  /* Daty w bazie sa w ISO (rrrr-mm-dd), uzytkownik widzi dd.mm.rrrr (D-240) */
  var fmtDate = function (d) {
    if (!d) return "";
    var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
    return m ? m[3] + "." + m[2] + "." + m[1] + m[4].replace("T", " ").slice(0, 6) : String(d);
  };

  /* Zakres dat "od - do" (feedback makiety 19.10.2026: termin szkolenia na liscie wnioskow i w mailach).
     Jeden dzien to jedna data, brak poczatku to pusty tekst, brak konca to sam poczatek. */
  var fmtZakresDat = function (od, dok) {
    if (!od) return "";
    var a = fmtDate(od), b = fmtDate(dok || od);
    return a === b ? a : a + " - " + b;
  };

  global.DBFormat = { fmtPLN: fmtPLN, fmtPLN2: fmtPLN2, fmtNum: fmtNum, fmtPct: fmtPct, fmtDate: fmtDate, fmtZakresDat: fmtZakresDat };
})(window);
