/* Nabory: wykresy prognoz i os czasu najblizszych naborow (tylko deklaracje).
   Prognoza ma przewidywana date startu (D-271), wiec miesiac bierzemy z daty, nie z tekstu. */

/* Prognozy na kolejne miesiace, liczone od miesiaca daty biezacej */
function liczPrognozyMiesieczne05() {
  var dzis = STAN_05.dzis;
  var dane = [];
  for (var i = 0; i < HORYZONT_MIESIECY; i++) {
    var m = (dzis.getUTCMonth() + i) % 12;
    var r = dzis.getUTCFullYear() + Math.floor((dzis.getUTCMonth() + i) / 12);
    var wyb = STAN_05.prognozowane.filter(function (n) {
      var d = new Date(n.od);
      return d.getUTCFullYear() === r && d.getUTCMonth() === m;
    });
    dane.push({ lab: SKROTY_MIESIECY[m] + " " + String(r).slice(2), ile: wyb.length, klientow: suma(wyb) });
  }
  return dane;
}

function rysujSlupki05(id, pole, dane) {
  var max = Math.max.apply(null, dane.map(function (d) { return d[pole]; })) || 1;
  el05(id).innerHTML = dane.map(function (d, idx) {
    var h = Math.round(d[pole] / max * 100);
    return '<div class="b"><div class="val">' + (d[pole] ? d[pole] : "") + '</div>' +
      '<div class="fill' + (idx > 1 ? " alt" : "") + '" style="height:' + h + '%"></div>' +
      '<div class="lab">' + esc(d.lab) + '</div></div>';
  }).join("");
}

function renderPrognozy05() {
  var dane = liczPrognozyMiesieczne05();
  rysujSlupki05("barsProg", "ile", dane);
  rysujSlupki05("barsKl", "klientow", dane);
}

/* Os czasu najblizszych koncow trwajacych naborow i najblizsze prognozy */
function renderOsCzasu05() {
  var bliskie = STAN_05.trwa.filter(function (n) { return n.do && dniDo(n.do) <= 14; });
  var przyszle = STAN_05.prognozowane.filter(function (n) { return dniDo(n.od) >= 0; })
    .sort(function (a, b) { return a.od < b.od ? -1 : 1; });
  var najblizsza = przyszle.length ? przyszle[0].od : null;
  var naNajblizsza = przyszle.filter(function (n) { return n.od === najblizsza; });
  el05("os").innerHTML = bliskie.map(function (n, idx) {
    return '<div class="tl-item' + (idx === 0 ? " now" : "") + '">' +
      '<div class="t">' + esc(n.pup) + ', koniec naboru ' + esc(DB.fmtDate(n.do)) + ', za ' + dniDo(n.do) + ' dni</div>' +
      '<div class="m">' + klientow(n) + ' klientów w tym urzędzie, nabór trwa od ' + esc(DB.fmtDate(n.od)) +
      ' (' + (n.dni || "?") + ' dni), województwo ' + esc(n.woj) + '.</div></div>';
  }).join("") + (naNajblizsza.length
    ? '<div class="tl-item"><div class="t">Dalej: urzędy z najbliższą prognozą</div><div class="m">' +
      naNajblizsza.map(function (n) { return esc(n.pup) + " (" + klientow(n) + " klientów, " + esc(n.prognoza || DB.fmtDate(n.od)) + ")"; }).join(", ") +
      ', data niepotwierdzona.</div></div>'
    : "");
}
