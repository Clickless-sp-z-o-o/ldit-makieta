/* ============================================================================
   Zrzuty arkusza naborow (D-333): odczyt.

   Kazde pobranie arkusza Google to zrzut w tabeli src_ z jedna data wczytania. Ekran
   domyslnie pokazuje biezacy stan naborow (najnowsze zrzuty), a filtr "Zrzut z dnia"
   pozwala obejrzec jeden z zachowanych zrzutow tak, jak wygladal arkusz tamtego dnia.
   Zapis i retencje robi assets/nabory-import.js; tu jest tylko odczyt.

   API:  NaboryZrzuty.lista()        -> [{klucz, rodzaj, wczytano, plik, wierszy, najnowszy}] od najnowszego
         NaboryZrzuty.nabory(klucz)  -> nabory zrzutu w ksztalcie DB.NABORY (bez urzedow spoza slownika)
         NaboryZrzuty.ostatniePobranie() -> data najnowszego zrzutu albo null
         NaboryZrzuty.fmtCzas(iso)   -> "dd.mm.rrrr gg:mm" w czasie lokalnym (zapis jest w UTC)
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store, I = global.NaboryImport;
  if (!S || !I) throw new Error("Brak window.Store albo window.NaboryImport. Dolacz je przed nabory-zrzuty.js");

  var SEPARATOR = "|";
  var MS_NA_DOBE = 86400000;

  function NaboryZrzutyError(kod, komunikat) {
    this.name = "NaboryZrzutyError"; this.kod = kod; this.message = komunikat;
  }
  NaboryZrzutyError.prototype = Object.create(Error.prototype);
  NaboryZrzutyError.prototype.constructor = NaboryZrzutyError;

  function lista() {
    var wynik = [];
    Object.keys(I.RODZAJE).forEach(function (rodzaj) {
      var zrzuty = S.query("SELECT wczytano, MAX(plik_zrodlowy) AS plik, COUNT(*) AS wierszy FROM " + I.RODZAJE[rodzaj].tabela +
                           " GROUP BY wczytano ORDER BY wczytano DESC");
      zrzuty.forEach(function (z, i) {
        wynik.push({ klucz: rodzaj + SEPARATOR + z.wczytano, rodzaj: rodzaj, wczytano: z.wczytano, plik: z.plik,
                     wierszy: z.wierszy, najnowszy: i === 0 });
      });
    });
    return wynik.sort(function (a, b) { return a.wczytano < b.wczytano ? 1 : a.wczytano > b.wczytano ? -1 : 0; });
  }

  function ostatniePobranie() {
    var l = lista();
    return l.length ? l[0].wczytano : null;
  }

  function dwieCyfry(n) { return (n < 10 ? "0" : "") + n; }
  function fmtCzas(iso) {
    var d = new Date(iso);
    return dwieCyfry(d.getDate()) + "." + dwieCyfry(d.getMonth() + 1) + "." + d.getFullYear() + " " +
      dwieCyfry(d.getHours()) + ":" + dwieCyfry(d.getMinutes());
  }

  function liczbaDni(od, d) {
    return od && d ? Math.round((new Date(d) - new Date(od)) / MS_NA_DOBE) + 1 : null;
  }

  /* Ten sam ksztalt co DBNabory.naboryView, zeby tabela ekranu pokazala zrzut bez zmian */
  function widokNaboru(n, surowy) {
    var u = S.find("urzedy_pracy", n.pup_id);
    return {
      id: surowy.id, pupId: n.pup_id, pup: u.nazwa, woj: u.wojewodztwo, powiat: u.powiat,
      rodzaj: n.rodzaj, status: n.status, od: n.data_od, do: n.data_do, dni: liczbaDni(n.data_od, n.data_do),
      prognoza: n.prognoza_opis, deficytWoj: n.deficyt_wojewodzki, deficytPow: n.deficyt_powiatowy,
      weryfikacja: n.data_weryfikacji, srodki: n.srodki, link: n.link, podsumowanie: n.podsumowanie, zrodlo: surowy.id
    };
  }

  function nabory(klucz) {
    var czesci = String(klucz || "").split(SEPARATOR);
    var def = I.RODZAJE[czesci[0]];
    if (!def || !czesci[1]) throw new NaboryZrzutyError("zly_zrzut", "Nie ma takiego zrzutu arkusza naborów.");
    var wiersze = S.query("SELECT * FROM " + def.tabela + " WHERE wczytano = ? ORDER BY id", [czesci[1]]);
    if (!wiersze.length) throw new NaboryZrzutyError("zly_zrzut", "Zrzut z tego dnia został już usunięty z bazy.");
    return wiersze.map(function (w) {
      var n = I.naborZeZrodla(czesci[0], w);
      return n ? widokNaboru(n, w) : null;
    }).filter(Boolean);
  }

  global.NaboryZrzuty = { lista: lista, nabory: nabory, ostatniePobranie: ostatniePobranie, fmtCzas: fmtCzas, NaboryZrzutyError: NaboryZrzutyError };
})(window);
