/* Zadania: logika bez DOM (D-239, D-246). Przypisywanie, edycja, usuwanie, historia,
   przypomnienia (przypomnij_dni) i siatka mini kalendarza z numerami tygodni ISO.
   Zapisy przechodza przez Store, wiec straznik i walidacja dzialaja jak wszedzie. */
(function (global) {
  var MS_NA_DOBE = 86400000;
  var DNI_W_TYGODNIU = 7;
  var STATUS_OTWARTE = "otwarte";

  function blad(kod, tekst) { var e = new Error(tekst); e.kod = kod; return e; }

  function doUtc(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function zUtc(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function dodajDni(iso, dni) { return zUtc(doUtc(iso) + dni * MS_NA_DOBE); }

  /* Numer tygodnia ISO 8601: tydzien z czwartkiem decyduje o roku */
  function numerTygodniaIso(iso) {
    var ms = doUtc(iso);
    var dzienTygodnia = (new Date(ms).getUTCDay() + 6) % DNI_W_TYGODNIU;
    var czwartek = ms + (3 - dzienTygodnia) * MS_NA_DOBE;
    var rok = new Date(czwartek).getUTCFullYear();
    var pierwszyStycznia = Date.UTC(rok, 0, 1);
    return Math.floor((czwartek - pierwszyStycznia) / MS_NA_DOBE / DNI_W_TYGODNIU) + 1;
  }

  /* Sekcja zadania: historia (zrobione, anulowane), zaplanowane (przed oknem przypomnienia), do zrobienia */
  function sekcja(z, dzis) {
    if (z.status !== STATUS_OTWARTE) return "historia";
    if (z.przypomnij_dni == null || !z.termin) return "doZrobienia";
    return dzis < dodajDni(z.termin, -z.przypomnij_dni) ? "zaplanowane" : "doZrobienia";
  }

  function widoczne(zadania, uzytkownikId, widziWszystkie) {
    return zadania.filter(function (z) { return widziWszystkie || z.przypisane_do === uzytkownikId; });
  }

  function mozeZmieniac(z, uzytkownikId, widziWszystkie) {
    return widziWszystkie || z.przypisane_do === uzytkownikId;
  }

  /* Osoby, ktorym administrator moze przypisac zadanie: aktywne konta LDIT */
  function kontaLdit() {
    var ldit = {};
    global.DB.ROLE.forEach(function (r) { if (r.typ === "pracownik") ldit[r.id] = true; });
    return global.DB.UZYTKOWNICY.filter(function (u) { return ldit[u.rolaId] && !u.zablokowane; });
  }

  /* kontekst: { uzytkownikId, widziWszystkie, dzis } */
  function dodaj(dane, kontekst) {
    var tytul = String(dane.tytul || "").trim();
    if (!tytul) throw blad("walidacja", "Zadanie wymaga tytułu");
    var kto = dane.przypisane_do || kontekst.uzytkownikId;
    if (kto !== kontekst.uzytkownikId && !kontekst.widziWszystkie) {
      throw blad("brak_uprawnien", "Tylko administrator przypisuje zadania innym osobom");
    }
    return global.Store.insert("zadania", {
      tytul: tytul, opis: dane.opis || null, typ: "reczne", wniosek_id: dane.wniosek_id || null,
      termin: dane.termin || null, przypomnij_dni: dane.przypomnij_dni == null ? null : dane.przypomnij_dni,
      przypisane_do: kto, status: STATUS_OTWARTE, utworzono: kontekst.dzis, utworzyl_id: kontekst.uzytkownikId
    }, "ZAD-");
  }

  function znajdz(id) {
    var z = global.Store.find("zadania", id);
    if (!z) throw blad("brak_rekordu", "Nie ma takiego zadania");
    return z;
  }

  function zmien(id, patch, kontekst) {
    var z = znajdz(id);
    if (!mozeZmieniac(z, kontekst.uzytkownikId, kontekst.widziWszystkie)) throw blad("brak_uprawnien", "To nie jest Twoje zadanie");
    if (patch.przypisane_do && patch.przypisane_do !== kontekst.uzytkownikId && !kontekst.widziWszystkie) {
      throw blad("brak_uprawnien", "Tylko administrator przypisuje zadania innym osobom");
    }
    if (patch.tytul != null && !String(patch.tytul).trim()) throw blad("walidacja", "Zadanie wymaga tytułu");
    return global.Store.update("zadania", id, patch);
  }

  function usun(id, kontekst) {
    var z = znajdz(id);
    if (!mozeZmieniac(z, kontekst.uzytkownikId, kontekst.widziWszystkie)) throw blad("brak_uprawnien", "To nie jest Twoje zadanie");
    return global.Store.remove("zadania", id);
  }

  /* Siatka miesiaca: tygodnie od poniedzialku, kazdy z numerem ISO i liczba zadan w dniu */
  function siatkaMiesiaca(rok, mies, zadania) {
    var poDniu = {};
    zadania.forEach(function (z) { if (z.termin && z.status === STATUS_OTWARTE) poDniu[z.termin] = (poDniu[z.termin] || 0) + 1; });
    var pierwszy = Date.UTC(rok, mies, 1);
    var przesun = (new Date(pierwszy).getUTCDay() + 6) % DNI_W_TYGODNIU;
    var dniMies = new Date(Date.UTC(rok, mies + 1, 0)).getUTCDate();
    var tygodni = Math.ceil((przesun + dniMies) / DNI_W_TYGODNIU);
    var wynik = [];
    for (var t = 0; t < tygodni; t++) {
      var dni = [];
      for (var d = 0; d < DNI_W_TYGODNIU; d++) {
        var iso = zUtc(pierwszy + (t * DNI_W_TYGODNIU + d - przesun) * MS_NA_DOBE);
        dni.push({ iso: iso, dzien: +iso.slice(8), poza: +iso.slice(5, 7) !== mies + 1, zadan: poDniu[iso] || 0,
                   zadania: zadaniaDnia(zadania, iso) });
      }
      wynik.push({ tydzien: numerTygodniaIso(dni[0].iso), dni: dni });
    }
    return wynik;
  }

  /* Kalendarz zadan w trzech widokach: zadania z terminem w danym dniu, w kolejnosci tytulow */
  function zadaniaDnia(zadania, iso) {
    return zadania.filter(function (z) { return z.termin === iso; })
      .sort(function (a, b) { return String(a.tytul).localeCompare(String(b.tytul), "pl"); });
  }

  function poczatekTygodnia(iso) {
    var dzienTygodnia = (new Date(doUtc(iso)).getUTCDay() + 6) % DNI_W_TYGODNIU;
    return dodajDni(iso, -dzienTygodnia);
  }

  /* Tydzien od poniedzialku z numerem ISO; kazdy dzien z lista swoich zadan */
  function siatkaTygodnia(iso, zadania) {
    var start = poczatekTygodnia(iso), dni = [];
    for (var d = 0; d < DNI_W_TYGODNIU; d++) {
      var dzien = dodajDni(start, d);
      dni.push({ iso: dzien, dzien: +dzien.slice(8), zadania: zadaniaDnia(zadania, dzien) });
    }
    return { tydzien: numerTygodniaIso(start), od: start, do: dni[DNI_W_TYGODNIU - 1].iso, dni: dni };
  }

  /* Przesuniecie widoku o jeden okres: miesiac, tydzien albo dzien. Dzien miesiaca 1, zeby luty nie przeskoczyl */
  function przesunOkres(widok, iso, kierunek) {
    if (widok === "tydzien") return dodajDni(iso, kierunek * DNI_W_TYGODNIU);
    if (widok === "dzien") return dodajDni(iso, kierunek);
    var rok = +iso.slice(0, 4), mies = +iso.slice(5, 7) - 1 + kierunek;
    return zUtc(Date.UTC(rok, mies, 1));
  }

  /* Dokad prowadzi zadanie: karta wniosku, a bez wniosku edycja zadania na tym ekranie */
  function szczegolyZadania(z) {
    return z.wniosek_id ? { rodzaj: "wniosek", adres: "03-wniosek.html?id=" + encodeURIComponent(z.wniosek_id) } : { rodzaj: "edycja", id: z.id };
  }

  global.Zadania18 = {
    numerTygodniaIso: numerTygodniaIso, sekcja: sekcja, dodajDni: dodajDni, widoczne: widoczne,
    mozeZmieniac: mozeZmieniac, kontaLdit: kontaLdit, dodaj: dodaj, zmien: zmien, usun: usun,
    siatkaMiesiaca: siatkaMiesiaca, zadaniaDnia: zadaniaDnia, poczatekTygodnia: poczatekTygodnia,
    siatkaTygodnia: siatkaTygodnia, przesunOkres: przesunOkres, szczegolyZadania: szczegolyZadania
  };
})(typeof window !== "undefined" ? window : this);
