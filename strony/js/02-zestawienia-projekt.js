/* Ekran 02, czesc 4: przycisk Nowy projekt tylko przenosi na zakladke Nowy projekt ekranu Nowy formularz
   (uwaga 08.10: jeden spojny ekran zakladania projektu, js/21-projekt.js). Przenosi rok i instytucje,
   jesli byly wybrane. Stary adres ?nowyProjekt=KL-0001[&formularz=FO-0001] (z karty klienta albo
   z akceptacji formularza) prowadzi w to samo miejsce. Korzysta ze STAN_02. Same deklaracje. */

/* Parametry czytane przy ladowaniu pliku, zanim lista przepisze adres filtrami */
var NOWY_PROJEKT_Z_ADRESU = new URLSearchParams(location.search).get("nowyProjekt") || "";
var FORMULARZ_Z_ADRESU = new URLSearchParams(location.search).get("formularz") || "";

function adresNowegoProjektu02(klientId, formularzId) {
  var rok = STAN_02.rokAktywny === NIEPRZYPISANE ? "" : STAN_02.rokAktywny;
  return Nawigacja.adresNowegoProjektu({ klient: klientId, formularz: formularzId, rok: rok, is: STAN_02.forcedInst ? STAN_02.forcedInst.id : "" });
}

/* Przycisk podpiety w 02-zestawienia-lista.js; argumentem bywa zdarzenie klikniecia, nie id klienta */
function pokazProjForm(klientId) {
  location.href = adresNowegoProjektu02(typeof klientId === "string" ? klientId : "", "");
}

function otworzNowyProjektZAdresu() {
  if (!NOWY_PROJEKT_Z_ADRESU) return;
  location.replace(adresNowegoProjektu02(NOWY_PROJEKT_Z_ADRESU, FORMULARZ_Z_ADRESU));
}
