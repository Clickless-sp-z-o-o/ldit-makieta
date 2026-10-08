/* Eksport klienta do pliku i import w innej instytucji (D-282). Ta sama firma w drugiej
   instytucji to osobny klient z wlasnym id i numerem, celowo bez powiazania z pierwszym
   (M-03). Plik niesie dane firmy, pule osob i dodatkowe urzedy; numer, instytucja,
   handlowiec i czarna lista nie przechodza. Zapis idzie przez KlientLogika i Store.
   Uzywaja go karta klienta (19) i Baza danych (04). */
(function (global) {
  "use strict";

  var DOKUMENT = "klient-ldit";

  function KlientEksportError(kod, komunikat) {
    this.name = "KlientEksportError"; this.kod = kod; this.message = komunikat;
  }
  KlientEksportError.prototype = Object.create(Error.prototype);
  KlientEksportError.prototype.constructor = KlientEksportError;

  function dane(klientId) {
    var S = global.Store, L = global.KlientLogika;
    var k = S.find("klienci", klientId);
    if (!k) throw new KlientEksportError("brak_klienta", "Nie ma takiego klienta.");
    var klient = {};
    L.KOLUMNY_KLIENTA.forEach(function (c) { klient[c] = k[c] == null ? null : k[c]; });
    var kolumnyOsob = L.KOLUMNY_UCZESTNIKA.concat(global.Auth.moze("klient.pesel") ? ["pesel"] : []);
    return {
      dokument: DOKUMENT, wyeksportowano: new Date().toISOString(), klient: klient,
      uczestnicy: S.query("SELECT * FROM uczestnicy_klienta WHERE klient_id = ?", [klientId]).map(function (u) {
        var o = {};
        kolumnyOsob.forEach(function (c) { o[c] = u[c]; });
        return o;
      }),
      urzedy: S.query("SELECT pup_id, oddzial FROM klient_urzedy WHERE klient_id = ?", [klientId])
    };
  }

  /* Zwraca {ok, id} albo {ok:false, bledy, kod}. Odmowa straznika (zakres konta, walidacja)
     tez wraca jako blad dla uzytkownika, bo dotyczy danych z pliku. */
  function zaimportuj(plik, instytucjaId) {
    try { return zapiszZPliku(plik, instytucjaId); }
    catch (e) {
      if (!(e instanceof global.Straznik.StraznikError)) throw e;
      return { ok: false, bledy: [e.message], kod: e.kod };
    }
  }

  function zapiszZPliku(plik, instytucjaId) {
    if (!plik || plik.dokument !== DOKUMENT || !plik.klient) return { ok: false, bledy: ["To nie jest plik klienta z eksportu."] };
    if (!instytucjaId) return { ok: false, bledy: ["Wybierz instytucję, do której trafi klient."] };
    var nip = plik.klient.nip;
    if (nip && global.Store.one("SELECT id FROM klienci WHERE instytucja_id = ? AND nip = ?", [instytucjaId, nip])) {
      return { ok: false, bledy: ["Klient o tym NIP jest już w tej instytucji."] };
    }
    /* Caly plik sprawdzony przed pierwszym zapisem, zeby blad w osobie nie zostawil polowy klienta */
    var bledy = global.Walidacja.bledy("klienci", plik.klient).map(function (b) { return "Klient, " + b.pole + ": " + b.komunikat; });
    (plik.uczestnicy || []).forEach(function (u, i) {
      global.Walidacja.bledy("uczestnicy_klienta", u).forEach(function (b) { bledy.push("Osoba " + (i + 1) + ", " + b.pole + ": " + b.komunikat); });
    });
    if (bledy.length) return { ok: false, bledy: bledy, kod: "walidacja" };
    var wynik = global.KlientLogika.utworzKlienta(plik.klient, instytucjaId, plik.uczestnicy || []);
    if (!wynik.ok) return wynik;
    (plik.urzedy || []).forEach(function (u) { global.KlientLogika.dodajUrzadKlienta(wynik.id, u.pup_id, u.oddzial); });
    return wynik;
  }

  function pobierz(klientId) {
    var d = dane(klientId);
    var url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "klient-" + (d.klient.nip || klientId) + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.KlientEksport = { dane: dane, zaimportuj: zaimportuj, pobierz: pobierz, KlientEksportError: KlientEksportError };
})(window);
