/* ============================================================================
   Akceptacje, czesc 2: zmiany danych zgloszone przez instytucje (D-224), wydzielone
   z assets/akceptacje.js. Instytucja zglasza zmiane danych swoich albo swojego klienta
   (i katalogu szkolen, D-320), a LDIT zatwierdza albo odrzuca z powodem.
   Kto rozpatruje: assets/akceptacje-uprawnienia.js (D-330). Uprawnienie sprawdzamy
   przed pierwszym zapisem, zeby zatwierdzenie nie wprowadzilo danych bez zmiany statusu.

   API:  Akceptacje.zglosZmiane(tabela, id, instytucja, nowe, uzasadnienie, kto)
         Akceptacje.zatwierdzZmiane(id, kto), Akceptacje.odrzucZmiane(id, powod, kto)
   ============================================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var A = global.Akceptacje;
  var W = A.wspolne;

  /* Propozycja czekajaca na decyzje i prawo konta do jej rozpatrzenia (D-330) */
  function doRozpatrzenia(id) {
    var p = W.oczekujacy("propozycje_zmian", id);
    var U = global.AkceptacjeUprawnienia;
    if (!U.mozeRozpatrzyc(p.tabela, p.instytucja_id)) W.blad("brak_uprawnien", U.powodOdmowy(p.tabela));
    return p;
  }

  /* nowe: {kolumna: wartosc}. Do propozycji trafiaja tylko pola, ktore naprawde sie zmieniaja. */
  function zglosZmiane(tabela, rekordId, instytucjaId, nowe, uzasadnienie, kto) {
    if (!A.POLA[tabela]) W.blad("zla_tabela", "Zmiany można zgłaszać dla instytucji i klientów.");
    var obecny = S.find(tabela, rekordId);
    if (!obecny) W.blad("nie_ma", "Nie znaleziono rekordu " + rekordId + ".");
    var zmiany = {};
    Object.keys(nowe).forEach(function (k) {
      var po = nowe[k] === "" ? null : nowe[k];
      if (String(obecny[k] == null ? "" : obecny[k]) !== String(po == null ? "" : po)) zmiany[k] = { przed: obecny[k], po: po };
    });
    if (!Object.keys(zmiany).length) W.blad("brak_zmian", "Nic się nie zmieniło, nie ma czego zgłaszać.");
    /* Nowe wartosci sprawdzamy od razu, a nie dopiero przy zatwierdzeniu (fail fast) */
    var patch = {};
    Object.keys(zmiany).forEach(function (k) { patch[k] = zmiany[k].po; });
    var bledy = global.Walidacja.bledy(tabela, patch);
    if (bledy.length) W.blad("walidacja", bledy.map(function (b) { return b.pole + ": " + b.komunikat; }).join("; "));
    var nowy = S.insert("propozycje_zmian", {
      instytucja_id: instytucjaId, tabela: tabela, rekord_id: rekordId, zmiany: JSON.stringify(zmiany),
      uzasadnienie: uzasadnienie || null, zglosil_id: kto.uzytkownik, zgloszono: kto.czas, status: "oczekuje"
    }, "PZ-");
    W.doRejestru(kto, "Zgłoszenie zmiany danych", rekordId, Object.keys(zmiany).join(", "), null, "do akceptacji " + nowy.id);
    return nowy;
  }

  function zatwierdzZmiane(id, kto) {
    var p = doRozpatrzenia(id);
    var zmiany = JSON.parse(p.zmiany);
    var patch = {};
    Object.keys(zmiany).forEach(function (k) { patch[k] = zmiany[k].po; });
    /* Katalog szkolen ma dodanie, usuniecie i cennik (assets/akceptacje-katalog.js, D-320) */
    if (p.tabela === "katalog_szkolen") global.AkceptacjeKatalog.zatwierdz(p, kto);
    else S.update(p.tabela, p.rekord_id, patch);
    S.update("propozycje_zmian", id, { status: "zatwierdzona", rozpatrzyl_id: kto.uzytkownik, rozpatrzono: kto.czas });
    if (p.tabela !== "katalog_szkolen") Object.keys(zmiany).forEach(function (k) {
      W.doRejestru(kto, "Zatwierdzenie zmiany danych", p.rekord_id, (A.POLA[p.tabela][k] || k), zmiany[k].przed, zmiany[k].po);
    });
    global.Powiadomienia.oZmianie(p, true);
  }

  function odrzucZmiane(id, powod, kto) {
    if (!powod || !String(powod).trim()) W.blad("brak_powodu", "Podaj powód odrzucenia, trafi do instytucji.");
    doRozpatrzenia(id);
    S.update("propozycje_zmian", id, { status: "odrzucona", rozpatrzyl_id: kto.uzytkownik, rozpatrzono: kto.czas,
                                       powod_odrzucenia: String(powod).trim() });
    W.doRejestru(kto, "Odrzucenie zmiany danych", id, "Status", "oczekuje", "odrzucona: " + powod);
    global.Powiadomienia.oZmianie(S.find("propozycje_zmian", id), false, String(powod).trim());
  }

  A.zglosZmiane = zglosZmiane;
  A.zatwierdzZmiane = zatwierdzZmiane;
  A.odrzucZmiane = odrzucZmiane;
})(window);
