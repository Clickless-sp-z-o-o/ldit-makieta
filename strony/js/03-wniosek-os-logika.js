/* Logika bez DOM: os czasu wniosku z wpisow przebiegu i zadan z terminem (D-263).
   Pozycje z reczna kolejnoscia (kolumna pozycja) ida pierwsze, w tej kolejnosci. Pozycje
   bez niej (NULL) ida po nich, chronologicznie. Zmiana kolejnosci zapisuje pozycje wszystkich
   elementow osi, wiec kolejnosc jest jednoznaczna. Zapis idzie przez Store. */
(function (global) {
  "use strict";

  var S = global.Store;
  var PRZYPOMNIENIE_DNI = 1;   /* zadanie z osi czasu przypomina dzien przed terminem (D-263) */
  var DLUGOSC_DATY = 10;

  function blad(tekst) { return { ok: false, bledy: [tekst] }; }

  function czasPozycji(p) { return String(p.czas || "").slice(0, DLUGOSC_DATY); }

  function porownaj(a, b) {
    var aReczna = a.pozycja != null, bReczna = b.pozycja != null;
    if (aReczna !== bReczna) return aReczna ? -1 : 1;
    if (aReczna) return a.pozycja - b.pozycja;
    return a.czas < b.czas ? -1 : a.czas > b.czas ? 1 : 0;
  }

  /* [{ rodzaj: "przebieg" | "zadanie", id, czas, pozycja, tytul, opis, status, wiersz }] w kolejnosci osi */
  function os(wniosekId) {
    var przebieg = S.query("SELECT * FROM przebieg_wniosku WHERE wniosek_id = ?", [wniosekId]).map(function (p) {
      return { rodzaj: "przebieg", id: p.id, czas: czasPozycji(p), pozycja: p.pozycja, wiersz: p };
    });
    var zadania = S.query("SELECT * FROM zadania WHERE wniosek_id = ? AND typ = 'reczne' AND przypomnij_dni IS NOT NULL",
      [wniosekId]).map(function (z) {
      return { rodzaj: "zadanie", id: z.id, czas: String(z.termin || "").slice(0, DLUGOSC_DATY), pozycja: z.pozycja, wiersz: z };
    });
    return przebieg.concat(zadania).sort(porownaj);
  }

  function tabelaPozycji(p) { return p.rodzaj === "przebieg" ? "przebieg_wniosku" : "zadania"; }

  function zapiszKolejnosc(lista) {
    lista.forEach(function (p, i) {
      if (p.pozycja !== i + 1) S.update(tabelaPozycji(p), p.id, { pozycja: i + 1 });
    });
  }

  /* kierunek: -1 w gore, 1 w dol. Na brzegu osi nic sie nie zmienia. */
  function przesun(wniosekId, rodzaj, id, kierunek) {
    var lista = os(wniosekId);
    var i = lista.findIndex(function (p) { return p.rodzaj === rodzaj && p.id === id; });
    if (i < 0) return blad("Nie znaleziono pozycji na osi czasu.");
    var j = i + kierunek;
    if (j < 0 || j >= lista.length) return { ok: true, zmiana: false };
    var pozycja = lista[i];
    lista[i] = lista[j];
    lista[j] = pozycja;
    lista.forEach(function (p) { p.pozycja = null; });   /* wymusza zapis wszystkich pozycji po zamianie */
    zapiszKolejnosc(lista);
    return { ok: true, zmiana: true };
  }

  function maReczneUlozenie(wniosekId) {
    return os(wniosekId).some(function (p) { return p.pozycja != null; });
  }

  /* Zadanie z terminem na osi czasu: trafia do tabeli zadania z przypomnieniem dzien przed.
     Gdy kolejnosc byla juz ustawiana recznie, nowe zadanie ida na koniec osi. */
  function dodajZadanie(wniosekId, dane) {
    var wynik = global.WniosekLogika.dodajNotatkeZTerminem(wniosekId, {
      tytul: dane.tytul, termin: dane.termin, opis: dane.opis,
      przypomnijDni: dane.przypomnijDni == null || dane.przypomnijDni === "" ? PRZYPOMNIENIE_DNI : dane.przypomnijDni
    });
    if (!wynik.ok) return wynik;
    if (maReczneUlozenie(wniosekId)) {
      var lista = os(wniosekId).filter(function (p) { return p.id !== wynik.id; });
      S.update("zadania", wynik.id, { pozycja: lista.length + 1 });
    }
    return wynik;
  }

  global.OsCzasu = { PRZYPOMNIENIE_DNI: PRZYPOMNIENIE_DNI, os: os, przesun: przesun, dodajZadanie: dodajZadanie, maReczneUlozenie: maReczneUlozenie };
})(window);
