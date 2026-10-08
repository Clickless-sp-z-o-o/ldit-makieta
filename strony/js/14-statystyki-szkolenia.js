/* Statystyki 14: szkolenia, widok instytucji i skladanie widoku biezacego. Tylko deklaracje. */
function grupujSzkolenia(lista) {
  var wgS = {};
  lista.forEach(function (w) {
    var d = wgS[w.szkolenie] = wgS[w.szkolenie] || { n: 0, ucz: 0, wart: 0, is: w.isNazwa };
    d.n++; d.ucz += w.osob; d.wart += w.wartosc;
  });
  return Object.keys(wgS).map(function (k) { return Object.assign({ nazwa: k }, wgS[k]); })
    .sort(function (a, b) { return b.wart - a.wart; });
}

function renderSzkolenia(W) {
  var listaS = grupujSzkolenia(W);
  var maxW = listaS.length ? listaS[0].wart : 1;
  document.getElementById("szkolenia").innerHTML = listaS.slice(0, 10).map(function (r) {
    return '<tr' + link14({ szkolenie: r.nazwa }) + '><td class="strong">' + esc(r.nazwa) + '</td><td class="muted">' + esc(r.is) + '</td>' +
      '<td class="num">' + r.n + '</td><td class="num">' + r.ucz + '</td><td class="num">' + DB.fmtPLN(r.wart) + '</td>' +
      '<td style="width:130px"><div class="progress"><i style="width:' + Math.round(r.wart / maxW * 100) + '%"></i></div></td></tr>';
  }).join("");
}

/* Widok instytucji: podglad dla wybranej instytucji, a bez wyboru dla pierwszej z listy */
function renderWidokInstytucji(WSZYSTKIE, fis) {
  var inst = instytucjaPoId(fis[0]) || DB.INSTYTUCJE[0];
  document.getElementById("mojaInstytucja").textContent = inst.nazwa;
  var wIS = WSZYSTKIE.filter(function (w) { return w.is === inst.id; });
  var pozIS = wIS.filter(function (w) { return w.statusDec === "Pozytywna"; });
  var odbyte = DB.TERMINY.filter(function (t) { return t.is === inst.id && t.status === "Odbyty" && t.od.slice(0, 4) === STAN_14.rok; }).length;
  document.getElementById("kpiIS").innerHTML =
    kartaKpi("Szkolenia zrealizowane", odbyte, "terminy ze statusem Odbyty w roku " + STAN_14.rok) +
    kartaKpi("Łączna wartość", DB.fmtPLN(sumaPola(pozIS, "wartosc")), "projektów z decyzją pozytywną", false,
        link14({ inst: inst.id, status: "Pozytywna" })) +
    kartaKpi("Skuteczność moich klientów", (wIS.length ? Math.round(pozIS.length / wIS.length * 100) : 0) + "%",
        pozIS.length + " z " + wIS.length + " projektów", false, link14({ inst: inst.id }));
  document.getElementById("mojeSzkolenia").innerHTML = grupujSzkolenia(wIS).map(function (d) {
    return '<tr' + link14({ szkolenie: d.nazwa, inst: inst.id }) + '><td class="strong">' + esc(d.nazwa) + '</td><td class="num">' + d.n + '</td>' +
      '<td class="num">' + d.ucz + '</td><td class="num">' + DB.fmtPLN(d.wart) + '</td></tr>';
  }).join("");
}

function renderBiezacy(fis) {
  var WSZYSTKIE = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.rok === STAN_14.rok; });
  var W = WSZYSTKIE.filter(function (w) { return Wielowybor.pasuje(fis, w.is); });
  var zloz = W.filter(function (w) { return w.statusSkl === "Złożony"; });
  var poz = W.filter(function (w) { return w.statusDec === "Pozytywna"; });
  var neg = W.filter(function (w) { return w.statusDec === "Negatywna"; });

  renderKpi(W, poz, neg, zloz, fis);
  renderMiesiace(W);
  renderLejek(W, poz, fis);
  renderWielkosciIUrzedy(W);
  renderKompletnosc(W, poz);
  renderSzkolenia(W);
  renderWidokInstytucji(WSZYSTKIE, fis);
}
