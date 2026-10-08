/* ============================================================================
   Adapter widoku: buduje window.DB w ksztalcie, ktorego oczekuja strony makiety,
   czytajac znormalizowane tabele z SQLite (assets/store.js).

   Pola wyliczane wniosku (koszt calkowity, przyznano, wklad wlasny) pochodza
   z widoku v_wniosek_finanse, czyli z SQL, a nie z JavaScriptu. Regula ma jedno
   miejsce. Szczegoly w makieta/db/views.sql.

   Po kazdej zmianie danych DB jest przebudowywane i na window leci "db:changed".
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;
  if (!S) throw new Error("Brak window.Store. Dolacz assets/store.js przed db.js");
  var K = global.DBKlienci;
  if (!K) throw new Error("Brak window.DBKlienci. Dolacz assets/db-klienci.js przed db.js");

  var I = global.DBInstytucje;
  if (!I) throw new Error("Brak window.DBInstytucje. Dolacz assets/db-instytucje.js przed db.js");

  var N = global.DBNabory;
  if (!N) throw new Error("Brak window.DBNabory. Dolacz assets/db-nabory.js przed db.js");

  var F = global.DBFormat;
  if (!F) throw new Error("Brak window.DBFormat. Dolacz assets/db-format.js przed db.js");

  /* Wskaznik dofinansowania pochodzi z konfigurowalnej tabeli progow (D-131),
     nie z liczby zaszytej w kodzie. */
  function wskaznik(wielkosc) {
    var r = S.one(
      "SELECT procent_dofinansowania AS p FROM progi_dofinansowania " +
      "WHERE wielkosc = ? AND (obowiazuje_do IS NULL OR obowiazuje_do = '') " +
      "ORDER BY obowiazuje_od DESC LIMIT 1", [wielkosc]);
    return r ? r.p / 100 : 0.7;
  }

  function indexBy(rows, key) {
    var m = {};
    for (var i = 0; i < rows.length; i++) m[rows[i][key]] = rows[i];
    return m;
  }

  /* ---------- Wnioski: liczby pochodza z widoku SQL ---------- */
  function grupuj(rows, key) {
    var m = {};
    rows.forEach(function (r) { (m[r[key]] = m[r[key]] || []).push(r); });
    return m;
  }

  function wnioskiView(klById, instById, pupById, szkById, uczByWniosek) {
    var finanse = indexBy(S.query("SELECT * FROM v_wniosek_finanse"), "wniosek_id");
    var opiekunowie = grupuj(S.get("wniosek_opiekunowie"), "wniosek_id");
    var dokumenty = indexBy(S.query("SELECT * FROM v_wniosek_dokumenty"), "wniosek_id");
    var opiekunowieInst = I.opiekunowie(S);
    var szkoleniaWniosku = grupuj(S.get("wniosek_szkolenia"), "wniosek_id");

    return S.get("wnioski").map(function (w) {
      var f = finanse[w.id] || {};
      var kl = klById[w.klient_id] || {};
      var inst = instById[w.instytucja_id] || {};
      var szkG = szkById[w.szkolenie_glowne_id] || {};

      /* Wiersz = szkolenie uczestnika (D-279); imie i PESEL z puli klienta (D-280) */
      var ucz = (uczByWniosek[w.id] || []).map(function (u) {
        var s = szkById[u.szkolenie_id] || {};
        return { id: u.id, uczestnik: u.uczestnik_id, wniosekSzkolenie: u.wniosek_szkolenie_id, termin: u.termin_id,
                 imie: u.imie_nazwisko, pesel: u.pesel, szkolenie: u.szkolenie_id, uczestnikKlienta: u.uczestnik_klienta_id,
                 szkNazwa: s.nazwa || "-", kwota: u.cena, status: u.status_kwalifikacji,
                 powod: u.powod_niezakwalifikowania || "", komentarz: u.komentarz || "" };
      });
      var d = dokumenty[w.id] || {};

      /* Wszystkie kwoty wyliczane pochodza z widoku v_wniosek_finanse (D-152) */
      var pozytywna = w.status_decyzji === "Pozytywna";
      var koszt = f.koszt_calkowity_efektywny;
      var procent = f.procent_dofinansowania;

      return {
        id: w.id, nr: w.numer, rok: w.rok, etap: w.etap,
        klient: w.klient_id, klNazwa: kl.nazwa, nip: kl.nip,
        wielkosc: f.wielkosc || kl.wielkosc_przedsiebiorstwa,
        is: w.instytucja_id, isNazwa: inst.nazwa || "-",
        pup: w.pup_id, pupNazwa: (pupById[w.pup_id] || {}).nazwa,
        szkolenie: szkG.nazwa || "-", szkId: w.szkolenie_glowne_id,
        uczestnicy: ucz, osob: f.uczestnikow || 0,
        osobZakw: f.uczestnikow_zakwalifikowanych || 0,
        /* Do wartosci wchodza wylacznie zakwalifikowani (D-61, D-79) */
        wartosc: f.calkowita_wartosc_szkolenia || 0,
        wartoscWszystkich: ucz.reduce(function (s, u) { return s + (u.kwota || 0); }, 0),
        calkowita: f.calkowita_wartosc_szkolenia || 0,
        kosztCalkowity: pozytywna ? koszt : null,
        /* Przyznano i wklad: regula albo reczne nadpisanie (D-135, D-172) */
        przyznano: f.przyznano_efektywne,
        przyznanoRegula: w.przyznano_regula_aktywna !== 0,
        przyznanoZReguly: f.przyznano_wyliczone,
        wklad: f.wklad_wlasny_efektywny,
        wkladRegula: w.wklad_regula_aktywna !== 0,
        wkladZReguly: f.wklad_wlasny_wyliczony,
        procent: procent,
        wkladProc: Math.round(100 - procent),
        progId: f.prog_efektywny_id, progRegula: w.prog_regula_aktywna !== 0,
        zatrudnienie: w.liczba_zatrudnionych,
        kontakty: [1, 2].map(function (n) {
          var sfx = n === 1 ? "" : "_" + n;
          return { osoba: w["osoba_kontaktowa" + sfx], tel: w["telefon" + sfx], mail: w["email" + sfx] };
        }).filter(function (k) { return k.osoba || k.tel || k.mail; }),
        doplata: w.kwota_doplaty_dodatkowej || 0,
        /* Podstawa prowizji LDIT: z doplata albo bez, wg znacznika (D-64, D-174) */
        kosztZDoplata: pozytywna ? w.koszt_calkowity_z_doplata : null,
        kosztZDoplataZapisany: w.koszt_calkowity_z_doplata,
        podstawaProwizji: pozytywna ? f.podstawa_prowizji : null,
        doplataNaFakturze: w.doplata_na_fakturze_kfs !== 0,
        statusSkl: w.status_skladania, statusDec: w.status_decyzji, rozliczenie: w.status_finansowy,
        dataWniosku: w.data_wniosku, dataFormularza: w.data_wplyniecia_formularza,
        dataFaktury: w.data_wystawienia_faktury,
        /* Nadpisanie prowizji per wniosek: procent albo kwota (D-136), tylko admin (D-93) */
        prowizjaRegula: w.prowizja_regula_aktywna !== 0,
        prowizjaTyp: w.prowizja_typ_nadpisania,
        prowizjaProcent: w.prowizja_typ_nadpisania === "procent" ? w.prowizja_wartosc : null,
        prowizjaKwota: w.prowizja_typ_nadpisania === "kwota" ? w.prowizja_wartosc : null,
        opiekun: (opiekunowieInst[w.instytucja_id] || {}).nazwy || "-",
        fakturaId: w.faktura_id,
        handlowiec: w.handlowiec_id,
        /* Kto przygotowal wniosek (D-233) i dokumenty po decyzji (D-232) */
        przygotowal: w.przygotowal_id,
        /* Certyfikat i faktura wyliczane z tabel (D-290, R-09), umowa reczna */
        certyfikat: d.certyfikat === 1, umowa: w.umowa_wystawiona === 1, fakturaWystawiona: d.faktura === 1,
        certyfikatow: d.certyfikatow || 0, doCertyfikatu: d.do_certyfikatu || 0,
        /* Spotkanie 06.10.2026: wykonawca (D-258), wartosc wnioskowana (D-259),
           opiekunowie (D-260), pozycja na liscie i usuniecie (D-261), szkolenia
           wniosku z cena ustalona w tym wniosku (D-264) */
        /* Wartosc: suma zakwalifikowanych szkolen z regula albo kwota reczna (D-281) */
        wykonawca: w.wykonawca, kwotaWnioskowana: f.kwota_wnioskowana_efektywna, kwotaRegula: w.kwota_regula_aktywna !== 0,
        kwotaZReguly: f.calkowita_wartosc_szkolenia || 0, formularz: w.formularz_id,
        opiekunowie: (opiekunowie[w.id] || []).map(function (o) { return o.uzytkownik_id; }),
        pozycja: w.pozycja == null ? w.numer : w.pozycja,
        usuniety: w.usuniety === 1, usunieto: w.usunieto,
        szkoleniaWniosku: (szkoleniaWniosku[w.id] || []).map(function (r) {
          return { id: r.id, szkolenie: r.szkolenie_id, nazwa: (szkById[r.szkolenie_id] || {}).nazwa || "-", cena: r.cena };
        })
      };
    });
  }

  function uzytkownicyView() {
    return S.query(
      "SELECT u.login, u.imie_nazwisko, u.dwa_fa, u.ostatnie_logowanie, u.zablokowane, " +
      "       r.nazwa AS rola_nazwa, r.typ AS rola_typ, u.rola_id, u.wszystkie_instytucje, " +
      "       COALESCE((SELECT GROUP_CONCAT(i.nazwa, ', ') FROM uzytkownik_instytucja ui " +
      "                 JOIN instytucje i ON i.id = ui.instytucja_id " +
      "                 WHERE ui.uzytkownik_id = u.id), '') AS instytucje " +
      "FROM uzytkownicy u JOIN role r ON r.id = u.rola_id"
    ).map(function (u) {
      return { login: u.login, imie: u.imie_nazwisko, rola: u.rola_nazwa, rolaId: u.rola_id, typ: u.rola_typ,
               inst: u.wszystkie_instytucje ? "wszystkie" : u.instytucje,
               ost: u.ostatnie_logowanie, "2fa": !!u.dwa_fa, zablokowane: !!u.zablokowane };
    });
  }

  /* ---------- Zlozenie window.DB ---------- */
  var DB = {};

  function rebuild() {
    var pupById = indexBy(S.get("urzedy_pracy"), "id");
    var instById = indexBy(S.get("instytucje"), "id");
    var klById = indexBy(S.get("klienci"), "id");
    var szkById = indexBy(S.get("katalog_szkolen"), "id");

    var uczByWniosek = {};
    S.query("SELECT s.*, ws.szkolenie_id, u.uczestnik_klienta_id, uk.imie_nazwisko, uk.pesel FROM uczestnik_szkolenia s " +
            "JOIN uczestnicy u ON u.id = s.uczestnik_id JOIN wniosek_szkolenia ws ON ws.id = s.wniosek_szkolenie_id " +
            "JOIN uczestnicy_klienta uk ON uk.id = u.uczestnik_klienta_id ORDER BY s.id").forEach(function (u) {
      (uczByWniosek[u.wniosek_id] = uczByWniosek[u.wniosek_id] || []).push(u);
    });

    /* Wniosek wycofany przed rozpoczeciem pracy znika z list (D-261). Kolejnosc
       na liscie wyznacza pozycja, numer wniosku sie nie zmienia. */
    var wszystkie = wnioskiView(klById, instById, pupById, szkById, uczByWniosek)
      .sort(function (a, b) { return a.pozycja - b.pozycja || a.nr - b.nr; });
    DB.WNIOSKI_USUNIETE = wszystkie.filter(function (w) { return w.usuniety; });
    wszystkie = wszystkie.filter(function (w) { return !w.usuniety; });
    DB.WNIOSKI_WSZYSTKIE = wszystkie;
    DB.WNIOSKI_BEZ_ROKU = wszystkie.filter(function (w) { return !w.rok; });
    DB.WNIOSKI_2026 = wszystkie.filter(function (w) { return w.rok === "2026"; });
    DB.WNIOSKI_2025 = wszystkie.filter(function (w) { return w.rok === "2025"; });
    DB.WNIOSKI = DB.WNIOSKI_2026;
    DB.LATA = S.query("SELECT rok, opis FROM lata_zestawien ORDER BY rok");
    DB.PROGI_DOFINANSOWANIA = S.query("SELECT * FROM progi_dofinansowania ORDER BY wielkosc, obowiazuje_od");
    /* Porownania rok do roku na dashboardzie: lata przeniesione z wnioskow,
       nieprzeniesione z podsumowan historycznych (D-175) */
    DB.PODSUMOWANIA = S.query("SELECT rok, instytucja_id AS isId, miara, wartosc, zrodlo FROM v_podsumowanie_roku");

    DB.INSTYTUCJE = I.instytucjeView(S, indexBy);
    DB.PUPY = N.pupyView(S);
    /* Lista cen szkolenia (D-277); cena = pierwsza cena katalogowa, podpowiedz przy dodaniu */
    var ceny = grupuj(S.query("SELECT * FROM ceny_szkolen ORDER BY zrodlo, cena"), "szkolenie_id");
    DB.SZKOLENIA = S.get("katalog_szkolen").map(function (s) {
      var lista = ceny[s.id] || [];
      return { id: s.id, is: s.instytucja_id, nazwa: s.nazwa, godz: s.liczba_godzin,
               dni: s.liczba_dni, tryb: s.tryb,
               cena: lista.length ? lista[0].cena : null, ceny: lista.map(function (c) { return c.cena; }) };
    });
    DB.KLIENCI = K.klienciView(S, indexBy);
    DB.TERMINY = S.get("terminy").map(function (t) {
      return { id: t.id, is: t.instytucja_id, szk: t.szkolenie_id, nazwa: t.nazwa,
               od: t.data_od, do: t.data_do, miejsce: t.miejsce,
               status: t.status_realizacji, zapisani: t.zapisani, limit: t.limit_miejsc };
    });
    DB.NABORY = N.naboryView(S);
    var szczegolyFaktur = indexBy(S.query("SELECT * FROM v_faktura_szczegoly"), "faktura_id");
    DB.FAKTURY = S.get("faktury").map(function (f) {
      var i = instById[f.instytucja_id] || {};
      var sz = szczegolyFaktur[f.id] || {};
      return { id: f.id, nr: f.numer, is: i.nazwa || "-", isId: f.instytucja_id, kwota: f.kwota, vat: f.vat,
               wystawiona: f.data_wystawienia, termin: f.termin_platnosci, status: f.status,
               projekty: f.liczba_projektow,
               /* Korekta trafia do okresu swojej daty wystawienia (D-161) */
               rodzaj: f.rodzaj, korygowana: f.faktura_pierwotna_id, okres: sz.okres_rozliczeniowy,
               klient: sz.klient_id || null, szkolenia: sz.szkolenia || "", wnioskow: sz.liczba_wnioskow || 0 };
    });
    DB.KOLEJKA = K.kolejkaView(S, instById);
    /* Uczestnicy klienta z wiekiem z PESEL (D-236) */
    DB.UCZESTNICY_KLIENTA = S.query("SELECT * FROM v_uczestnicy_klienta ORDER BY imie_nazwisko").map(function (u) {
      return { id: u.id, klient: u.klient_id, imie: u.imie_nazwisko, pesel: u.pesel, wiek: u.wiek,
               zatrudnienie: u.rodzaj_zatrudnienia, zatrudnienieDo: u.zatrudnienie_do,
               wyksztalcenie: u.wyksztalcenie, zawod: u.zawod };
    });
    /* Skutecznosc osob przygotowujacych wnioski (D-242) */
    DB.SKUTECZNOSC = S.query(
      "SELECT s.*, u.imie_nazwisko FROM v_skutecznosc_pracownikow s " +
      "LEFT JOIN uzytkownicy u ON u.id = s.uzytkownik_id ORDER BY s.skutecznosc_proc DESC").map(function (r) {
      return { uzytkownik: r.uzytkownik_id, imie: r.imie_nazwisko || r.uzytkownik_id, rok: r.rok,
               pozytywne: r.pozytywne, negatywne: r.negatywne, proc: r.skutecznosc_proc,
               przygotowane: r.przygotowane };
    });
    /* Zmiany danych zgloszone przez instytucje, czekajace na zatwierdzenie LDIT (D-224) */
    DB.PROPOZYCJE = S.get("propozycje_zmian").map(function (p) {
      return { id: p.id, isId: p.instytucja_id, is: (instById[p.instytucja_id] || {}).nazwa || "-",
               tabela: p.tabela, rekord: p.rekord_id, zmiany: JSON.parse(p.zmiany || "{}"),
               uzasadnienie: p.uzasadnienie, zglosil: p.zglosil_id, zgloszono: p.zgloszono, status: p.status,
               rozpatrzyl: p.rozpatrzyl_id, rozpatrzono: p.rozpatrzono, powod: p.powod_odrzucenia };
    });
    /* Korespondencja ze skrzynki administratora jest prywatna (D-248) */
    var skrzynkiAdmina = S.query("SELECT login FROM uzytkownicy WHERE rola_id = 'admin'")
      .map(function (r) { return r.login; });
    DB.MAILE = S.get("korespondencja").map(function (k) {
      return { id: k.id, klient: k.klient_id, isId: k.instytucja_id,
               skrzynkaAdmina: skrzynkiAdmina.indexOf(k.skrzynka) >= 0,
               data: k.data, kier: k.kierunek === "przychodzacy" ? "in" : "out",
               od: k.od_kogo, temat: k.temat, skrz: k.skrzynka, zal: k.zalaczniki, przypisanie: k.przypisanie };
    });

    DB.UZYTKOWNICY = uzytkownicyView();
    DB.MODULY = S.query("SELECT nazwa FROM moduly ORDER BY kolejnosc").map(function (m) { return m.nazwa; });
    DB.MODULY_ROWS = S.query("SELECT * FROM moduly ORDER BY kolejnosc");
    DB.ROLE = S.get("role");
    DB.AKTYWNOSC = S.get("rejestr_aktywnosci");
    DB.LOGOWANIA = S.get("logowania");
    DB.ZGLOSZENIA = S.get("zgloszenia");
    DB.SZABLONY = S.get("szablony_maili");
    /* Warunki prowizji pracownikow z osiagnietym obrotem (D-292), dawniej cele */
    DB.WARUNKI_PRACOWNIKOW = S.query("SELECT * FROM v_prowizje_pracownikow ORDER BY imie_nazwisko");
    DB.ZADANIA = S.get("zadania");

    DB.fmtPLN = F.fmtPLN; DB.fmtPLN2 = F.fmtPLN2; DB.fmtNum = F.fmtNum;
    DB.fmtPct = F.fmtPct; DB.fmtDate = F.fmtDate; DB.wskaznik = wskaznik;

    /* Separacja danych zaklada sie tutaj, zanim strona zobaczy cokolwiek.
       Szczegoly i uzasadnienie: assets/zakres.js */
    if (global.Zakres) global.Zakres.zastosuj(DB);
  }

  DB.przebuduj = rebuild;
  global.DB = DB;

  S.subscribe(function () {
    rebuild();
    if (global.dispatchEvent && global.CustomEvent) {
      global.dispatchEvent(new global.CustomEvent("db:changed"));
    }
  });
})(window);
