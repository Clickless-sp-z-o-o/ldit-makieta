/* Logika karty wniosku bez DOM: uczestnicy wybierani z listy klienta (D-236, D-280), szkolenia uczestnika
   z cena, terminem i kwalifikacja (D-237, D-279), konta LDIT do pola "Przygotowal" (D-233, w szkolenia-logika) i notatka z terminem jako zadanie (D-239).
   Zapis idzie przez Store, wiec uprawnienia i walidacje egzekwuje straznik. Bledy wejscia
   wracaja jako { ok: false, bledy: [...] }. */
(function (global) {
  "use strict";

  var PRZYPOMNIENIE_DOMYSLNE_DNI = 3;
  var MS_NA_DOBE = 86400000;
  var WZOR_DATY = /^\d{4}-\d{2}-\d{2}$/;

  function pusty(v) { return v === null || v === undefined || String(v).trim() === ""; }

  /* ---------- Uczestnicy wniosku: wybor z listy klienta ---------- */
  function uczestnicyKlienta(klientId) {
    return global.DB.UCZESTNICY_KLIENTA.filter(function (u) { return u.klient === klientId; });
  }

  function idUczestnikowWniosku(wniosekId) {
    return global.Store.query("SELECT uczestnik_klienta_id AS k FROM uczestnicy WHERE wniosek_id = ?", [wniosekId])
      .map(function (r) { return r.k; });
  }

  function szkolenieWniosku(wniosekId, szkolenieId) {
    return global.Store.one("SELECT * FROM wniosek_szkolenia WHERE wniosek_id = ? AND szkolenie_id = ?", [wniosekId, szkolenieId]);
  }

  /* Uczestnik wniosku = osoba z puli klienta, raz we wniosku (D-280); zwraca jego id */
  function uczestnikWniosku(wniosek, idKlienta) {
    var jest = global.Store.one("SELECT id FROM uczestnicy WHERE wniosek_id = ? AND uczestnik_klienta_id = ?", [wniosek.id, idKlienta]);
    if (jest) return jest.id;
    return global.Store.insert("uczestnicy", { wniosek_id: wniosek.id, instytucja_id: wniosek.is, uczestnik_klienta_id: idKlienta }, "UCZ-").id;
  }

  /* Dodaje osobom z puli klienta szkolenie wniosku (D-279). Cena = cena szkolenia w tym wniosku,
     potem prowadzi sie ja recznie per szkolenie uczestnika (D-237). Ta sama osoba moze miec kilka szkolen. */
  function dodajUczestnikowDoWniosku(wniosek, idKlienta, szkolenieId) {
    if (!idKlienta.length) return { ok: false, bledy: ["Zaznacz co najmniej jednego uczestnika z listy klienta."] };
    var dozwolone = uczestnicyKlienta(wniosek.klient).map(function (u) { return u.id; });
    if (idKlienta.some(function (id) { return dozwolone.indexOf(id) < 0; })) return { ok: false, bledy: ["Uczestnik nie należy do klienta tego projektu."] };
    var ws = szkolenieId ? szkolenieWniosku(wniosek.id, szkolenieId) : null;
    if (!ws) return { ok: false, bledy: ["Wybierz szkolenie z listy szkoleń tego projektu."] };
    var dodano = 0;
    idKlienta.forEach(function (id) {
      var uczestnik = uczestnikWniosku(wniosek, id);
      if (global.Store.one("SELECT 1 AS x FROM uczestnik_szkolenia WHERE uczestnik_id = ? AND wniosek_szkolenie_id = ?", [uczestnik, ws.id])) return;
      global.Store.insert("uczestnik_szkolenia", { uczestnik_id: uczestnik, wniosek_szkolenie_id: ws.id, wniosek_id: wniosek.id,
        instytucja_id: wniosek.is, cena: ws.cena, status_kwalifikacji: "zakwalifikowany" }, "US-");
      dodano++;
    });
    return { ok: true, dodano: dodano };
  }

  /* Usuwa szkolenie uczestnika; osoba bez zadnego szkolenia znika z wniosku (zostaje w puli klienta) */
  function usunUczestnikaZWniosku(szkolenieUczestnikaId) {
    var s = global.Store.find("uczestnik_szkolenia", szkolenieUczestnikaId);
    if (!s) return { ok: false, bledy: ["Nie znaleziono uczestnika."] };
    global.Store.remove("uczestnik_szkolenia", s.id);
    if (!global.Store.one("SELECT 1 AS x FROM uczestnik_szkolenia WHERE uczestnik_id = ?", [s.uczestnik_id])) global.Store.remove("uczestnicy", s.uczestnik_id);
    return { ok: true };
  }

  function zapiszKwoteUczestnika(szkolenieUczestnikaId, szkolenieId, kwotaTekst) {
    var kwota = String(kwotaTekst).replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(kwota)) return { ok: false, bledy: ["Kwota to liczba nie mniejsza niż 0, np. 4500 albo 4500,50."] };
    var s = global.Store.find("uczestnik_szkolenia", szkolenieUczestnikaId);
    var ws = szkolenieId ? szkolenieWniosku(s.wniosek_id, szkolenieId) : null;
    if (!ws) return { ok: false, bledy: ["Wybierz szkolenie z listy szkoleń tego projektu."] };
    global.Store.update("uczestnik_szkolenia", s.id, { wniosek_szkolenie_id: ws.id, cena: parseFloat(kwota) });
    return { ok: true };
  }

  /* ---------- Notatka z terminem = zadanie z przypomnieniem (D-239) ---------- */
  function widoczneOd(termin, dni) {
    var d = new Date(termin + "T00:00:00Z");
    d.setTime(d.getTime() - dni * MS_NA_DOBE);
    return d.toISOString().slice(0, 10);
  }

  function bledyNotatki(dane) {
    var bledy = [];
    if (pusty(dane.tytul)) bledy.push("Treść notatki jest wymagana.");
    if (!WZOR_DATY.test(String(dane.termin || "")) || isNaN(Date.parse(dane.termin))) bledy.push("Podaj termin notatki.");
    if (!pusty(dane.przypomnijDni) && !/^\d+$/.test(String(dane.przypomnijDni).trim())) bledy.push("Liczba dni przypomnienia to liczba całkowita, nie mniejsza niż 0.");
    return bledy;
  }

  function dodajNotatkeZTerminem(wniosekId, dane) {
    var bledy = bledyNotatki(dane);
    if (bledy.length) return { ok: false, bledy: bledy };
    var kto = global.Akceptacje.ktoTeraz();
    var dni = pusty(dane.przypomnijDni) ? PRZYPOMNIENIE_DOMYSLNE_DNI : parseInt(dane.przypomnijDni, 10);
    var zadanie = global.Store.insert("zadania", {
      tytul: String(dane.tytul).trim(), opis: pusty(dane.opis) ? null : String(dane.opis).trim(), typ: "reczne",
      wniosek_id: wniosekId, termin: dane.termin, przypomnij_dni: dni, status: "otwarte",
      utworzono: kto.czas, utworzyl_id: kto.uzytkownik, przypisane_do: kto.uzytkownik
    }, "ZAD-");
    return { ok: true, id: zadanie.id, widoczneOd: widoczneOd(dane.termin, dni) };
  }

  function notatkiZTerminem(wniosekId) {
    return global.Store.query("SELECT * FROM zadania WHERE wniosek_id = ? AND typ = 'reczne' AND przypomnij_dni IS NOT NULL ORDER BY termin", [wniosekId]);
  }

  global.WniosekLogika = {
    PRZYPOMNIENIE_DOMYSLNE_DNI: PRZYPOMNIENIE_DOMYSLNE_DNI,
    uczestnicyKlienta: uczestnicyKlienta, ostrzezenieUmowy: global.KlientLogika.ostrzezenieUmowy, idUczestnikowWniosku: idUczestnikowWniosku,
    dodajUczestnikowDoWniosku: dodajUczestnikowDoWniosku,
    usunUczestnikaZWniosku: usunUczestnikaZWniosku, zapiszKwoteUczestnika: zapiszKwoteUczestnika,
    kontaLdit: global.SzkoleniaWniosku.kontaLdit, widoczneOd: widoczneOd, dodajNotatkeZTerminem: dodajNotatkeZTerminem, notatkiZTerminem: notatkiZTerminem
  };
})(window);
