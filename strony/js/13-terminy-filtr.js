/* Ekran Terminy: filtr terminow z wnioskiem i wolnych terminow instytucji (uwaga 08.10).
   Termin z wnioskiem ma uczestnika wniosku przypisanego w uczestnik_szkolenia.termin_id. Termin bez
   uczestnika to wolny termin instytucji (jej dostepnosc), domyslnie ukryty. Filtr jest w adresie
   (?terminy=wszystkie). Tylko deklaracje, bez kodu wykonywanego od razu. */

var POLA_FILTRA_13 = { terminy: "fTerminy" };
var WSZYSTKIE_TERMINY_13 = "wszystkie";

function maWniosek13(t) { return zapisani(t) > 0; }
function wolnyTermin13(t) { return !maWniosek13(t); }
function pokazujeWolne13() { return STAN_13.filtrTerminow === WSZYSTKIE_TERMINY_13; }

/* Terminy, ktore pokazuja kalendarz i lista przy biezacym filtrze */
function terminyWidoczne13() {
  return pokazujeWolne13() ? STAN_13.T : STAN_13.T.filter(maWniosek13);
}

function ustawFiltrTerminow13(wartosc) {
  STAN_13.filtrTerminow = wartosc === WSZYSTKIE_TERMINY_13 ? WSZYSTKIE_TERMINY_13 : "";
  el("fTerminy").value = STAN_13.filtrTerminow;
  Nawigacja.zapiszWAdresie({ terminy: STAN_13.filtrTerminow });
  renderKalendarz();
  renderLista();
}

function inicjujFiltrTerminow13() {
  var wartosci = Nawigacja.wczytajFiltry(POLA_FILTRA_13);
  STAN_13.filtrTerminow = wartosci.terminy === WSZYSTKIE_TERMINY_13 ? WSZYSTKIE_TERMINY_13 : "";
  el("fTerminy").value = STAN_13.filtrTerminow;
  el("fTerminy").addEventListener("change", function () { ustawFiltrTerminow13(el("fTerminy").value); });
}

/* Znacznik tekstowy wolnego terminu: nie moze wygladac jak wydarzenie wniosku */
function znacznikWolnego13() {
  return '<span class="tag mute wolny-termin">' + ETYKIETA_WOLNEGO_13 + '</span>';
}
