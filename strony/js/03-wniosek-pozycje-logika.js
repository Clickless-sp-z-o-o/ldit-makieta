/* Logika bez DOM: pozycja szkolenia we wniosku = szkolenie + termin (spotkanie 14.10.2026).
   - termin pozycji (data od, data do) zapisuje sie w kalendarzu: wiersz w tabeli terminy tej instytucji
     i szkolenia (znaleziony albo nowy, status Zaplanowany), wniosek_szkolenia.termin_id oraz
     uczestnik_szkolenia.termin_id wszystkich uczestnikow pozycji; zmiana dat zmienia termin uzywany tylko
     przez te pozycje, a termin wspolny z innym wnioskiem zostawia i przenosi uczestnikow na nowy,
   - uczestnicy pozycji wybierani z puli klienta: zaznaczenie dodaje osobe do wniosku i tworzy jej
     szkolenie w tej pozycji z cena pozycji, odznaczenie usuwa to szkolenie (osoba bez szkolen znika
     z wniosku, zostaje u klienta).
   Zapis idzie przez Store (straznik, walidacja), zmiany trafiaja do rejestru aktywnosci.
   Bledy wejscia wracaja jako { ok: false, bledy: [...] }. Wymaga SzkoleniaWniosku i WniosekLogika. */
(function (global) {
  "use strict";

  var S = global.Store;
  var WZOR_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  var WZOR_PL = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  var BLAD_DATY = "Data w formacie RRRR-MM-DD albo DD.MM.RRRR, np. 2026-11-12.";

  function SZ() { return global.SzkoleniaWniosku; }
  function W() { return global.WniosekLogika; }
  function blad(tekst) { return { ok: false, bledy: [tekst] }; }
  function pusty(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function dwa(n) { return String(n).padStart(2, "0"); }

  /* Data z pola: ISO z pola typu date albo zapis polski; "" dla pustego pola, null dla blednej daty */
  function normujDate(tekst) {
    if (pusty(tekst)) return "";
    var t = String(tekst).trim(), m = t.match(WZOR_ISO), r, mies, d;
    if (m) { r = +m[1]; mies = +m[2]; d = +m[3]; } else if ((m = t.match(WZOR_PL))) { r = +m[3]; mies = +m[2]; d = +m[1]; } else return null;
    var data = new Date(Date.UTC(r, mies - 1, d));
    if (data.getUTCFullYear() !== r || data.getUTCMonth() !== mies - 1 || data.getUTCDate() !== d) return null;
    return r + "-" + dwa(mies) + "-" + dwa(d);
  }

  function pozycja(wsId) { return S.find("wniosek_szkolenia", wsId); }

  /* Szkolenia uczestnikow pozycji z osoba z puli klienta */
  function uczestnicyPozycji(wsId) {
    return S.query("SELECT s.id AS us, s.termin_id AS termin, u.uczestnik_klienta_id AS k FROM uczestnik_szkolenia s " +
      "JOIN uczestnicy u ON u.id = s.uczestnik_id WHERE s.wniosek_szkolenie_id = ? ORDER BY s.id", [wsId]);
  }

  /* Pozycje wniosku z terminem i osobami (id z puli klienta), w kolejnosci dodania */
  function pozycjeWniosku(wniosekId) {
    return SZ().szkoleniaWniosku(wniosekId).map(function (ws) {
      return { id: ws.id, szkolenie: ws.szkolenie_id, nazwa: (SZ().szkolenieKatalogu(ws.szkolenie_id) || {}).nazwa || ws.szkolenie_id,
               cena: ws.cena, od: ws.data_od || null, do: ws.data_do || ws.data_od || null, termin: ws.termin_id || null,
               osoby: uczestnicyPozycji(ws.id).map(function (r) { return r.k; }) };
    });
  }

  /* Termin w kalendarzu dla pozycji: ten sam wiersz terminy (instytucja, szkolenie, daty) albo nowy.
     Wolny termin instytucji uzyty przez wniosek staje sie Zaplanowany. */
  function terminDlaPozycji(ws, od, doDnia) {
    var t = S.one("SELECT id, status_realizacji AS st FROM terminy WHERE instytucja_id = ? AND szkolenie_id = ? AND data_od = ? " +
      "AND COALESCE(data_do, data_od) = ? ORDER BY CASE status_realizacji WHEN 'Zaplanowany' THEN 0 WHEN 'Wolny' THEN 1 ELSE 2 END, id LIMIT 1",
      [ws.instytucja_id, ws.szkolenie_id, od, doDnia]);
    if (t) {
      if (t.st === "Wolny") S.update("terminy", t.id, { status_realizacji: "Zaplanowany" });
      return t.id;
    }
    var kat = SZ().szkolenieKatalogu(ws.szkolenie_id);
    return S.insert("terminy", { instytucja_id: ws.instytucja_id, szkolenie_id: ws.szkolenie_id, nazwa: kat ? kat.nazwa : null,
      data_od: od, data_do: doDnia, status_realizacji: "Zaplanowany", zapisani: 0 }, "TR-").id;
  }

  /* Zmiana dat zmienia termin w kalendarzu (decyzja 15.10.2026): gdy dotychczasowy termin pozycji nie jest
     uzywany przez inny wniosek ani innych uczestnikow, dostaje nowe daty i stary nie zostaje w kalendarzu.
     Termin wspolny z innym wnioskiem zostaje bez zmian, a pozycja przechodzi na termin z nowymi datami. */
  function przesunTermin(ws, od, doDnia) {
    if (!ws.termin_id) return null;
    var inni = S.one("SELECT (SELECT COUNT(*) FROM wniosek_szkolenia WHERE termin_id = ? AND id <> ?) + " +
      "(SELECT COUNT(*) FROM uczestnik_szkolenia WHERE termin_id = ? AND COALESCE(wniosek_szkolenie_id, '') <> ?) AS n",
      [ws.termin_id, ws.id, ws.termin_id, ws.id]);
    if (!inni || inni.n > 0 || !S.find("terminy", ws.termin_id)) return null;
    S.update("terminy", ws.termin_id, { data_od: od, data_do: doDnia });
    return ws.termin_id;
  }

  /* Ustawia termin pozycji. Puste obie daty czyszcza termin. Pusta data do = jeden dzien (data od). */
  function ustawTermin(wsId, odTekst, doTekst) {
    var ws = pozycja(wsId);
    if (!ws || !SZ().wniosekWZakresie(ws.wniosek_id)) return blad("Nie znaleziono szkolenia projektu.");
    var od = normujDate(odTekst), doDnia = normujDate(doTekst);
    if (od === null || doDnia === null) return blad(BLAD_DATY);
    if (od === "" && doDnia !== "") return blad("Podaj datę od.");
    if (od !== "" && doDnia === "") doDnia = od;
    if (od !== "" && doDnia < od) return blad("Data do nie może być wcześniejsza niż data od.");
    var stary = SZ().opisTerminu(ws.data_od, ws.data_do);
    if ((ws.data_od || "") === od && (ws.data_do || ws.data_od || "") === doDnia && (!od || ws.termin_id)) return { ok: true, zmiana: false, terminId: ws.termin_id };
    var terminId = od ? (przesunTermin(ws, od, doDnia) || terminDlaPozycji(ws, od, doDnia)) : null;
    S.update("wniosek_szkolenia", ws.id, { data_od: od || null, data_do: od ? doDnia : null, termin_id: terminId });
    var przeniesieni = 0;
    uczestnicyPozycji(ws.id).forEach(function (r) {
      if (r.termin === terminId) return;
      S.update("uczestnik_szkolenia", r.us, { termin_id: terminId });
      przeniesieni++;
    });
    SZ().rejestr("Zmiana pola", ws.wniosek_id, "Termin szkolenia: " + ((SZ().szkolenieKatalogu(ws.szkolenie_id) || {}).nazwa || ws.szkolenie_id),
      stary, SZ().opisTerminu(od, doDnia));
    return { ok: true, zmiana: true, terminId: terminId, przeniesiono: przeniesieni };
  }

  /* Uczestnicy pozycji = dokladnie wybrane osoby z puli klienta wniosku */
  function ustawUczestnikow(wsId, idKlienta) {
    var ws = pozycja(wsId);
    var w = ws ? SZ().wniosekWZakresie(ws.wniosek_id) : null;
    if (!w) return blad("Nie znaleziono szkolenia projektu.");
    var wybrani = (idKlienta || []).filter(function (id, i, a) { return a.indexOf(id) === i; });
    var pula = W().uczestnicyKlienta(w.klient).map(function (u) { return u.id; });
    if (wybrani.some(function (id) { return pula.indexOf(id) < 0; })) return blad("Uczestnik nie należy do klienta tego projektu.");
    var obecni = uczestnicyPozycji(ws.id);
    var doDodania = wybrani.filter(function (id) { return !obecni.some(function (r) { return r.k === id; }); });
    var doUsuniecia = obecni.filter(function (r) { return wybrani.indexOf(r.k) < 0; });
    if (doDodania.length) {
      var wynik = W().dodajUczestnikowDoWniosku(w, doDodania, ws.id);
      if (!wynik.ok) return wynik;
    }
    doUsuniecia.forEach(function (r) { W().usunUczestnikaZWniosku(r.us); });
    if (doDodania.length || doUsuniecia.length) {
      SZ().rejestr("Zmiana pola", w.id, "Uczestnicy szkolenia: " + SZ().nazwaPozycji(ws), obecni.length + " os.",
        wybrani.length + " os. (dodano " + doDodania.length + ", usunięto " + doUsuniecia.length + ")");
    }
    return { ok: true, dodano: doDodania.length, usunieto: doUsuniecia.length };
  }

  global.PozycjeWniosku = {
    normujDate: normujDate, pozycjeWniosku: pozycjeWniosku, uczestnicyPozycji: uczestnicyPozycji,
    ustawTermin: ustawTermin, ustawUczestnikow: ustawUczestnikow
  };
})(window);
