/* Nabory: filtr "Zrzut z dnia" (D-333). Domyslnie tabela pokazuje biezacy stan naborow
   z najnowszych zrzutow arkusza; wybor starszego zrzutu pokazuje nabory tak, jak byly
   w arkuszu tamtego dnia, tylko do podgladu. KPI i wykresy zostaja przy biezacym stanie. Tylko deklaracje. */

var ETYKIETA_ZRZUTU_05 = { ogloszone: "ogłoszone", prognozowane: "prognozy" };

function opisZrzutu05(z) {
  return NaboryZrzuty.fmtCzas(z.wczytano) + ", " + ETYKIETA_ZRZUTU_05[z.rodzaj] +
    " (" + z.wierszy + " wierszy" + (z.najnowszy ? ", najnowszy" : "") + ")";
}

function wypelnijZrzuty05() {
  var sel = el05("fZrzut");
  sel.innerHTML = '<option value="">Zrzut z dnia: najnowszy stan</option>' +
    NaboryZrzuty.lista().map(function (z) { return '<option value="' + esc(z.klucz) + '">' + esc(opisZrzutu05(z)) + "</option>"; }).join("");
  sel.addEventListener("change", function () { zmienZrzut05(sel.value); });
}

function zmienZrzut05(klucz) {
  var info = el05("zrzutInfo");
  if (!STAN_05.biezace) STAN_05.biezace = STAN_05.N;
  if (!klucz) {
    STAN_05.N = STAN_05.biezace;
    info.hidden = true;
    renderTabela05();
    return;
  }
  var nabory;
  try {
    nabory = NaboryZrzuty.nabory(klucz);
  } catch (e) {
    if (!(e instanceof NaboryZrzuty.NaboryZrzutyError)) throw e;
    info.hidden = false;
    info.textContent = e.message;
    return;
  }
  STAN_05.N = nabory.sort(function (a, b) { return kluczSortowania(a) - kluczSortowania(b); });
  info.hidden = false;
  info.textContent = "Podgląd zrzutu arkusza z " + el05("fZrzut").selectedOptions[0].textContent +
    ". Tylko do odczytu, bieżący stan naborów wraca po wyborze „najnowszy stan”.";
  renderTabela05();
}
