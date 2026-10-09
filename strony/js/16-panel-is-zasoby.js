/* Panel instytucji: terminy, katalog szkolen (tylko deklaracje) */

/* Moje terminy: tylko podsumowanie, szczegoly w module Terminy */
function renderTerminy16() {
  var TR = STAN_16.TR;
  var wolne = TR.filter(function (t) { return t.status === "Wolny"; }).length;
  var zaplanowane = TR.filter(function (t) { return t.status === "Zaplanowany"; }).length;
  el16("podsTerminy").innerHTML = TR.length
    ? "<b>" + TR.length + "</b> terminów: " + zaplanowane + " zaplanowanych, " + wolne + " wolnych, " +
      (TR.length - zaplanowane - wolne) + " odbytych."
    : '<span class="muted">Instytucja nie ma jeszcze wystawionych terminów.</span>';
}

/* Katalog szkolen; zmiany przez akceptacje LDIT w 16-panel-is-katalog.js (D-320) */
function wierszSzkolenia16(s) {
  var ile = STAN_16.W.filter(function (w) { return w.szkId === s.id; }).length;
  return '<tr>' +
    '<td class="strong">' + esc(s.nazwa) + '</td>' +
    '<td class="num">' + esc(s.godz) + '</td>' +
    '<td class="num">' + esc(s.dni) + '</td>' +
    '<td><span class="pill w">' + esc(s.tryb) + '</span></td>' +
    '<td class="num">' + (s.ceny.length ? s.ceny.map(DB.fmtPLN).join(", ") : "brak") + '</td>' +
    '<td class="num">' + ile + '</td><td class="right nowrap">' + akcjeSzkolenia16(s) + '</td></tr>';
}

function renderKatalog16() {
  el16("szkolenia").innerHTML = STAN_16.SZ.length ? wiersze16(STAN_16.SZ, wierszSzkolenia16) :
    '<tr><td colspan="7"><div class="empty"><div class="et">Katalog pusty</div>Instytucja nie ma jeszcze szkoleń w katalogu.</div></td></tr>';
}
