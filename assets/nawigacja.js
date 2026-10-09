/* ============================================================================
   Nawigacja miedzy ekranami makiety.

   Jedno miejsce na to, co laczy ekrany ze soba:
     - ktory modul obsluguje ekran (brama dostepu, D-36) i pod ktora pozycja
       menu ekran lezy (zaznaczenie w menu i okruszek w powloce),
     - filtry listy zapisane w adresie, zeby link z innego ekranu otwieral
       liste juz przefiltrowana, a powrot z karty rekordu odtwarzal widok,
     - adres powrotu z karty rekordu, sprawdzany przed uzyciem,
     - licznik formularzy do akceptacji dla powloki (D-105, D-140).

   Ekran w ramce zglasza sie powloce komunikatem postMessage. Na file://
   powloka nie moze czytac adresu ramki, a komunikat dziala zawsze.
   ============================================================================ */

(function (global) {
  "use strict";

  /* Baza danych jest osobnym modulem menu (D-265): lista klientow i karta klienta leza pod
     modulem "baza", nie pod Dofinansowaniami. Karta wniosku zostaje w "dofin".
     Modul, ktory obsluguje ekran. Na nim opiera sie brama dostepu strony,
     ten sam slownik czyta tools/wire-pages.mjs. */
  var MODUL_EKRANU = {
    "01-dashboard.html": "dash",
    "02-zestawienia.html": "dofin",
    "03-wniosek.html": "dofin",
    "04-baza-klientow.html": "baza",
    "05-nabory.html": "nabory",
    "06-instytucje.html": "inst",
    /* Konfigurator warunkow prowizyjnych jest ekranem administratora, mimo ze
       wchodzi sie do niego z zakladki Instytucje szkoleniowe (D-07, D-93). */
    "07-konfigurator-is.html": "admin",
    "08-administracja.html": "admin",
    "09-wysylka-maili.html": "komun",
    "10-zgloszenia.html": "zglo",
    "11-konta-uprawnienia.html": "ustaw",
    "12-rejestr-aktywnosci.html": "ustaw",
    "13-terminy.html": "terminy",
    "14-statystyki.html": "dash",
    "15-konfigurator-prowizji.html": "admin",
    "16-panel-is.html": "panelIS",
    "18-zadania.html": "zadania",
    "19-klient.html": "baza",
    "20-akceptacje.html": "akcept",
    "21-nowy-formularz.html": "formularz",
    /* Projekt i klient instytucji tylko do odczytu, otwierane z panelu instytucji (D-319) */
    "22-projekt-is.html": "panelIS"
  };

  /* Ekrany, ktore w menu leza pod inna pozycja niz modul dostepu */
  var MENU_EKRANU = {
    "07-konfigurator-is.html": "inst",
    "15-konfigurator-prowizji.html": "inst"
  };

  /* Powrot z karty wniosku prowadzi wylacznie na listy Zestawien, Bazy danych, kalendarz terminow albo na
     karte klienta. Adres z parametru nie moze wskazac innej strony ani innego serwera. */
  var WZOR_POWROTU = /^(02-zestawienia|04-baza-klientow|13-terminy|19-klient)\.html(\?[^#<>"']*)?$/;

  function plikZAdresu(adres) {
    return String(adres || "").split(/[?#]/)[0].split("/").pop();
  }

  function modulEkranu(adres) { return MODUL_EKRANU[plikZAdresu(adres)] || null; }

  function menuEkranu(adres) {
    var plik = plikZAdresu(adres);
    return MENU_EKRANU[plik] || MODUL_EKRANU[plik] || null;
  }

  /* {rok: "2026", q: ""} -> "?rok=2026". Puste wartosci nie trafiaja do adresu. */
  function zbudujZapytanie(wartosci) {
    var czesci = Object.keys(wartosci).filter(function (k) {
      return wartosci[k] !== null && wartosci[k] !== undefined && wartosci[k] !== "";
    }).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(wartosci[k]);
    });
    return czesci.length ? "?" + czesci.join("&") : "";
  }

  /* Odczyt wskazanych parametrow, brakujacy parametr to pusty tekst */
  function odczytajZapytanie(zapytanie, nazwy) {
    var p = new URLSearchParams(zapytanie || "");
    var wynik = {};
    nazwy.forEach(function (n) { wynik[n] = p.get(n) || ""; });
    return wynik;
  }

  function bezpiecznyPowrot(adres) {
    return WZOR_POWROTU.test(String(adres || "")) ? adres : null;
  }

  var ETYKIETA_POWROTU = { "02-zestawienia.html": "Zestawienia", "04-baza-klientow.html": "Baza danych",
                           "13-terminy.html": "Terminy szkoleń", "19-klient.html": "Karta klienta" };
  var POWROT_DOMYSLNY = "02-zestawienia.html";

  /* Karta wniosku otwierana z listy pamieta, dokad wrocic: rok, filtry i wiersz */
  function adresKarty(idWniosku, powrot) {
    return "03-wniosek.html" + zbudujZapytanie({ id: idWniosku, powrot: bezpiecznyPowrot(powrot) });
  }

  /* Lista wnioskow z filtrem z wykresu (drill through, D-212): rok, status, miesiac itd.,
     parametry czyta js/02-zestawienia-wykres.js */
  function adresWnioskow(filtry) {
    return "02-zestawienia.html" + zbudujZapytanie(filtry);
  }

  /* Element wykresu z atrybutem data-href prowadzi do listy. Jedno podlaczenie na ekran,
     adres sprawdzany tym samym wzorcem co adresy powrotu. */
  function podlaczLinki(korzen) {
    korzen.addEventListener("click", function (e) {
      var el = e.target.closest("[data-href]");
      var cel = el && bezpiecznyEkran(el.getAttribute("data-href"));
      if (cel) global.location.href = cel;
    });
  }

  /* Nowy projekt ma jedno miejsce: zakladka Nowy projekt na ekranie Nowy formularz (uwaga 08.10).
     parametry: { klient, formularz, rok, is }, wszystkie opcjonalne */
  function adresNowegoProjektu(parametry) {
    var p = parametry || {};
    return "21-nowy-formularz.html" + zbudujZapytanie({ projekt: "1", klient: p.klient, formularz: p.formularz, rok: p.rok, is: p.is });
  }

  function adresKlienta(idKlienta) {
    return "19-klient.html" + zbudujZapytanie({ id: idKlienta });
  }

  /* {adres, etykieta} linku powrotu z karty. Niepoprawny adres daje powrot domyslny. */
  function linkPowrotu(zapytanie) {
    var adres = bezpiecznyPowrot(odczytajZapytanie(zapytanie, ["powrot"]).powrot) || POWROT_DOMYSLNY;
    return { adres: adres, etykieta: ETYKIETA_POWROTU[plikZAdresu(adres)] };
  }

  /* Adres ekranu makiety z tego samego katalogu (np. "03-wniosek.html?id=X") albo null */
  var WZOR_EKRANU = /^\d\d-[a-z-]+\.html(\?[^#<>"']*)?$/;
  function bezpiecznyEkran(adres) {
    var tekst = String(adres || "");
    return WZOR_EKRANU.test(tekst) && MODUL_EKRANU[plikZAdresu(tekst)] ? tekst : null;
  }

  /* Wstecz z karty rekordu: w powloce wraca po historii ekranow (powloka-ekran.js),
     a otwarty bez powloki ekran przechodzi pod adres zapasowy. */
  function wstecz(zapasowy) {
    if (global.top !== global.self) {
      global.parent.postMessage({ typ: "kfs:wstecz", zapasowy: bezpiecznyEkran(zapasowy) }, celKomunikatu());
      return;
    }
    global.location.href = bezpiecznyEkran(zapasowy) || POWROT_DOMYSLNY;
  }

  function liczbaDoAkceptacji(kolejka) {
    return kolejka.filter(function (k) { return k.status === "oczekuje"; }).length;
  }

  /* Powrot na to samo miejsce listy (D-241). Przed wyjsciem z listy do karty zapisujemy pozycje
     przewiniecia i liczbe narysowanych wierszy, przy powrocie (adres z ?wn=) odczytujemy je jednorazowo. */
  var KLUCZ_PRZEWINIECIA = "kfs:przewiniecie";

  function zapamietajPrzewiniecie(kontener, wierszy, idWiersza) {
    global.sessionStorage.setItem(KLUCZ_PRZEWINIECIA, JSON.stringify({
      plik: plikZAdresu(global.location.pathname), wn: idWiersza, top: kontener.scrollTop, wierszy: wierszy
    }));
  }

  /* {top, wierszy} dla powrotu na wiersz wn albo null. Zapis jest jednorazowy. */
  function odczytajPrzewiniecie(idWiersza) {
    var surowy = global.sessionStorage.getItem(KLUCZ_PRZEWINIECIA);
    if (!surowy || !idWiersza) return null;
    global.sessionStorage.removeItem(KLUCZ_PRZEWINIECIA);
    var zapis = JSON.parse(surowy);
    var pasuje = zapis.plik === plikZAdresu(global.location.pathname) && zapis.wn === idWiersza;
    return pasuje ? { top: zapis.top, wierszy: zapis.wierszy } : null;
  }

  /* ----------------------------- DOM ekranu ----------------------------- */

  /* Zakladka modulu, do ktorego rola nie ma prawa, znika z paska. Brama strony
     i tak odmowilaby wejscia, ale zakladka prowadzaca do odmowy to usterka. */
  function ukryjNiedostepneZakladki(auth) {
    document.querySelectorAll(".mod-tabs a[href]").forEach(function (a) {
      var modul = modulEkranu(a.getAttribute("href"));
      if (modul && !auth.widziModul(modul)) a.remove();
    });
  }

  /* Filtry listy <-> adres. pola: {parametr: id elementu formularza} */
  function wczytajFiltry(pola) {
    var wartosci = odczytajZapytanie(global.location.search, Object.keys(pola));
    Object.keys(pola).forEach(function (param) {
      if (!wartosci[param]) return;
      var el = document.getElementById(pola[param]);
      /* Filtr wielokrotnego wyboru: wartosci po przecinku (assets/wielowybor.js) */
      if (el.multiple) global.Wielowybor.ustaw(el, wartosci[param]);
      else el.value = wartosci[param];
    });
    return wartosci;
  }

  function zapiszWAdresie(wartosci) {
    global.history.replaceState(null, "", plikZAdresu(global.location.pathname) + zbudujZapytanie(wartosci));
    zglosEkran();
  }

  /* Licznik w pasku gornym: formularze i zmiany danych czekajace na decyzje LDIT (D-223, D-224) */
  function licznikDlaPowloki(auth, db) {
    return auth.widziModul("akcept") ? liczbaDoAkceptacji(db.KOLEJKA) + liczbaDoAkceptacji(db.PROPOZYCJE) : null;
  }

  /* Zgloszenia nieprzeczytane przez zalogowane konto (D-315), null gdy konto nie ma dostepu (D-107) */
  function noweZgloszenia(auth, db) {
    if (!auth.moze("zgloszenia.dostep")) return null;
    var przeczytane = {};
    global.Store.query("SELECT zgloszenie_id FROM zgloszenia_odczyty WHERE uzytkownik_id = ?", [auth.sesja().uzytkownik_id])
      .forEach(function (r) { przeczytane[r.zgloszenie_id] = true; });
    return db.ZGLOSZENIA.filter(function (z) { return !przeczytane[z.id]; }).map(function (z) { return z.id; });
  }

  function liczbaNowychZgloszen(auth, db) {
    var nowe = noweZgloszenia(auth, db);
    return nowe === null ? null : nowe.length;
  }

  /* Na file:// origin to "null" i nie da sie go wskazac, wtedy zostaje "*".
     W trybie serwera komunikat trafia wylacznie do powloki z tego samego originu. */
  function celKomunikatu() {
    return global.location.origin && global.location.origin !== "null" ? global.location.origin : "*";
  }

  /* Powloka nasluchuje tylko komunikatow z wlasnej ramki. Tresc nie niesie rekordow,
     ale zapytanie moze zawierac wpisana fraze (q), stad zawezony cel w trybie serwera. */
  function zglosEkran() {
    if (global.top === global.self) return;
    global.parent.postMessage({
      typ: "kfs:ekran",
      plik: plikZAdresu(global.location.pathname),
      zapytanie: global.location.search,
      tytul: document.title,
      doAkceptacji: licznikDlaPowloki(global.Auth, global.DB),
      noweZgloszenia: liczbaNowychZgloszen(global.Auth, global.DB),
      /* Powiadomienia instytucji (D-317): tylko konto instytucji, null dla LDIT */
      powiadomieniaIS: global.Auth.sesja().instytucja_id ? global.Powiadomienia.nieprzeczytane().length : null,
      /* Menu Dofinansowan (lata z licznikami) odswieza sie z danych ekranu, nie z kopii powloki */
      lata: global.Auth.widziModul("dofin") ? global.Lata.zLiczbami(global.DB) : null
    }, celKomunikatu());
  }

  global.Nawigacja = {
    MODUL_EKRANU: MODUL_EKRANU,
    /* Ekrany dla kazdego zalogowanego, bez modulu: brama sprawdza tylko sesje (Moje konto, D-321) */
    STRONY_KAZDEGO: ["23-moje-konto.html"],
    plikZAdresu: plikZAdresu,
    modulEkranu: modulEkranu,
    menuEkranu: menuEkranu,
    zbudujZapytanie: zbudujZapytanie,
    odczytajZapytanie: odczytajZapytanie,
    bezpiecznyPowrot: bezpiecznyPowrot,
    adresKarty: adresKarty,
    adresKlienta: adresKlienta,
    adresWnioskow: adresWnioskow,
    adresNowegoProjektu: adresNowegoProjektu,
    podlaczLinki: podlaczLinki,
    linkPowrotu: linkPowrotu,
    bezpiecznyEkran: bezpiecznyEkran,
    zapamietajPrzewiniecie: zapamietajPrzewiniecie,
    odczytajPrzewiniecie: odczytajPrzewiniecie,
    wstecz: wstecz,
    liczbaDoAkceptacji: liczbaDoAkceptacji,
    noweZgloszenia: noweZgloszenia,
    liczbaNowychZgloszen: liczbaNowychZgloszen,
    ukryjNiedostepneZakladki: ukryjNiedostepneZakladki,
    wczytajFiltry: wczytajFiltry,
    zapiszWAdresie: zapiszWAdresie,
    zglosEkran: zglosEkran
  };
})(window);
