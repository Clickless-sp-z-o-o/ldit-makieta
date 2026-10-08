/* ============================================================================
   Akceptacje LDIT: formularze zgloszeniowe (D-105, D-223) i zmiany danych
   zgloszone przez instytucje (D-224).

   Instytucja i jej handlowiec niczego nie zmieniaja od razu. Zglaszaja klienta
   formularzem albo zmiane danych (swoich i swoich klientow), a pracownik LDIT
   lub administrator zatwierdza albo odrzuca z powodem. Uprawnienia sprawdza
   straznik zapisow (assets/straznik.js), ten modul tylko sklada operacje.
   Kazda operacja trafia do rejestru aktywnosci.
   kto = { czas: "RRRR-MM-DD GG:MM", uzytkownik: id konta, imie: nazwa do rejestru }

   Formularz: recznie, z CSV albo z zalaczonym PDF (D-244); wprowadza LDIT albo instytucja.
   Z brakami jest przyjmowany (D-245), braki widac w DB.KOLEJKA[i].braki.

   API:  Akceptacje.zglosFormularz(dane, kto)            nowy formularz, zwraca wiersz;
                                                dane.uczestnicy to tablica obiektow uczestnika
         Akceptacje.zaakceptujFormularz(id, kto, poprawki)  klient w bazie, zwraca id klienta; klient o tym NIP
                                                w tej samej instytucji jest uzupelniany, w innej powstaje osobny (D-282)
         Akceptacje.odrzucFormularz(id, powod, kto), zwrocFormularz(id, kto) (D-269, powod zaczyna sie od PREFIKS_ZWROTU)
         Akceptacje.klientWZakresieZNip(nip, instytucjaId)  id klienta o tym NIP w tej instytucji, w zakresie konta, albo null
         Akceptacje.zglosZmiane(tabela, id, instytucja, nowe, uzasadnienie, kto), zatwierdzZmiane, odrzucZmiane
         Akceptacje.POLA                                 pola zglaszane, z etykietami
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;

  var POLA = {
    instytucje: { nazwa: "Nazwa", skrot: "Skrót", siedziba_miejscowosc: "Miejscowość siedziby", nip: "NIP",
                  strona_www: "Strona www", osoba_kontaktowa: "Osoba kontaktowa", email: "E-mail", telefon: "Telefon",
                  opis_dzialalnosci: "Opis działalności", standard_godzinowy: "Standard godzinowy" },
    klienci: { nazwa: "Nazwa", nip: "NIP", wielkosc_przedsiebiorstwa: "Wielkość", osoba_kontaktowa: "Osoba kontaktowa",
               telefon: "Telefon", email: "E-mail", miasto: "Miasto", adres_siedziby: "Adres siedziby", pup_id: "Urząd pracy",
               telefon_biura: "Telefon do biura", email_firmy: "E-mail firmy", nazwa_banku: "Nazwa banku",
               numer_konta: "Numer rachunku", liczba_zatrudnionych: "Zatrudnieni na umowę o pracę",
               etaty: "Zatrudnienie w etatach", liczba_innych_umow: "Zatrudnieni na innych umowach",
               forma_opodatkowania: "Forma opodatkowania", stawka_podatku: "Stawka podatku (%)",
               reprezentant_1: "Osoba uprawniona do reprezentacji", konto_praca_gov: "Konto na praca.gov.pl" }
  };

  function AkceptacjeError(kod, komunikat) { this.name = "AkceptacjeError"; this.kod = kod; this.message = komunikat; }
  AkceptacjeError.prototype = Object.create(Error.prototype);
  AkceptacjeError.prototype.constructor = AkceptacjeError;
  function blad(kod, tresc) { throw new AkceptacjeError(kod, tresc); }

  function doRejestru(kto, typ, obiekt, pole, przed, po) {
    S.insert("rejestr_aktywnosci", { czas: kto.czas, kto: kto.imie, typ: typ, obiekt: obiekt, pole: pole,
                                     przed: przed == null || przed === "" ? "brak" : String(przed),
                                     po: po == null || po === "" ? "brak" : String(po) }, "AKT-");
  }

  function oczekujacy(tabela, id) {
    var r = S.find(tabela, id);
    if (!r) blad("nie_ma", "Nie znaleziono zgłoszenia " + id + ".");
    if (r.status !== "oczekuje") blad("rozpatrzone", "Zgłoszenie " + id + " jest już rozpatrzone.");
    return r;
  }

  /* ------------------------------ formularze ------------------------------ */

  var ROD_ZATRUDNIENIA = ["umowa_o_prace", "umowa_zlecenie", "umowa_o_dzielo", "wlasciciel", "inna"];
  var POLA_UCZESTNIKA = ["imie_nazwisko", "pesel", "rodzaj_zatrudnienia", "wyksztalcenie", "zawod"];

  /* Kto wprowadza: handlowiec, instytucja albo pracownik (konto bez przypisanej instytucji, D-275) */
  function ktoWypelnil() {
    if (global.Auth.handlowiec()) return "handlowiec";
    return global.Auth.sesja().instytucja_id ? "instytucja" : "pracownik";
  }

  /* Uczestnik bez imienia i nazwiska albo z blednym PESEL nie wchodzi nawet do kolejki.
     Braki (np. pusty PESEL) sa dozwolone, bledne dane nie. */
  function czystyUczestnicy(lista) {
    return (lista || []).map(function (u, i) {
      var wiersz = {};
      POLA_UCZESTNIKA.forEach(function (k) { wiersz[k] = u[k] == null || String(u[k]).trim() === "" ? null : String(u[k]).trim(); });
      if (!wiersz.imie_nazwisko) blad("walidacja", "Uczestnik " + (i + 1) + ": podaj imię i nazwisko.");
      if (wiersz.rodzaj_zatrudnienia && ROD_ZATRUDNIENIA.indexOf(wiersz.rodzaj_zatrudnienia) < 0) {
        blad("walidacja", "Uczestnik " + (i + 1) + ": nieznany rodzaj zatrudnienia.");
      }
      var bledy = global.Walidacja.bledy("uczestnicy_klienta", { imie_nazwisko: wiersz.imie_nazwisko, pesel: wiersz.pesel });
      if (bledy.length) blad("walidacja", "Uczestnik " + (i + 1) + ": " + bledy[0].pole + ": " + bledy[0].komunikat);
      return wiersz;
    });
  }

  function zglosFormularz(dane, kto) {
    /* Dopisanie wymaga funkcji nadawanej w roli (D-269), takze dla kont LDIT */
    if (!global.Auth.moze("formularze.zglaszanie")) blad("brak_uprawnien", "Twoja rola nie ma funkcji dodawania formularzy.");
    if (!dane.firma || !String(dane.firma).trim()) blad("brak_firmy", "Podaj nazwę firmy.");
    if (!dane.instytucja_id) blad("brak_instytucji", "Formularz musi wskazywać instytucję.");
    if (dane.zrodlo === "pdf" && !dane.plik) blad("brak_pliku", "Załącz plik PDF z formularzem.");
    var wiersz = {};
    Object.keys(dane).forEach(function (k) { wiersz[k] = dane[k] === "" ? null : dane[k]; });
    /* Ugoda dotyczy tylko firm z zobowiazaniami (D-256) */
    if (!wiersz.zadluzenie || wiersz.zadluzenie === "brak") wiersz.zadluzenie_ugoda = null;
    var uczestnicy = czystyUczestnicy(dane.uczestnicy);
    delete wiersz.uczestnicy;
    delete wiersz.plik;
    wiersz.uczestnicy_json = JSON.stringify(uczestnicy);
    wiersz.osob = uczestnicy.length || dane.osob || 0;
    wiersz.firma = String(dane.firma).trim();
    wiersz.data = kto.czas.slice(0, 10);
    wiersz.wypelnil = ktoWypelnil();
    wiersz.handlowiec_id = global.Auth.handlowiec() || null;
    wiersz.zglosil_id = kto.uzytkownik;
    wiersz.status = "oczekuje";
    var nowy = S.insert("formularze_oczekujace", wiersz, "FO-");
    /* Plik zrodlowy zostaje do podgladu, czy dane dobrze sie rozczytaly (D-287, D-278) */
    if (dane.plik) S.insert("pliki", { formularz_id: nowy.id, instytucja_id: wiersz.instytucja_id, nazwa: dane.plik.nazwa, typ: dane.plik.typ || null,
      rozmiar: dane.plik.rozmiar || 0, rodzaj: "formularz", tresc: dane.plik.tresc || null, dodano: wiersz.data, dodal_id: kto.uzytkownik }, "PLK-");
    doRejestru(kto, "Zgłoszenie formularza", nowy.id, "Firma", null, wiersz.firma);
    return nowy;
  }

  /* Klient o tym NIP w danej instytucji: ta sama firma w innej instytucji to osobny klient (D-282) */
  function klientZNip(nip, instytucjaId) {
    var czysty = String(nip || "").replace(/\D/g, "");
    if (!czysty) return null;
    return S.query("SELECT id, nazwa, nip FROM klienci WHERE instytucja_id = ?", [instytucjaId]).filter(function (k) {
      return String(k.nip || "").replace(/\D/g, "") === czysty;
    })[0] || null;
  }

  /* Klient o tym samym NIP juz jest w tej instytucji: uzupelniamy go. Konto z ograniczonym
     zakresem (handlowiec) nie widzi cudzego klienta, wiec wtedy powstaje nowy rekord. */
  function klientDoPowiazania(f) {
    var istniejacy = klientZNip(f.nip, f.instytucja_id);
    if (!istniejacy) return null;
    var widoczni = global.Auth.klienciWZakresie();
    return widoczni === null || widoczni.indexOf(istniejacy.id) >= 0 ? istniejacy.id : null;
  }

  /* Pola pelnego formularza klienta, o tych samych nazwach w formularzu i u klienta (D-235, D-256) */
  var POLA_FORMULARZA_KLIENTA = ["adres_siedziby", "liczba_zatrudnionych", "numer_konta", "telefon_biura", "email_firmy",
    "stanowisko_kontaktowej", "nazwa_banku", "etaty", "liczba_innych_umow", "forma_opodatkowania", "stawka_podatku",
    "reprezentant_1", "reprezentant_1_stanowisko", "reprezentant_2", "reprezentant_2_stanowisko",
    "zadluzenie", "zadluzenie_ugoda", "konto_praca_gov"];

  function nowyKlient(f, kto) {
    var maxNr = S.one("SELECT COALESCE(MAX(numer_klienta), 0) AS n FROM klienci").n;
    var wiersz = {
      numer_klienta: maxNr + 1, nazwa: f.firma, nip: f.nip, wielkosc_przedsiebiorstwa: f.wielkosc,
      osoba_kontaktowa: f.kontakt, telefon: f.telefon, email: f.email, miasto: f.miasto,
      instytucja_id: f.instytucja_id, handlowiec_id: f.handlowiec_id || null, pup_id: f.pup_id, zainteresowany_naborem: 1,
      utworzono: kto.czas.slice(0, 10)
    };
    POLA_FORMULARZA_KLIENTA.forEach(function (p) { wiersz[p] = f[p] == null ? null : f[p]; });
    return S.insert("klienci", wiersz, "KL-").id;
  }

  /* Klient znaleziony po NIP: uzupelniamy tylko puste pola, niczego nie nadpisujemy (D-235) */
  function uzupelnijKlienta(klientId, f) {
    var k = S.find("klienci", klientId);
    var patch = {};
    POLA_FORMULARZA_KLIENTA.forEach(function (p) {
      if ((k[p] == null || k[p] === "") && f[p] != null && f[p] !== "") patch[p] = f[p];
    });
    if (Object.keys(patch).length) S.update("klienci", klientId, patch);
  }

  /* Uczestnicy z formularza trafiaja do karty klienta (D-236, D-245), bez dublowania tej samej osoby */
  function przeniesUczestnikow(klientId, f, kto) {
    var jacys = S.query("SELECT imie_nazwisko, pesel FROM uczestnicy_klienta WHERE klient_id = ?", [klientId]);
    JSON.parse(f.uczestnicy_json || "[]").forEach(function (u) {
      var jest = jacys.some(function (x) { return (u.pesel && x.pesel === u.pesel) || (!u.pesel && x.imie_nazwisko === u.imie_nazwisko); });
      if (jest) return;
      S.insert("uczestnicy_klienta", { klient_id: klientId, imie_nazwisko: u.imie_nazwisko, pesel: u.pesel || null,
        rodzaj_zatrudnienia: u.rodzaj_zatrudnienia || null, wyksztalcenie: u.wyksztalcenie || null, zawod: u.zawod || null,
        utworzono: kto.czas.slice(0, 10) }, "UK-");
    });
  }

  /* poprawki: pola formularza poprawione przez zatwierdzajacego przed akceptacja (np. NIP
     z bledna cyfra kontrolna). Zapisuja sie w formularzu, zeby bylo widac, co zmieniono. */
  function zaakceptujFormularz(id, kto, poprawki) {
    var f = oczekujacy("formularze_oczekujace", id);
    var zmienione = Object.keys(poprawki || {}).filter(function (k) { return String(poprawki[k]) !== String(f[k] == null ? "" : f[k]); });
    if (zmienione.length) {
      var patch = {};
      zmienione.forEach(function (k) { patch[k] = poprawki[k]; });
      S.update("formularze_oczekujace", id, patch);
      zmienione.forEach(function (k) { doRejestru(kto, "Poprawka formularza", id, k, f[k], poprawki[k]); });
      f = S.find("formularze_oczekujace", id);
    }
    var istniejacy = klientDoPowiazania(f);
    var klientId = istniejacy || nowyKlient(f, kto);
    if (istniejacy) uzupelnijKlienta(klientId, f);
    przeniesUczestnikow(klientId, f, kto);
    S.update("formularze_oczekujace", id, { status: "zaakceptowany", rozpatrzyl_id: kto.uzytkownik,
                                            rozpatrzono: kto.czas, klient_id: klientId });
    doRejestru(kto, "Akceptacja formularza", id, "Status", "oczekuje", "zaakceptowany, klient " + klientId);
    return klientId;
  }

  /* Straznik dopuszcza zmiane formularza przez modul panelu instytucji, wiec decyzje sprawdzamy tez tu */
  function wymagajZatwierdzania() {
    if (!global.Auth.moze("zmiany.zatwierdzanie")) blad("brak_uprawnien", "Decyzję o formularzu podejmuje pracownik LDIT albo administrator.");
  }

  function odrzucFormularz(id, powod, kto) {
    wymagajZatwierdzania();
    if (!powod || !String(powod).trim()) blad("brak_powodu", "Podaj powód odrzucenia, trafi do instytucji.");
    oczekujacy("formularze_oczekujace", id);
    S.update("formularze_oczekujace", id, { status: "odrzucony", rozpatrzyl_id: kto.uzytkownik,
                                            rozpatrzono: kto.czas, powod_odrzucenia: String(powod).trim() });
    doRejestru(kto, "Odrzucenie formularza", id, "Status", "oczekuje", "odrzucony: " + powod);
  }

  var PREFIKS_ZWROTU = "Niekompletne dane";

  /* Brak osobnego statusu w schemacie: zwrot to odrzucenie z powodem zaczynajacym sie od PREFIKS_ZWROTU */
  function zwrocFormularz(id, kto) {
    wymagajZatwierdzania();
    oczekujacy("formularze_oczekujace", id);
    var wiersz = (global.DB.KOLEJKA || []).filter(function (k) { return k.id === id; })[0];
    var braki = wiersz ? wiersz.braki : [];
    if (!braki.length) blad("kompletny", "Formularz jest kompletny, nie ma czego uzupełniać. Zaakceptuj go albo odrzuć z powodem.");
    var powod = PREFIKS_ZWROTU + ". Brakuje: " + braki.join(", ") + ". Uzupełnij i wyślij formularz ponownie.";
    S.update("formularze_oczekujace", id, { status: "odrzucony", rozpatrzyl_id: kto.uzytkownik,
                                            rozpatrzono: kto.czas, powod_odrzucenia: powod });
    doRejestru(kto, "Zwrot formularza do uzupełnienia", id, "Status", "oczekuje", "odrzucony: " + powod);
  }

  /* ------------------------------ zmiany danych ------------------------------ */

  /* nowe: {kolumna: wartosc}. Do propozycji trafiaja tylko pola, ktore naprawde sie zmieniaja. */
  function zglosZmiane(tabela, rekordId, instytucjaId, nowe, uzasadnienie, kto) {
    if (!POLA[tabela]) blad("zla_tabela", "Zmiany można zgłaszać dla instytucji i klientów.");
    var obecny = S.find(tabela, rekordId);
    if (!obecny) blad("nie_ma", "Nie znaleziono rekordu " + rekordId + ".");
    var zmiany = {};
    Object.keys(nowe).forEach(function (k) {
      var po = nowe[k] === "" ? null : nowe[k];
      if (String(obecny[k] == null ? "" : obecny[k]) !== String(po == null ? "" : po)) zmiany[k] = { przed: obecny[k], po: po };
    });
    if (!Object.keys(zmiany).length) blad("brak_zmian", "Nic się nie zmieniło, nie ma czego zgłaszać.");
    /* Nowe wartosci sprawdzamy od razu, a nie dopiero przy zatwierdzeniu (fail fast) */
    var patch = {};
    Object.keys(zmiany).forEach(function (k) { patch[k] = zmiany[k].po; });
    var bledy = global.Walidacja.bledy(tabela, patch);
    if (bledy.length) blad("walidacja", bledy.map(function (b) { return b.pole + ": " + b.komunikat; }).join("; "));
    var nowy = S.insert("propozycje_zmian", {
      instytucja_id: instytucjaId, tabela: tabela, rekord_id: rekordId, zmiany: JSON.stringify(zmiany),
      uzasadnienie: uzasadnienie || null, zglosil_id: kto.uzytkownik, zgloszono: kto.czas, status: "oczekuje"
    }, "PZ-");
    doRejestru(kto, "Zgłoszenie zmiany danych", rekordId, Object.keys(zmiany).join(", "), null, "do akceptacji " + nowy.id);
    return nowy;
  }

  function zatwierdzZmiane(id, kto) {
    var p = oczekujacy("propozycje_zmian", id);
    var zmiany = JSON.parse(p.zmiany);
    var patch = {};
    Object.keys(zmiany).forEach(function (k) { patch[k] = zmiany[k].po; });
    S.update(p.tabela, p.rekord_id, patch);
    S.update("propozycje_zmian", id, { status: "zatwierdzona", rozpatrzyl_id: kto.uzytkownik, rozpatrzono: kto.czas });
    Object.keys(zmiany).forEach(function (k) {
      doRejestru(kto, "Zatwierdzenie zmiany danych", p.rekord_id, (POLA[p.tabela][k] || k), zmiany[k].przed, zmiany[k].po);
    });
  }

  function odrzucZmiane(id, powod, kto) {
    if (!powod || !String(powod).trim()) blad("brak_powodu", "Podaj powód odrzucenia, trafi do instytucji.");
    oczekujacy("propozycje_zmian", id);
    S.update("propozycje_zmian", id, { status: "odrzucona", rozpatrzyl_id: kto.uzytkownik, rozpatrzono: kto.czas,
                                       powod_odrzucenia: String(powod).trim() });
    doRejestru(kto, "Odrzucenie zmiany danych", id, "Status", "oczekuje", "odrzucona: " + powod);
  }

  /* Kto wykonuje operacje, z zalogowanej sesji */
  function ktoTeraz() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    var s = global.Auth.sesja();
    return { czas: d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()),
             uzytkownik: s.uzytkownik_id, imie: s.imie };
  }

  global.Akceptacje = {
    POLA: POLA, AkceptacjeError: AkceptacjeError, ktoTeraz: ktoTeraz,
    /* Duplikat NIP tylko w zakresie konta: nie zdradza klientow innych instytucji */
    klientWZakresieZNip: function (nip, instytucjaId) { return klientDoPowiazania({ nip: nip, instytucja_id: instytucjaId }); },
    zglosFormularz: zglosFormularz, zaakceptujFormularz: zaakceptujFormularz, odrzucFormularz: odrzucFormularz,
    zwrocFormularz: zwrocFormularz, PREFIKS_ZWROTU: PREFIKS_ZWROTU,
    zglosZmiane: zglosZmiane, zatwierdzZmiane: zatwierdzZmiane, odrzucZmiane: odrzucZmiane
  };
})(window);
