/* Logika bez DOM: zalozenie nowego projektu (wniosku) w jednej sciezce, taka sama dla recznego
   dodania i dla wniosku powstajacego z formularza (D-264). Kolejnosc: wniosek, szkolenia z cenami
   ustalonymi w projekcie, uczestnicy z puli klienta z wyborem szkolenia, opiekunowie.
   Wszystko przechodzi przez Store (straznik, walidacja). Bledy wejscia: { ok: false, bledy: [...] }.

   ProjektLogika.utworz(dane), dane:
     klientId, instytucjaId, pupId, rok, status (z Statusy.LISTA, domyslnie Niezlozony),
     wykonawca, kwotaWnioskowana (puste = suma kwot uczestnikow),
     szkolenia:  [{ szkolenieId, cena }]            (min. jedno, cena nieujemna)
     uczestnicy: [{ uczestnikKlientaId, szkolenieId, kwota }]   (kwota pusta = cena szkolenia)
     opiekunowie: [id konta LDIT], przygotowalId,
     formularzId (opcjonalnie): zaakceptowany formularz tego klienta, z ktorego powstaje projekt
   Zwraca { ok: true, id, uczestnikow } albo { ok: false, bledy }. */
(function (global) {
  "use strict";

  var S = global.Store;
  var SZK = function () { return global.SzkoleniaWniosku; };

  function pusty(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function blad(tekst) { return { ok: false, bledy: [tekst] }; }

  function dzisIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Urzedy klienta do wyboru we wniosku: glowny i dodatkowe z oddzialami (D-238) */
  function urzedyKlienta(klientId) {
    var kl = global.DB.KLIENCI.filter(function (k) { return k.id === klientId; })[0];
    if (!kl) return [];
    var nazwa = function (id) { var p = global.DB.PUPY.filter(function (x) { return x.id === id; })[0]; return p ? p.nazwa : id; };
    var lista = kl.pup ? [{ pup: kl.pup, opis: nazwa(kl.pup) + " (główny)" }] : [];
    kl.urzedy.forEach(function (u) { lista.push({ pup: u.pup, opis: nazwa(u.pup) + (u.oddzial ? ", oddział " + u.oddzial : "") }); });
    return lista;
  }

  function nastepnyNumer(rok) {
    var r = S.one("SELECT MAX(numer) AS m FROM wnioski WHERE rok = ?", [rok]);
    return (r && r.m ? r.m : 0) + 1;
  }

  function nastepnaPozycja() {
    var r = S.one("SELECT MAX(COALESCE(pozycja, numer)) AS m FROM wnioski");
    return (r && r.m ? r.m : 0) + 1;
  }

  /* Walidacja calego wejscia przed pierwszym zapisem, zeby projekt nie powstal polowicznie */
  function bledyWejscia(d, klient) {
    var b = [];
    if (!klient) b.push("Wybierz klienta.");
    if (!global.DB.INSTYTUCJE.some(function (i) { return i.id === d.instytucjaId; })) b.push("Wybierz instytucję szkoleniową.");
    if (!d.rok || !global.DB.LATA.some(function (l) { return String(l.rok) === String(d.rok); })) b.push("Projekt wymaga zakładki roku zestawień.");
    if (d.pupId && !global.DB.PUPY.some(function (p) { return p.id === d.pupId; })) b.push("Nieznany urząd pracy.");
    if (!d.szkolenia || !d.szkolenia.length) b.push("Dodaj co najmniej jedno szkolenie z ceną.");
    (d.szkolenia || []).forEach(function (s) {
      var kat = SZK().szkolenieKatalogu(s.szkolenieId);
      if (!kat || kat.is !== d.instytucjaId) b.push("Szkolenie nie należy do katalogu wybranej instytucji.");
      if (SZK().parsujKwote(s.cena) === null) b.push("Cena szkolenia to liczba nie mniejsza niż 0.");
    });
    var znane = (d.szkolenia || []).map(function (s) { return s.szkolenieId; });
    if (znane.some(function (id, i) { return znane.indexOf(id) !== i; })) b.push("To samo szkolenie jest dodane dwa razy.");
    var pula = klient ? global.DB.UCZESTNICY_KLIENTA.filter(function (u) { return u.klient === klient.id; }) : [];
    (d.uczestnicy || []).forEach(function (u) {
      var zPuli = pula.filter(function (p) { return p.id === u.uczestnikKlientaId; })[0];
      if (!zPuli) b.push("Uczestnik nie należy do puli tego klienta.");
      else if (global.Walidacja.bledy("uczestnicy_klienta", { pesel: zPuli.pesel }).length) b.push(zPuli.imie + ": błędny PESEL w karcie klienta, popraw go przed dodaniem do projektu.");
      if (znane.indexOf(u.szkolenieId) < 0) b.push("Każdy uczestnik musi mieć jedno ze szkoleń projektu.");
      var para = (d.uczestnicy || []).filter(function (x) { return x.uczestnikKlientaId === u.uczestnikKlientaId && x.szkolenieId === u.szkolenieId; });
      if (para.length > 1 && para[0] === u) b.push((zPuli ? zPuli.imie : "Uczestnik") + ": to samo szkolenie dodane dwa razy.");
      if (!pusty(u.kwota) && SZK().parsujKwote(u.kwota) === null) b.push("Kwota uczestnika to liczba nie mniejsza niż 0.");
    });
    if (!pusty(d.kwotaWnioskowana) && SZK().parsujKwote(d.kwotaWnioskowana) === null) b.push("Wartość wnioskowana to kwota nie mniejsza niż 0.");
    var konta = SZK().kontaLdit().map(function (k) { return k.id; });
    if ((d.opiekunowie || []).some(function (id) { return konta.indexOf(id) < 0; })) b.push("Opiekunem może być tylko konto LDIT.");
    if (global.Statusy.LISTA.indexOf(d.status || "Niezłożony") < 0) b.push("Nieznany status projektu.");
    if (!pusty(d.formularzId)) b = b.concat(bledyFormularza(d.formularzId, d.klientId));
    return b;
  }

  /* Projekt z formularza: tylko z zaakceptowanego, dla klienta z akceptacji i raz (D-264) */
  function bledyFormularza(formularzId, klientId) {
    var f = S.find("formularze_oczekujace", formularzId);
    if (!f) return ["Nie znaleziono formularza " + formularzId + "."];
    if (f.status !== "zaakceptowany") return ["Projekt zakłada się z formularza dopiero po jego akceptacji."];
    if (f.klient_id !== klientId) return ["Formularz dotyczy innego klienta niż projekt."];
    var jest = S.one("SELECT id FROM wnioski WHERE formularz_id = ? AND usuniety = 0", [formularzId]);
    return jest ? ["Z tego formularza założono już projekt " + jest.id + "."] : [];
  }

  function wstawWniosek(d, klient, numer, kwota) {
    var dzis = dzisIso();
    var st = global.Statusy.patch({}, global.Statusy.akcjaDlaStatusu(d.status || "Niezłożony"), dzis);
    var id = "PR-" + String(d.rok).slice(2) + "-" + String(numer).padStart(4, "0");
    var wiersz = {
      id: id, numer: numer, rok: String(d.rok), klient_id: klient.id, instytucja_id: d.instytucjaId,
      pup_id: d.pupId || null, szkolenie_glowne_id: d.szkolenia[0].szkolenieId, przygotowal_id: d.przygotowalId || null,
      wykonawca: pusty(d.wykonawca) ? null : String(d.wykonawca).trim(), kwota_wnioskowana: kwota.wartosc, kwota_regula_aktywna: kwota.regula,
      formularz_id: pusty(d.formularzId) ? null : d.formularzId,
      pozycja: nastepnaPozycja(), etap: st.etap, status_skladania: st.status_skladania,
      status_decyzji: st.status_decyzji, status_finansowy: st.status_finansowy,
      data_wplyniecia_formularza: dzis, data_wniosku: dzis, data_aktualizacji: dzis
    };
    var handlowiec = global.Auth.handlowiec();
    if (handlowiec) wiersz.handlowiec_id = handlowiec;
    S.insert("wnioski", wiersz);
    return id;
  }

  /* Osoba z puli jest we wniosku raz (D-280); kazdy jej wiersz w oknie to szkolenie uczestnika (D-279) */
  function wstawUczestnikow(id, instytucjaId, numer, rok, uczestnicy, ceny, szkoleniaWniosku) {
    var osoby = {};
    uczestnicy.forEach(function (u) {
      if (!osoby[u.uczestnikKlientaId]) {
        osoby[u.uczestnikKlientaId] = S.insert("uczestnicy", {
          id: "UCZ-" + String(rok).slice(2) + "-" + String(numer).padStart(4, "0") + "-" + String(Object.keys(osoby).length + 1).padStart(2, "0"),
          wniosek_id: id, instytucja_id: instytucjaId, uczestnik_klienta_id: u.uczestnikKlientaId
        }).id;
      }
      S.insert("uczestnik_szkolenia", { uczestnik_id: osoby[u.uczestnikKlientaId], wniosek_szkolenie_id: szkoleniaWniosku[u.szkolenieId],
        wniosek_id: id, instytucja_id: instytucjaId, cena: pusty(u.kwota) ? ceny[u.szkolenieId] : SZK().parsujKwote(u.kwota),
        status_kwalifikacji: "zakwalifikowany" }, "US-");
    });
  }

  function utworz(d) {
    var klient = global.DB.KLIENCI.filter(function (k) { return k.id === d.klientId; })[0] || null;
    var bledy = bledyWejscia(d, klient);
    if (bledy.length) return { ok: false, bledy: bledy };
    var ceny = {};
    d.szkolenia.forEach(function (s) { ceny[s.szkolenieId] = SZK().parsujKwote(s.cena); });
    var uczestnicy = d.uczestnicy || [];
    var suma = uczestnicy.reduce(function (acc, u) { return acc + (pusty(u.kwota) ? ceny[u.szkolenieId] : SZK().parsujKwote(u.kwota)); }, 0);
    /* Pusta Wartosc = regula (suma szkolen uczestnikow, D-281), wpisana recznie wylacza regule */
    var kwota = pusty(d.kwotaWnioskowana) ? { wartosc: suma, regula: 1 } : { wartosc: SZK().parsujKwote(d.kwotaWnioskowana), regula: 0 };
    var numer = nastepnyNumer(String(d.rok));
    var id = wstawWniosek(d, klient, numer, kwota);
    var szkoleniaWniosku = {};
    d.szkolenia.forEach(function (s) {
      szkoleniaWniosku[s.szkolenieId] = S.insert("wniosek_szkolenia", { wniosek_id: id, instytucja_id: d.instytucjaId, szkolenie_id: s.szkolenieId, cena: ceny[s.szkolenieId] }, "WS-").id;
      /* Nowa kwota trafia na liste cen szkolenia tylko po potwierdzeniu (D-277, R-11) */
      if (d.dopiszCeny) SZK().dopiszCene(s.szkolenieId, ceny[s.szkolenieId]);
    });
    wstawUczestnikow(id, d.instytucjaId, numer, d.rok, uczestnicy, ceny, szkoleniaWniosku);
    (d.opiekunowie || []).forEach(function (u) { S.insert("wniosek_opiekunowie", { wniosek_id: id, uzytkownik_id: u }, "WO-"); });
    SZK().rejestr("Nowy projekt", id, "Projekt", "brak", klient.nazwa + (pusty(d.formularzId) ? "" : ", z formularza " + d.formularzId) + ", szkoleń: " + d.szkolenia.length + ", uczestników: " + uczestnicy.length);
    return { ok: true, id: id, uczestnikow: uczestnicy.length };
  }

  global.ProjektLogika = { urzedyKlienta: urzedyKlienta, utworz: utworz };
})(window);
