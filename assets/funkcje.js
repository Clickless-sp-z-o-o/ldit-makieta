/* ============================================================================
   Uprawnienia w modelu features, wzorowanym na Open Mercato (D-176, D-211).

   Feature ma postac "modul.akcja" (dofin.view, dofin.manage, finanse.prowizja).
   Rola dostaje nadania w tabeli role_funkcje; nadanie "modul.*" obejmuje
   wszystkie akcje modulu, tak jak wildcard w role_acls frameworka. Uprawnienia
   sprawdza sie zawsze po feature, nigdy po nazwie roli.

   API:  Funkcje.nadania(rolaId)          lista nadan roli
         Funkcje.pasuje(nadania, feature) czy nadania obejmuja feature
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;
  if (!S) throw new Error("Brak window.Store. Dolacz assets/store.js przed funkcje.js");

  var WAZNOSC_PAMIECI_MS = 1000;
  var pamiec = { rola: null, nadania: null, czas: 0 };

  function nadania(rolaId) {
    if (pamiec.rola === rolaId && Date.now() - pamiec.czas < WAZNOSC_PAMIECI_MS) return pamiec.nadania;
    var lista = S.query("SELECT funkcja FROM role_funkcje WHERE rola_id = ?", [rolaId])
      .map(function (r) { return r.funkcja; });
    pamiec = { rola: rolaId, nadania: lista, czas: Date.now() };
    return lista;
  }

  /* Dokladne dopasowanie albo wildcard "modul.*". Brak nadania = brak dostepu. */
  function pasuje(lista, feature) {
    for (var i = 0; i < lista.length; i++) {
      var n = lista[i];
      if (n === feature) return true;
      if (n.slice(-2) === ".*" && feature.indexOf(n.slice(0, -1)) === 0) return true;
    }
    return false;
  }

  function wyczyscPamiec() { pamiec = { rola: null, nadania: null, czas: 0 }; }

  S.subscribe(function (tabela) { if (!tabela || tabela === "role_funkcje") wyczyscPamiec(); });

  global.Funkcje = { nadania: nadania, pasuje: pasuje, wyczyscPamiec: wyczyscPamiec };
})(window);
