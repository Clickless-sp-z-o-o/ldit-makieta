/* Logika bez DOM: szkolenia wniosku z cena ustalona w tym wniosku (D-264), kwota dla wszystkich
   uczestnikow (D-263), opiekunowie wniosku (D-260) i konta LDIT do wyboru. Wspolna dla karty
   wniosku i okna nowego projektu na liscie. Zapis idzie przez Store (straznik, walidacja),
   zmiany wartosci trafiaja do rejestru aktywnosci. Bledy wejscia wracaja jako
   { ok: false, bledy: [...] }. */
(function (global) {
  "use strict";

  var S = global.Store;
  var BLAD_KWOTY = "Kwota to liczba nie mniejsza niż 0, np. 4500 albo 4500,50.";

  function pusty(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function blad(tekst) { return { ok: false, bledy: [tekst] }; }

  /* Kwota z pola tekstowego albo liczby; null, gdy tekst nie jest kwota nieujemna */
  function parsujKwote(tekst) {
    if (typeof tekst === "number") return isFinite(tekst) && tekst >= 0 ? tekst : null;
    var k = String(tekst == null ? "" : tekst).replace(/\s/g, "").replace(",", ".");
    return /^\d+(\.\d{1,2})?$/.test(k) ? parseFloat(k) : null;
  }

  function rejestr(typ, obiekt, pole, przed, po) {
    var kto = global.Akceptacje.ktoTeraz();
    S.insert("rejestr_aktywnosci", {
      czas: kto.czas, kto: kto.imie, typ: typ, obiekt: obiekt, pole: pole,
      przed: pusty(przed) ? "brak" : String(przed), po: pusty(po) ? "brak" : String(po)
    }, "AKT-");
  }

  /* ---------- Konta LDIT (Przygotowal, Opiekunowie), tylko w zakresie konta ---------- */
  function kontaLdit() {
    var zakresLdit = global.DB.ROLE.filter(function (r) { return r.typ === "pracownik"; }).map(function (r) { return r.id; });
    var loginy = global.DB.UZYTKOWNICY.filter(function (u) { return zakresLdit.indexOf(u.rolaId) >= 0; })
      .map(function (u) { return u.login; });
    return S.get("uzytkownicy")
      .filter(function (u) { return loginy.indexOf(u.login) >= 0; })
      .map(function (u) { return { id: u.id, imie: u.imie_nazwisko }; });
  }

  /* ---------- Szkolenia wniosku ---------- */
  function szkoleniaWniosku(wniosekId) {
    return S.query("SELECT * FROM wniosek_szkolenia WHERE wniosek_id = ? ORDER BY id", [wniosekId]);
  }

  function szkolenieKatalogu(szkolenieId) {
    return global.DB.SZKOLENIA.filter(function (s) { return s.id === szkolenieId; })[0] || null;
  }

  function szkoleniaInstytucji(instytucjaId) {
    return global.DB.SZKOLENIA.filter(function (s) { return s.is === instytucjaId; });
  }

  /* ---------- Lista cen szkolenia (D-277): nowa kwota trafia do cennika po potwierdzeniu (R-11) ---------- */
  function czyNowaCena(szkolenieId, cena) {
    return cena !== null && !S.one("SELECT 1 AS x FROM ceny_szkolen WHERE szkolenie_id = ? AND cena = ?", [szkolenieId, cena]);
  }

  function dopiszCene(szkolenieId, cena) {
    var sz = szkolenieKatalogu(szkolenieId);
    if (!sz || !czyNowaCena(szkolenieId, cena)) return false;
    var kto = global.Akceptacje.ktoTeraz();
    S.insert("ceny_szkolen", { szkolenie_id: szkolenieId, instytucja_id: sz.is, cena: cena, zrodlo: "wniosek",
                                dodano: kto.czas.slice(0, 10), dodal_id: kto.uzytkownik }, "CS-");
    return true;
  }

  /* Cena szkolenia w tym wniosku, a gdy wniosek go nie ma, cena z katalogu (tylko wartosc domyslna) */
  function cenaWniosku(wniosekId, szkolenieId) {
    var r = S.one("SELECT cena FROM wniosek_szkolenia WHERE wniosek_id = ? AND szkolenie_id = ?", [wniosekId, szkolenieId]);
    if (r) return r.cena;
    var s = szkolenieKatalogu(szkolenieId);
    return s && s.cena != null ? s.cena : 0;
  }

  function wniosekWZakresie(wniosekId) {
    return global.DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.id === wniosekId; })[0] || null;
  }

  /* opcje.dopiszDoCennika: nowa kwota trafia na liste cen szkolenia (potwierdzenie w interfejsie) */
  function dodajSzkolenie(wniosekId, szkolenieId, cenaTekst, opcje) {
    var w = wniosekWZakresie(wniosekId);
    if (!w) return blad("Nie znaleziono wniosku.");
    var sz = szkolenieKatalogu(szkolenieId);
    if (!sz || sz.is !== w.is) return blad("Szkolenie nie należy do katalogu instytucji tego projektu.");
    var cena = pusty(cenaTekst) ? parsujKwote(sz.cena || 0) : parsujKwote(cenaTekst);
    if (cena === null) return blad(BLAD_KWOTY);
    if (szkoleniaWniosku(wniosekId).some(function (r) { return r.szkolenie_id === szkolenieId; })) {
      return blad("To szkolenie jest już w projekcie.");
    }
    var wiersz = S.insert("wniosek_szkolenia", { wniosek_id: wniosekId, instytucja_id: w.is, szkolenie_id: szkolenieId, cena: cena }, "WS-");
    if (opcje && opcje.dopiszDoCennika) dopiszCene(szkolenieId, cena);
    if (!S.find("wnioski", wniosekId).szkolenie_glowne_id) S.update("wnioski", wniosekId, { szkolenie_glowne_id: szkolenieId });
    rejestr("Zmiana pola", wniosekId, "Szkolenie projektu", "brak", sz.nazwa + ", " + cena);
    return { ok: true, id: wiersz.id, cena: cena };
  }

  function zmienCeneSzkolenia(wsId, cenaTekst, opcje) {
    var ws = S.find("wniosek_szkolenia", wsId);
    if (!ws) return blad("Nie znaleziono szkolenia projektu.");
    var cena = parsujKwote(cenaTekst);
    if (cena === null) return blad(BLAD_KWOTY);
    if (cena === ws.cena) return { ok: true, cena: cena, zmiana: false };
    S.update("wniosek_szkolenia", wsId, { cena: cena });
    if (opcje && opcje.dopiszDoCennika) dopiszCene(ws.szkolenie_id, cena);
    rejestr("Zmiana pola", ws.wniosek_id, "Cena szkolenia: " + (szkolenieKatalogu(ws.szkolenie_id) || {}).nazwa, ws.cena, cena);
    return { ok: true, cena: cena, zmiana: true };
  }

  function usunSzkolenie(wsId) {
    var ws = S.find("wniosek_szkolenia", wsId);
    if (!ws) return blad("Nie znaleziono szkolenia projektu.");
    var uzyte = S.query("SELECT COUNT(*) AS n FROM uczestnik_szkolenia WHERE wniosek_szkolenie_id = ?", [ws.id])[0].n;
    if (uzyte > 0) return blad("To szkolenie ma przypisanych uczestników (" + uzyte + "). Najpierw zmień im szkolenie.");
    S.remove("wniosek_szkolenia", wsId);
    var wniosek = S.find("wnioski", ws.wniosek_id);
    if (wniosek.szkolenie_glowne_id === ws.szkolenie_id) {
      var inne = szkoleniaWniosku(ws.wniosek_id)[0];
      S.update("wnioski", ws.wniosek_id, { szkolenie_glowne_id: inne ? inne.szkolenie_id : null });
    }
    rejestr("Zmiana pola", ws.wniosek_id, "Szkolenie projektu", (szkolenieKatalogu(ws.szkolenie_id) || {}).nazwa, "usunięte z projektu");
    return { ok: true };
  }

  /* ---------- Kwota dla wszystkich uczestnikow (D-263) ----------
     opcje.szkolenieId: tylko uczestnicy tego szkolenia. Kwota pusta = cena szkolenia wniosku. */
  function zastosujKwote(wniosekId, kwotaTekst, opcje) {
    var szkolenieId = opcje && opcje.szkolenieId ? opcje.szkolenieId : null;
    var kwota = pusty(kwotaTekst) && szkolenieId ? cenaWniosku(wniosekId, szkolenieId) : parsujKwote(kwotaTekst);
    if (kwota === null) return blad(BLAD_KWOTY);
    var cel = S.query("SELECT s.id, s.cena AS kwota FROM uczestnik_szkolenia s JOIN wniosek_szkolenia ws ON ws.id = s.wniosek_szkolenie_id " +
      "WHERE s.wniosek_id = ?" + (szkolenieId ? " AND ws.szkolenie_id = ?" : ""), szkolenieId ? [wniosekId, szkolenieId] : [wniosekId]);
    if (!cel.length) return blad("Brak uczestników, którym można ustawić kwotę.");
    var zmienieni = cel.filter(function (u) { return u.kwota !== kwota; });
    zmienieni.forEach(function (u) { S.update("uczestnik_szkolenia", u.id, { cena: kwota }); });
    if (zmienieni.length) {
      var partia = "PART-" + Date.now();
      var kto = global.Akceptacje.ktoTeraz();
      S.insert("rejestr_aktywnosci", {
        czas: kto.czas, kto: kto.imie, typ: "Zmiana zbiorcza", obiekt: wniosekId,
        pole: "Kwota uczestników (" + zmienieni.length + " z " + cel.length + ")", przed: "różne", po: String(kwota), partia: partia
      }, "AKT-");
    }
    return { ok: true, zmieniono: zmienieni.length, kwota: kwota };
  }

  /* ---------- Opiekunowie wniosku: wybor wielokrotny (D-260) ---------- */
  function opiekunowieWniosku(wniosekId) {
    return S.query("SELECT uzytkownik_id AS u FROM wniosek_opiekunowie WHERE wniosek_id = ?", [wniosekId])
      .map(function (r) { return r.u; });
  }

  function nazwaKonta(id) {
    var k = kontaLdit().filter(function (x) { return x.id === id; })[0];
    return k ? k.imie : id;
  }

  function usunOpiekuna(wniosekId, uzytkownikId) {
    var wiersz = S.one("SELECT id FROM wniosek_opiekunowie WHERE wniosek_id = ? AND uzytkownik_id = ?", [wniosekId, uzytkownikId]);
    if (!wiersz) return false;
    S.remove("wniosek_opiekunowie", wiersz.id);
    return true;
  }

  function ustawOpiekunow(wniosekId, nowaLista) {
    if (!wniosekWZakresie(wniosekId)) return blad("Nie znaleziono wniosku.");
    var dozwolone = kontaLdit().map(function (k) { return k.id; });
    if (nowaLista.some(function (id) { return dozwolone.indexOf(id) < 0; })) return blad("Opiekunem może być tylko konto LDIT.");
    var obecna = opiekunowieWniosku(wniosekId);
    var doUsuniecia = obecna.filter(function (id) { return nowaLista.indexOf(id) < 0; });
    var doDodania = nowaLista.filter(function (id) { return obecna.indexOf(id) < 0; });
    doUsuniecia.forEach(function (id) { usunOpiekuna(wniosekId, id); });
    doDodania.forEach(function (id) { S.insert("wniosek_opiekunowie", { wniosek_id: wniosekId, uzytkownik_id: id }, "WO-"); });
    if (doUsuniecia.length || doDodania.length) {
      rejestr("Zmiana pola", wniosekId, "Opiekunowie", obecna.map(nazwaKonta).join(", "), nowaLista.map(nazwaKonta).join(", "));
    }
    return { ok: true, dodano: doDodania.length, usunieto: doUsuniecia.length };
  }

  global.SzkoleniaWniosku = {
    parsujKwote: parsujKwote, rejestr: rejestr, kontaLdit: kontaLdit, szkoleniaWniosku: szkoleniaWniosku,
    szkoleniaInstytucji: szkoleniaInstytucji, szkolenieKatalogu: szkolenieKatalogu, cenaWniosku: cenaWniosku,
    czyNowaCena: czyNowaCena, dopiszCene: dopiszCene,
    dodajSzkolenie: dodajSzkolenie, zmienCeneSzkolenia: zmienCeneSzkolenia, usunSzkolenie: usunSzkolenie,
    zastosujKwote: zastosujKwote, opiekunowieWniosku: opiekunowieWniosku, ustawOpiekunow: ustawOpiekunow
  };
})(window);
