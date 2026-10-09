/* ============================================================================
   Edycja wyslanego formularza zgloszeniowego (uwaga 08.10, D-314).

   Formularz edytuje:
     - osoba, ktora go wyslala, dopoki czeka na akceptacje albo wrocil do uzupelnienia;
       zapis zwroconego formularza wysyla go ponownie do akceptacji,
     - Administrator IS (konto instytucji z zakresem calej instytucji) wszystkie formularze swojej
       instytucji, takze wyslane przez jej pracownikow; zapis zwroconego tez wysyla go ponownie,
     - pracownik LDIT i administrator (funkcja zmiany.zatwierdzanie) przed akceptacja.
   Formularz zaakceptowany albo ostatecznie odrzucony jest zamkniety: dane klienta
   zmienia sie wtedy w karcie klienta. Instytucja, zrodlo i plik formularza zostaja.
   Kazde zmienione pole trafia do rejestru aktywnosci.

   API:  Akceptacje.edycjaFormularza(f)            { mozna, zwrot, powod } dla wiersza formularze_oczekujace
         Akceptacje.edytujFormularz(id, dane, kto)  dane jak w zglosFormularz; zwraca wiersz po zapisie
   ============================================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var A = global.Akceptacje;
  var W = A.wspolne;
  /* Pola, ktorych edycja nie zmienia: przypisanie, pochodzenie i decyzja LDIT */
  var STALE = ["id", "data", "instytucja_id", "wypelnil", "zrodlo", "handlowiec_id", "zglosil_id", "status",
               "rozpatrzyl_id", "rozpatrzono", "powod_odrzucenia", "klient_id", "uczestnicy", "plik"];

  function czyZwrot(f) {
    return f.status === "odrzucony" && String(f.powod_odrzucenia || "").indexOf(A.PREFIKS_ZWROTU) === 0;
  }

  /* Autor formularza albo konto tej samej instytucji z zakresem calej instytucji (Administrator IS) */
  function wysylaZaInstytucje(f) {
    var s = global.Auth.sesja();
    if (f.zglosil_id === s.uzytkownik_id) return true;
    return !!(s.instytucja_id && s.instytucja_id === f.instytucja_id && global.Auth.moze("zakres.cala_instytucja") && !global.Auth.handlowiec());
  }

  function edycjaFormularza(f) {
    if (!f) return { mozna: false, zwrot: false, powod: "Nie ma takiego formularza." };
    var zwrot = czyZwrot(f);
    if (f.status !== "oczekuje" && !zwrot) {
      return { mozna: false, zwrot: false, powod: "Formularz jest już rozpatrzony. Dane klienta zmienisz w karcie klienta." };
    }
    /* zwrot = zapis wysyla formularz ponownie; robi to autor albo konto calej instytucji. LDIT poprawia bez zmiany statusu. */
    if (wysylaZaInstytucje(f)) return { mozna: true, zwrot: zwrot, powod: "" };
    if (global.Auth.moze("zmiany.zatwierdzanie")) return { mozna: true, zwrot: false, powod: "" };
    return { mozna: false, zwrot: false, powod: "Ten formularz edytuje osoba, która go wysłała, albo pracownik LDIT przed akceptacją." };
  }

  function zmianyPol(f, dane) {
    var zmiany = {};
    Object.keys(dane).forEach(function (k) {
      if (STALE.indexOf(k) >= 0) return;
      var nowa = dane[k] === "" ? null : dane[k];
      if (String(nowa == null ? "" : nowa) !== String(f[k] == null ? "" : f[k])) zmiany[k] = nowa;
    });
    /* Ugoda dotyczy tylko firm z zobowiazaniami (D-256), jak przy wysylaniu */
    var zadluzenie = "zadluzenie" in zmiany ? zmiany.zadluzenie : f.zadluzenie;
    if (!zadluzenie || zadluzenie === "brak") {
      delete zmiany.zadluzenie_ugoda;
      if (f.zadluzenie_ugoda != null) zmiany.zadluzenie_ugoda = null;
    }
    return zmiany;
  }

  function edytujFormularz(id, dane, kto) {
    var f = S.find("formularze_oczekujace", id);
    var ocena = edycjaFormularza(f);
    if (!ocena.mozna) W.blad(f ? "brak_uprawnien" : "nie_ma", ocena.powod);
    if ("firma" in dane && (!dane.firma || !String(dane.firma).trim())) W.blad("brak_firmy", "Podaj nazwę firmy.");
    var patch = zmianyPol(f, dane);
    if (patch.firma) patch.firma = String(patch.firma).trim();
    if (dane.uczestnicy) {
      var uczestnicy = W.czystyUczestnicy(dane.uczestnicy);
      var json = JSON.stringify(uczestnicy);
      if (json !== (f.uczestnicy_json || "[]")) { patch.uczestnicy_json = json; patch.osob = uczestnicy.length; }
    }
    if (ocena.zwrot) {
      patch.status = "oczekuje";
      patch.rozpatrzyl_id = null; patch.rozpatrzono = null; patch.powod_odrzucenia = null;
      patch.data = kto.czas.slice(0, 10);
    }
    if (!Object.keys(patch).length) return f;
    S.update("formularze_oczekujace", id, patch);
    Object.keys(patch).forEach(function (k) {
      if (k === "uczestnicy_json") W.doRejestru(kto, "Edycja formularza", id, "Uczestnicy", JSON.parse(f.uczestnicy_json || "[]").length + " os.", patch.osob + " os.");
      else if (["status", "rozpatrzyl_id", "rozpatrzono", "powod_odrzucenia", "data", "osob"].indexOf(k) < 0) W.doRejestru(kto, "Edycja formularza", id, k, f[k], patch[k]);
    });
    if (ocena.zwrot) W.doRejestru(kto, "Ponowne wysłanie formularza", id, "Status", "zwrócony do uzupełnienia", "oczekuje");
    return S.find("formularze_oczekujace", id);
  }

  A.wysylaZaInstytucje = wysylaZaInstytucje;
  A.edycjaFormularza = edycjaFormularza;
  A.edytujFormularz = edytujFormularz;
})(window);
