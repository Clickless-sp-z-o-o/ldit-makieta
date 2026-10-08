/* Logika danych klienta bez DOM: dane firmy, uczestnicy klienta, urzedy, czarna lista. Kolejny zmienia sie razem z danymi klienta (D-265).
   Uzywa ja karta klienta (19), Baza klientow (04) i karta wniosku (03). Zapis idzie przez Store,
   wiec uprawnienia i walidacje egzekwuje straznik (assets/straznik.js, assets/walidacja.js).
   Bledy wejscia (puste imie, zly numer konta) wracaja jako { ok: false, bledy: [...] }. */
(function (global) {
  "use strict";

  var RODZAJE_ZATRUDNIENIA = [
    ["umowa_o_prace", "umowa o pracę"], ["umowa_zlecenie", "umowa zlecenie"], ["umowa_o_dzielo", "umowa o dzieło"],
    ["wlasciciel", "właściciel"], ["inna", "inna"]
  ];
  var ZADLUZENIA = [["brak", "brak"], ["zus", "ZUS"], ["us", "US"], ["zus_us", "ZUS i US"], ["inne", "inne"]];
  var WZOR_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var WZOR_TELEFONU = /^\+?[\d\s()-]{9,20}$/;
  var WZOR_DZIESIETNEJ = /^\d+([.,]\d+)?$/;
  var MAX_STAWKA = 100;
  /* Pola formularza (D-256, D-257), ktore wymagaja walidacji wejscia lub konwersji typu */
  var POLA_EMAIL = [["email_firmy", "E-mail firmy"], ["email", "E-mail osoby do kontaktu"], ["email_2", "E-mail 2"], ["email_3", "E-mail 3"]];
  var POLA_TELEFONU = [["telefon_biura", "Telefon do biura"], ["telefon", "Telefon osoby do kontaktu"], ["telefon_2", "Telefon 2"], ["telefon_3", "Telefon 3"]];
  var POLA_TAK_NIE = ["zadluzenie_ugoda", "konto_praca_gov"];
  var WZOR_KONTA = /^(PL)?\d{26}$/;
  var KOLUMNY_KLIENTA = ["nazwa", "nip", "miasto", "adres_siedziby", "wielkosc_przedsiebiorstwa", "pup_id",
    "liczba_zatrudnionych", "numer_konta", "zadluzenie", "osoba_kontaktowa", "telefon", "email",
    "osoba_kontaktowa_2", "telefon_2", "email_2", "osoba_kontaktowa_3", "telefon_3", "email_3", "zainteresowany_naborem",
    "telefon_biura", "email_firmy", "stanowisko_kontaktowej", "nazwa_banku", "etaty", "liczba_innych_umow", "forma_opodatkowania",
    "stawka_podatku", "reprezentant_1", "reprezentant_1_stanowisko", "reprezentant_2", "reprezentant_2_stanowisko",
    "zadluzenie_ugoda", "konto_praca_gov"];
  var KOLUMNY_UCZESTNIKA = ["imie_nazwisko", "rodzaj_zatrudnienia", "zatrudnienie_do", "wyksztalcenie", "zawod"];

  function etykieta(lista, klucz) {
    var p = lista.filter(function (x) { return x[0] === klucz; })[0];
    return p ? p[1] : (klucz || "");
  }
  function znany(lista, klucz) { return lista.some(function (x) { return x[0] === klucz; }); }
  function pusty(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function czystyTekst(v) { return pusty(v) ? null : String(v).trim(); }
  function dzis() { return new Date().toISOString().slice(0, 10); }

  function wpisDoRejestru(typ, obiekt, pole, przed, po) {
    var kto = global.Akceptacje.ktoTeraz();
    global.Store.insert("rejestr_aktywnosci", {
      czas: kto.czas, kto: kto.imie, typ: typ, obiekt: obiekt, pole: pole,
      przed: pusty(przed) ? "brak" : String(przed), po: pusty(po) ? "brak" : String(po)
    }, "AKT-");
  }

  /* ---------- Dane firmy (D-235, D-256, D-257) ---------- */
  function liczba(v) { return Number(String(v).trim().replace(",", ".")); }

  function bledyFormatu(dane) {
    var bledy = [];
    POLA_EMAIL.forEach(function (p) {
      if (!pusty(dane[p[0]]) && !WZOR_EMAIL.test(String(dane[p[0]]).trim())) bledy.push(p[1] + ": niepoprawny adres e-mail.");
    });
    POLA_TELEFONU.forEach(function (p) {
      if (!pusty(dane[p[0]]) && !WZOR_TELEFONU.test(String(dane[p[0]]).trim())) bledy.push(p[1] + ": niepoprawny numer telefonu.");
    });
    return bledy;
  }

  function bledyLiczb(dane) {
    var bledy = [];
    var calkowita = function (k, nazwa) {
      if (!pusty(dane[k]) && !/^\d+$/.test(String(dane[k]).trim())) bledy.push(nazwa + " to liczba całkowita, nie mniejsza niż 0.");
    };
    calkowita("liczba_zatrudnionych", "Liczba zatrudnionych");
    calkowita("liczba_innych_umow", "Liczba zatrudnionych na innych umowach");
    if (!pusty(dane.etaty) && !WZOR_DZIESIETNEJ.test(String(dane.etaty).trim())) bledy.push("Zatrudnienie w etatach to liczba nie mniejsza niż 0, np. 4,5.");
    var stawka = dane.stawka_podatku;
    if (!pusty(stawka) && !(WZOR_DZIESIETNEJ.test(String(stawka).trim()) && liczba(stawka) <= MAX_STAWKA)) {
      bledy.push("Stawka podatku to liczba od 0 do " + MAX_STAWKA + ".");
    }
    return bledy;
  }

  function bledyZobowiazan(dane) {
    var bledy = [];
    if (dane.zadluzenie === "tak") bledy.push("Przy zobowiązaniach wybierz rodzaj: ZUS, US, ZUS i US albo inne.");
    else if (!pusty(dane.zadluzenie) && !znany(ZADLUZENIA, dane.zadluzenie)) bledy.push("Nieznany rodzaj zadłużenia.");
    return bledy;
  }

  function bledyDanychKlienta(dane) {
    var bledy = [];
    if ("nazwa" in dane && pusty(dane.nazwa)) bledy.push("Nazwa firmy jest wymagana.");
    var konto = pusty(dane.numer_konta) ? "" : String(dane.numer_konta).replace(/[\s-]/g, "");
    if (konto && !WZOR_KONTA.test(konto)) bledy.push("Numer konta: 26 cyfr, opcjonalnie z prefiksem PL.");
    return bledy.concat(bledyLiczb(dane), bledyFormatu(dane), bledyZobowiazan(dane));
  }

  function wartoscKolumny(k, v) {
    if (k === "zainteresowany_naborem") return v ? 1 : 0;
    if (POLA_TAK_NIE.indexOf(k) >= 0) return pusty(v) ? null : (String(v) === "1" || v === true ? 1 : 0);
    var t = czystyTekst(v);
    if (t === null) return null;
    if (k === "liczba_zatrudnionych" || k === "liczba_innych_umow") return parseInt(t, 10);
    if (k === "etaty" || k === "stawka_podatku") return liczba(t);
    if (k === "numer_konta") return t.replace(/[\s-]/g, "");
    return t;
  }

  /* Wartosci puste zapisujemy jako NULL, liczby jako liczby, konto bez spacji. Pytanie o ugode ma sens tylko
     przy zobowiazaniach (TAK), przy NIE i przy braku odpowiedzi zapisujemy NULL (D-256). */
  function normalizujDaneKlienta(dane, obecny) {
    var out = {};
    KOLUMNY_KLIENTA.forEach(function (k) { if (k in dane) out[k] = wartoscKolumny(k, dane[k]); });
    if ("zadluzenie" in out || "zadluzenie_ugoda" in out) {
      var zadluzenie = "zadluzenie" in out ? out.zadluzenie : (obecny || {}).zadluzenie;
      if (!zadluzenie || zadluzenie === "brak") out.zadluzenie_ugoda = null;
    }
    return out;
  }

  function zmienioneKolumny(przed, po) {
    return Object.keys(po).filter(function (k) { return String(po[k] == null ? "" : po[k]) !== String(przed[k] == null ? "" : przed[k]); });
  }

  function zapiszDaneKlienta(id, dane) {
    var bledy = bledyDanychKlienta(dane);
    if (bledy.length) return { ok: false, bledy: bledy };
    var przed = global.Store.find("klienci", id);
    var po = normalizujDaneKlienta(dane, przed);
    var zmiany = zmienioneKolumny(przed, po);
    if (!zmiany.length) return { ok: true, zmiany: 0 };
    var patch = {};
    zmiany.forEach(function (k) { patch[k] = po[k]; });
    global.Store.update("klienci", id, patch);
    zmiany.forEach(function (k) { wpisDoRejestru("Zmiana danych klienta", id, k, przed[k], po[k]); });
    return { ok: true, zmiany: zmiany.length };
  }

  /* Nowy klient razem z uczestnikami i liczba zatrudnionych (D-235, D-236). Numer klienta jest ciagly
     i trafia na fakture (D-112), wiec liczymy go z calej tabeli, nie z przefiltrowanego widoku. */
  function utworzKlienta(dane, instytucjaId, uczestnicy) {
    var bledy = bledyDanychKlienta(dane);
    (uczestnicy || []).forEach(function (u, i) {
      bledyUczestnika(u).forEach(function (b) { bledy.push("Uczestnik " + (i + 1) + ": " + b); });
    });
    if (bledy.length) return { ok: false, bledy: bledy };
    var wiersz = normalizujDaneKlienta(dane, null);
    /* Klient nalezy do jednej instytucji (D-282); dodany przez handlowca jest jego klientem (D-210) */
    if (pusty(instytucjaId)) return { ok: false, bledy: ["Wybierz instytucję klienta."] };
    wiersz.instytucja_id = instytucjaId;
    wiersz.handlowiec_id = global.Auth.handlowiec() || null;
    wiersz.numer_klienta = global.Store.one("SELECT COALESCE(MAX(numer_klienta), 0) AS n FROM klienci").n + 1;
    wiersz.utworzono = dzis();
    var nowy = global.Store.insert("klienci", wiersz, "KL-");
    (uczestnicy || []).forEach(function (u) { zapiszUczestnikaKlienta(nowy.id, u, null); });
    wpisDoRejestru("Dodanie klienta", nowy.id, "Klient", "brak", wiersz.nazwa);
    return { ok: true, id: nowy.id };
  }

  /* ---------- Czarna lista (D-249, D-19): reczna zmiana kasuje regule, Przywroc regule ja odtwarza ---------- */
  function mozeCzarnaLista() { return global.Auth.moze("zgloszenia.dostep"); }

  function ustawCzarnaListe(id, wartosc) {
    if (!mozeCzarnaLista()) return { ok: false, bledy: ["Brak dostępu do zgłoszeń."] };
    var przed = global.Store.find("klienci", id);
    global.Store.update("klienci", id, { czarna_lista: wartosc ? 1 : 0, czarna_lista_regula_aktywna: 0 });
    wpisDoRejestru("Zmiana danych klienta", id, "Czarna lista (ręcznie)", przed.czarna_lista ? "tak" : "nie", wartosc ? "tak" : "nie");
    return { ok: true };
  }
  function przywrocRegule(id) {
    if (!mozeCzarnaLista()) return { ok: false, bledy: ["Brak dostępu do zgłoszeń."] };
    global.Store.update("klienci", id, { czarna_lista_regula_aktywna: 1 });
    wpisDoRejestru("Przywrócenie reguły", id, "Czarna lista", "ręcznie", "reguła");
    return { ok: true };
  }

  /* ---------- Uczestnicy klienta (D-236) ---------- */
  /* Reguła KFS: dofinansowanie tylko dla osoby na umowie o prace. Tylko ostrzezenie, status zostaje (D-236). */
  function ostrzezenieUmowy(uczestnikKlienta, dzisIso) {
    if (!uczestnikKlienta) return null;
    if (!uczestnikKlienta.zatrudnienie) return "nie podano rodzaju zatrudnienia";
    if (uczestnikKlienta.zatrudnienie !== "umowa_o_prace") return "brak umowy o pracę (kwalifikuje się tylko umowa o pracę)";
    if (uczestnikKlienta.zatrudnienieDo && dzisIso && uczestnikKlienta.zatrudnienieDo < dzisIso) return "umowa o pracę wygasła";
    return null;
  }

  function bledyUczestnika(dane) {
    var bledy = [];
    if (pusty(dane.imie_nazwisko)) bledy.push("Imię i nazwisko jest wymagane.");
    if (!pusty(dane.rodzaj_zatrudnienia) && !znany(RODZAJE_ZATRUDNIENIA, dane.rodzaj_zatrudnienia)) bledy.push("Nieznany rodzaj zatrudnienia.");
    return bledy;
  }

  /* PESEL zapisujemy tylko kontu z feature klient.pesel, inaczej pole z formularza (puste) skasowaloby go */
  function wierszUczestnika(dane) {
    var wiersz = {};
    KOLUMNY_UCZESTNIKA.forEach(function (k) { wiersz[k] = czystyTekst(dane[k]); });
    if (global.Auth.moze("klient.pesel")) wiersz.pesel = czystyTekst(dane.pesel);
    return wiersz;
  }

  function zapiszUczestnikaKlienta(klientId, dane, id) {
    var bledy = bledyUczestnika(dane);
    if (bledy.length) return { ok: false, bledy: bledy };
    var wiersz = wierszUczestnika(dane);
    if (id) {
      global.Store.update("uczestnicy_klienta", id, Object.assign({}, wiersz));
      wpisDoRejestru("Zmiana danych klienta", klientId, "Uczestnik: " + wiersz.imie_nazwisko, "edycja", "zapisano");
      return { ok: true, id: id };
    }
    wiersz.klient_id = klientId;
    wiersz.utworzono = dzis();
    var nowy = global.Store.insert("uczestnicy_klienta", Object.assign({}, wiersz), "UK-");
    wpisDoRejestru("Zmiana danych klienta", klientId, "Uczestnik: " + wiersz.imie_nazwisko, "brak", "dodano");
    return { ok: true, id: nowy.id };
  }

  function liczbaProjektowUczestnika(id) {
    return global.Store.one("SELECT COUNT(*) AS n FROM uczestnicy WHERE uczestnik_klienta_id = ?", [id]).n;
  }
  /* Usuniecie z karty klienta nie kasuje uczestnika z projektow: tam zostaje przepisane imie i PESEL */
  /* Osoba bedaca uczestnikiem projektu zostaje w puli: wniosek bierze z niej imie i PESEL (D-280) */
  function usunUczestnikaKlienta(id) {
    var u = global.Store.find("uczestnicy_klienta", id);
    var projektow = liczbaProjektowUczestnika(id);
    if (projektow) return { ok: false, projektow: projektow, bledy: ["Ta osoba jest uczestnikiem " + projektow + " projektów. Najpierw usuń ją z projektów."] };
    global.Store.remove("uczestnicy_klienta", id);
    wpisDoRejestru("Zmiana danych klienta", u.klient_id, "Uczestnik: " + u.imie_nazwisko, "dodany", "usunięty");
    return { ok: true, projektow: projektow };
  }

  /* ---------- Dodatkowe urzedy klienta z oddzialami (D-238) ---------- */
  function urzedyKlienta(klientId) {
    return global.Store.query("SELECT * FROM klient_urzedy WHERE klient_id = ?", [klientId]);
  }
  function dodajUrzadKlienta(klientId, pupId, oddzial) {
    var klient = global.Store.find("klienci", klientId);
    if (pusty(pupId)) return { ok: false, bledy: ["Wybierz urząd pracy."] };
    if (klient.pup_id === pupId || urzedyKlienta(klientId).some(function (u) { return u.pup_id === pupId; })) {
      return { ok: false, bledy: ["Ten urząd jest już przypisany do klienta."] };
    }
    global.Store.insert("klient_urzedy", { klient_id: klientId, pup_id: pupId, oddzial: czystyTekst(oddzial) }, "KU-");
    wpisDoRejestru("Zmiana danych klienta", klientId, "Dodatkowy urząd", "brak", pupId);
    return { ok: true };
  }
  function usunUrzadKlienta(wiersz) {
    global.Store.remove("klient_urzedy", wiersz.id);
    wpisDoRejestru("Zmiana danych klienta", wiersz.klient_id, "Dodatkowy urząd", wiersz.pup_id, "usunięty");
    return { ok: true };
  }

  global.KlientLogika = {
    KOLUMNY_KLIENTA: KOLUMNY_KLIENTA, KOLUMNY_UCZESTNIKA: KOLUMNY_UCZESTNIKA, RODZAJE_ZATRUDNIENIA: RODZAJE_ZATRUDNIENIA, ZADLUZENIA: ZADLUZENIA, etykieta: etykieta,
    bledyDanychKlienta: bledyDanychKlienta, zapiszDaneKlienta: zapiszDaneKlienta, utworzKlienta: utworzKlienta,
    mozeCzarnaLista: mozeCzarnaLista, ustawCzarnaListe: ustawCzarnaListe, przywrocRegule: przywrocRegule,
    ostrzezenieUmowy: ostrzezenieUmowy, zapiszUczestnikaKlienta: zapiszUczestnikaKlienta, usunUczestnikaKlienta: usunUczestnikaKlienta,
    liczbaProjektowUczestnika: liczbaProjektowUczestnika,
    urzedyKlienta: urzedyKlienta, dodajUrzadKlienta: dodajUrzadKlienta, usunUrzadKlienta: usunUrzadKlienta
  };
})(window);
