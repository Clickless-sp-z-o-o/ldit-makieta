/* Logika bez DOM: usuwanie wniosku z karty wniosku (spotkanie 14.10.2026, uzupelnia D-261).
   - administrator usuwa od razu (z potwierdzeniem w interfejsie) albo zatwierdza prosbe pracownika,
   - pracownik LDIT nie usuwa, tylko prosi o usuniecie z powodem (wnioski.usuniecie_prosba_id, _czas, _powod),
   - administrator odrzuca prosbe: pola prosby wracaja do pustych,
   - instytucja nie ma tej funkcji (nie edytuje modulu Dofinansowania).
   Samo usuniecie to ta sama logika co dotychczas na liscie: usunWniosek z 02-zestawienia-usuwanie.js
   (miekkie, wnioski.usuniety = 1, klient zostaje, wpis w rejestrze). Ten plik dostarcza mu tylko kontekst
   listy (STAN_02, znajdzWniosek, budujW, terazStr, KolejnoscError, render), gdy strona listy nie jest
   zaladowana. Administrator to konto z edycja modulu Instytucje, jak w AkceptacjeUprawnienia (D-330);
   straznik zapisow pilnuje tego samego na danych (straznik-wlasnosc.js).
   Bledy wejscia wracaja jako { ok: false, bledy: [...] }. */
(function (global) {
  "use strict";

  var S = global.Store;
  var MAKS_POWOD = 500;

  function blad(tekst) { return { ok: false, bledy: [tekst] }; }
  function A() { return global.Auth; }

  function administrator() { return A().edytujeModul("dofin") && A().edytujeModul("inst"); }

  /* Pracownik LDIT z edycja Dofinansowan, ktory nie jest administratorem */
  function pracownikLdit() {
    var s = A().sesja();
    return !!s && s.rola_typ === "pracownik" && !s.instytucja_id && A().edytujeModul("dofin") && !administrator();
  }

  function wniosek(id) {
    return global.DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.id === id; })[0] || null;
  }

  function rejestr(typ, id, przed, po) {
    var kto = global.Akceptacje.ktoTeraz();
    S.insert("rejestr_aktywnosci", { czas: kto.czas, kto: kto.imie, typ: typ, obiekt: id, pole: "Usunięcie wniosku",
      przed: przed || "brak", po: po || "brak" }, "AKT-");
  }

  var PUSTA_PROSBA = { usuniecie_prosba_id: null, usuniecie_prosba_czas: null, usuniecie_prosba_powod: null };

  function poprosOUsuniecie(id, powod) {
    if (!pracownikLdit()) return blad("O usunięcie prosi pracownik LDIT, administrator usuwa wniosek od razu.");
    var w = wniosek(id);
    if (!w) return blad("Nie znaleziono wniosku.");
    if (w.usuniecieProsba) return blad("Prośba o usunięcie tego wniosku już czeka na administratora.");
    var tekst = String(powod == null ? "" : powod).trim();
    if (!tekst) return blad("Podaj powód usunięcia.");
    if (tekst.length > MAKS_POWOD) return blad("Powód może mieć najwyżej " + MAKS_POWOD + " znaków.");
    var kto = global.Akceptacje.ktoTeraz();
    S.update("wnioski", id, { usuniecie_prosba_id: kto.uzytkownik, usuniecie_prosba_czas: kto.czas, usuniecie_prosba_powod: tekst });
    rejestr("Prośba o usunięcie wniosku", id, "brak", tekst);
    return { ok: true };
  }

  function odrzucProsbe(id) {
    if (!administrator()) return blad("Prośbę o usunięcie rozpatruje administrator.");
    var w = wniosek(id);
    if (!w || !w.usuniecieProsba) return blad("Ten wniosek nie ma prośby o usunięcie.");
    S.update("wnioski", id, PUSTA_PROSBA);
    rejestr("Odrzucenie prośby o usunięcie", id, w.usuniecieProsba.powod, "prośba odrzucona, wniosek zostaje");
    return { ok: true };
  }

  /* Kontekst listy dla usunWniosek z 02-zestawienia-usuwanie.js, gdy ekran listy nie jest zaladowany */
  function kontekstListy() {
    if (!global.STAN_02) global.STAN_02 = { forcedInst: null, rokAktywny: "", W: [], batch: false };
    if (typeof global.budujW !== "function") global.budujW = function () { return global.DB.WNIOSKI_WSZYSTKIE.slice(); };
    if (typeof global.znajdzWniosek !== "function") {
      global.znajdzWniosek = function (id) { return global.STAN_02.W.filter(function (x) { return x.id === id; })[0]; };
    }
    if (typeof global.terazStr !== "function") global.terazStr = function () { return global.Akceptacje.ktoTeraz().czas; };
    if (typeof global.render !== "function") global.render = function () {};
    if (typeof global.KolejnoscError !== "function") {
      global.KolejnoscError = function (komunikat) { this.name = "KolejnoscError"; this.message = komunikat; };
      global.KolejnoscError.prototype = Object.create(Error.prototype);
    }
    global.STAN_02.W = global.DB.WNIOSKI_WSZYSTKIE.slice();
  }

  /* Usuniecie przez administratora: od razu albo po prosbie pracownika (wtedy prosba jest zatwierdzana) */
  function usun(id) {
    if (!administrator()) return blad("Wniosek usuwa administrator. Wyślij prośbę o usunięcie.");
    var w = wniosek(id);
    if (!w) return blad("Nie znaleziono wniosku.");
    if (typeof global.usunWniosek !== "function") return blad("Brak logiki usuwania z listy (02-zestawienia-usuwanie.js).");
    if (w.usuniecieProsba) {
      S.update("wnioski", id, PUSTA_PROSBA);
      rejestr("Zatwierdzenie prośby o usunięcie", id, w.usuniecieProsba.powod, "usunięcie zatwierdzone");
    }
    kontekstListy();
    global.usunWniosek(id);
    return { ok: true, zProsby: !!w.usuniecieProsba };
  }

  /* Wnioski z prosba o usuniecie w zakresie konta, najstarsze najpierw */
  function prosby() {
    return global.DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.usuniecieProsba; })
      .sort(function (a, b) { return String(a.usuniecieProsba.czas).localeCompare(String(b.usuniecieProsba.czas)); });
  }

  /* Imie i nazwisko proszacego z zespolu LDIT (konto LDIT), inaczej login */
  function kto(login) { return (global.DB.ZESPOL_LDIT || {})[login] || login; }

  global.UsuwanieWniosku = {
    administrator: administrator, pracownikLdit: pracownikLdit, poprosOUsuniecie: poprosOUsuniecie,
    odrzucProsbe: odrzucProsbe, usun: usun, zatwierdz: usun, prosby: prosby, kto: kto, MAKS_POWOD: MAKS_POWOD
  };
})(window);
