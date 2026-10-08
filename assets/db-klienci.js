/* ============================================================================
   Adapter widoku, czesc klienta: klienci z pelnym formularzem i formularze
   czekajace na akceptacje. Wydzielone z db.js, ktory sklada z tego window.DB.

   Pelny formularz klienta (D-256, D-257) ma te same pola w tabeli klienci
   i w formularze_oczekujace, wiec oba widoki korzystaja z jednej funkcji.
   ============================================================================ */

(function (global) {
  "use strict";

  /* Pola formularza klienta wspolne dla klienta i formularza (D-256, D-257) */
  function daneFormularza(r) {
    return {
      telBiura: r.telefon_biura, mailFirmy: r.email_firmy, stanowisko: r.stanowisko_kontaktowej,
      bank: r.nazwa_banku, numerKonta: r.numer_konta,
      zatrudnienie: r.liczba_zatrudnionych, etaty: r.etaty, inneUmowy: r.liczba_innych_umow,
      opodatkowanie: r.forma_opodatkowania, stawkaPodatku: r.stawka_podatku,
      reprezentanci: [1, 2].map(function (n) {
        return { osoba: r["reprezentant_" + n], stanowisko: r["reprezentant_" + n + "_stanowisko"] };
      }).filter(function (x) { return x.osoba || x.stanowisko; }),
      zadluzenie: r.zadluzenie,
      /* Pytanie o ugode ma sens tylko przy odpowiedzi TAK na zadluzenie */
      zadluzenieUgoda: r.zadluzenie && r.zadluzenie !== "brak" ? r.zadluzenie_ugoda : null,
      kontoPracaGov: r.konto_praca_gov == null ? null : r.konto_praca_gov === 1,
      adres: r.adres_siedziby
    };
  }

  function polacz(cel, zrodlo) {
    Object.keys(zrodlo).forEach(function (k) { cel[k] = zrodlo[k]; });
    return cel;
  }

  /* Liczba zatrudnionych, numer konta i zadluzenie leza przy kliencie (D-235);
     wniosek przechowuje liczbe zatrudnionych na swoj dzien (D-169) */
  function klienciView(S, indexBy) {
    var czarnaLista = indexBy(S.query("SELECT * FROM v_klient_czarna_lista"), "klient_id");
    var urzedyKlienta = {};
    S.get("klient_urzedy").forEach(function (r) {
      (urzedyKlienta[r.klient_id] = urzedyKlienta[r.klient_id] || []).push({ pup: r.pup_id, oddzial: r.oddzial });
    });
    return S.get("klienci").map(function (k) {
      var cl = czarnaLista[k.id] || {};
      return polacz({
        id: k.id, nr: k.numer_klienta, nazwa: k.nazwa, nip: k.nip,
        wielkosc: k.wielkosc_przedsiebiorstwa,
        /* Czarna lista (D-249): regula z incydentow albo reczne ustawienie (D-19) */
        czarnaLista: cl.czarna_lista_efektywna === 1, czarnaListaRegula: k.czarna_lista_regula_aktywna !== 0,
        czarnaListaZReguly: cl.czarna_lista_wyliczona === 1, niezlozonych: cl.niezlozonych || 0,
        urzedy: urzedyKlienta[k.id] || [],
        kontakty: [1, 2, 3].map(function (n) {
          var sfx = n === 1 ? "" : "_" + n;
          return { osoba: k["osoba_kontaktowa" + sfx], tel: k["telefon" + sfx], mail: k["email" + sfx] };
        }).filter(function (c) { return c.osoba || c.tel || c.mail; }),
        osoba: k.osoba_kontaktowa, tel: k.telefon, mail: k.email,
        is: k.instytucja_id, pup: k.pup_id, miasto: k.miasto,
        zainteresowany: !!k.zainteresowany_naborem
      }, daneFormularza(k));
    });
  }

  /* Pola formularza klienta, ktorych brak wysylajacy widzi w komunikacie (D-245, D-256) */
  var POLA_WYMAGANE_FORMULARZA = [
    ["nip", "NIP"], ["adres_siedziby", "adres siedziby"], ["telefon_biura", "telefon do biura"],
    ["email_firmy", "e-mail firmy"], ["kontakt", "osoba do kontaktu"], ["email", "e-mail osoby do kontaktu"],
    ["telefon", "telefon osoby do kontaktu"], ["nazwa_banku", "nazwa banku"], ["numer_konta", "numer konta"],
    ["liczba_zatrudnionych", "liczba zatrudnionych na umowę o pracę"], ["etaty", "zatrudnienie w etatach"],
    ["forma_opodatkowania", "forma opodatkowania"], ["reprezentant_1", "osoba uprawniona do reprezentacji"],
    ["zadluzenie", "nieuregulowane zobowiązania"], ["konto_praca_gov", "konto na praca.gov.pl"]
  ];
  function brakiFormularza(k) {
    var braki = POLA_WYMAGANE_FORMULARZA
      .filter(function (p) { return k[p[0]] == null || k[p[0]] === ""; })
      .map(function (p) { return p[1]; });
    if (k.zadluzenie && k.zadluzenie !== "brak" && k.zadluzenie_ugoda == null) braki.push("ugoda w sprawie zobowiązań");
    if (!JSON.parse(k.uczestnicy_json || "[]").length) braki.push("dane uczestników");
    return braki;
  }

  /* Projekt zalozony z formularza (D-264), bez wnioskow usunietych z listy (D-261) */
  function projektyZFormularzy(S) {
    var mapa = {};
    S.query("SELECT id, formularz_id FROM wnioski WHERE formularz_id IS NOT NULL AND usuniety = 0").forEach(function (w) {
      mapa[w.formularz_id] = w.id;
    });
    return mapa;
  }

  function kolejkaView(S, instById) {
    var projekty = projektyZFormularzy(S);
    /* Plik zrodlowy formularza z tabeli pliki (D-278, D-287) */
    var pliki = {};
    S.query("SELECT id, formularz_id, nazwa FROM pliki WHERE formularz_id IS NOT NULL").forEach(function (p) { pliki[p.formularz_id] = p; });
    return S.get("formularze_oczekujace").map(function (k) {
      return polacz({
        id: k.id, data: k.data, firma: k.firma, nip: k.nip, osob: k.osob, szkolenie: k.szkolenie,
        kontakt: k.kontakt, is: (instById[k.instytucja_id] || {}).nazwa || "-",
        isId: k.instytucja_id, status: k.status, wypelnil: k.wypelnil, handlowiec: k.handlowiec_id,
        miasto: k.miasto, pup: k.pup_id, wielkosc: k.wielkosc, email: k.email, telefon: k.telefon,
        uwagi: k.uwagi, zglosil: k.zglosil_id, rozpatrzyl: k.rozpatrzyl_id, rozpatrzono: k.rozpatrzono,
        powod: k.powod_odrzucenia, klientId: k.klient_id, projektId: projekty[k.id] || null,
        /* Zrodlo wprowadzenia (D-244) i braki danych (D-245) */
        uczestnicy: JSON.parse(k.uczestnicy_json || "[]"), zrodlo: k.zrodlo, plik: (pliki[k.id] || {}).nazwa || null, plikId: (pliki[k.id] || {}).id || null,
        braki: brakiFormularza(k)
      }, daneFormularza(k));
    });
  }

  global.DBKlienci = { klienciView: klienciView, kolejkaView: kolejkaView, daneFormularza: daneFormularza };
})(window);
