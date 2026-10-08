/* Logika bez DOM: zmiana danych osoby z puli klienta, ktora jest uczestnikiem wnioskow (decyzja P-76, wariant c).
   Uczestnik wniosku nie ma kopii imienia i PESEL, bierze je z puli (D-280), wiec poprawka w karcie klienta
   zmienia dane na wszystkich jego wnioskach. Zanim zapis pojdzie, karta pyta o zgode, a dawne dane trafiaja
   do rejestru zmian (pole po polu) i, gdy konto edytuje Dofinansowania, do przebiegu kazdego wniosku.

   KlientOsoba.zmianaTozsamosci(id, dane) -> { pola: [{ pole, przed, po }], wnioski: [{ id, numer, rozliczony }] }
   KlientOsoba.zapiszZeSladem(klientId, id, dane) -> wynik KlientLogika.zapiszUczestnikaKlienta */
(function (global) {
  "use strict";

  var POLA = [["imie_nazwisko", "Imię i nazwisko"], ["pesel", "PESEL"]];
  var S = function () { return global.Store; };

  function tekst(v) { return v === null || v === undefined ? "" : String(v).trim(); }

  /* Wnioski osoby w zakresie konta (Store pilnuje separacji przez zapytanie po widocznych wnioskach) */
  function wnioskiOsoby(id) {
    var widoczne = (global.DB.WNIOSKI_WSZYSTKIE || []).map(function (w) { return w.id; });
    return S().query("SELECT w.id, w.numer, w.instytucja_id, w.status_finansowy FROM uczestnicy u JOIN wnioski w ON w.id = u.wniosek_id " +
      "WHERE u.uczestnik_klienta_id = ? ORDER BY w.numer", [id])
      .filter(function (w) { return widoczne.indexOf(w.id) >= 0; })
      .map(function (w) { return { id: w.id, numer: w.numer, instytucjaId: w.instytucja_id, rozliczony: w.status_finansowy === "Rozliczone" }; });
  }

  /* PESEL porownujemy tylko, gdy konto moze go zmieniac; puste pole bez tego prawa nie jest zmiana */
  function zmienionePola(przed, dane) {
    return POLA.filter(function (p) {
      if (p[0] === "pesel" && !global.Auth.moze("klient.pesel")) return false;
      return tekst(przed[p[0]]) !== tekst(dane[p[0]]);
    }).map(function (p) { return { pole: p[1], kolumna: p[0], przed: tekst(przed[p[0]]), po: tekst(dane[p[0]]) }; });
  }

  function zmianaTozsamosci(id, dane) {
    var przed = id ? S().find("uczestnicy_klienta", id) : null;
    if (!przed) return { pola: [], wnioski: [] };
    var pola = zmienionePola(przed, dane);
    return { pola: pola, wnioski: pola.length ? wnioskiOsoby(id) : [] };
  }

  /* PESEL w rejestrze i przebiegu tylko jako informacja o zmianie, bez wartosci (dane osobowe) */
  function opisZmiany(p) {
    return p.kolumna === "pesel" ? "PESEL zmieniony" : p.pole + ": " + (p.przed || "brak") + " -> " + (p.po || "brak");
  }

  function zapiszZeSladem(klientId, id, dane) {
    var zmiana = zmianaTozsamosci(id, dane);
    var wynik = global.KlientLogika.zapiszUczestnikaKlienta(klientId, dane, id);
    if (!wynik.ok || !zmiana.pola.length) return wynik;
    var kto = global.Akceptacje.ktoTeraz();
    zmiana.pola.forEach(function (p) {
      S().insert("rejestr_aktywnosci", { czas: kto.czas, kto: kto.imie, typ: "Zmiana danych uczestnika", obiekt: id, pole: p.pole,
        przed: p.kolumna === "pesel" ? "ukryty" : (p.przed || "brak"), po: p.kolumna === "pesel" ? "zmieniony" : (p.po || "brak") }, "AKT-");
    });
    if (!global.Auth.edytujeModul("dofin")) return wynik;
    var komentarz = "Zmiana danych uczestnika w karcie klienta. " + zmiana.pola.map(opisZmiany).join("; ") + ".";
    zmiana.wnioski.forEach(function (w) {
      S().insert("przebieg_wniosku", { wniosek_id: w.id, instytucja_id: w.instytucjaId, rodzaj: "reczny", czas: kto.czas,
        komentarz: komentarz, uzytkownik_id: kto.uzytkownik }, "PRZ-");
    });
    return wynik;
  }

  /* Tresc pytania przed zapisem; null, gdy nie trzeba pytac */
  function pytanie(zmiana) {
    if (!zmiana.pola.length || !zmiana.wnioski.length) return null;
    var rozliczone = zmiana.wnioski.filter(function (w) { return w.rozliczony; }).length;
    return "Ta osoba jest uczestnikiem " + zmiana.wnioski.length + " wniosków" + (rozliczone ? " (w tym " + rozliczone + " rozliczonych)" : "") +
      ": " + zmiana.wnioski.map(function (w) { return "nr " + w.numer; }).join(", ") + ".\n\n" +
      "Zmiana (" + zmiana.pola.map(function (p) { return p.pole; }).join(", ") + ") obejmie też te wnioski i dokumenty, które z nich powstaną. " +
      "Dawne dane zostaną zapisane w historii zmian.\n\nZmienić dane także na wnioskach?";
  }

  global.KlientOsoba = { zmianaTozsamosci: zmianaTozsamosci, zapiszZeSladem: zapiszZeSladem, pytanie: pytanie };
})(window);
