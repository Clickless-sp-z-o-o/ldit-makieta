/* Statystyki 14: widok biezacy, KPI, wykresy i kontrola kompletnosci. Tylko deklaracje. */
/* ---------- Procent dofinansowania z tabeli progow (D-131), nie z kodu ---------- */
function procentDofinansowania(wielkosc) {
  var wiersz = DB.PROGI_DOFINANSOWANIA.filter(function (r) {
    return r.wielkosc === wielkosc && r.obowiazuje_od <= STAN_14.dzis && (!r.obowiazuje_do || r.obowiazuje_do >= STAN_14.dzis);
  })[0];
  return wiersz ? wiersz.procent_dofinansowania + "%" : "brak progu";
}

/* ---------- Widok biezacy ---------- */
function renderKpi(W, poz, neg, zloz, fis) {
  var rozstrzygniete = poz.length + neg.length;
  var skut = rozstrzygniete ? Math.round(poz.length / rozstrzygniete * 100) : 0;
  var wartosc = sumaPola(W, "wartosc");
  var uczestnicy = sumaPola(W, "osob");
  document.getElementById("podsumowanie").innerHTML =
    "<b>" + W.length + "</b> projektów &middot; <b>" + uczestnicy + "</b> uczestników &middot; wartość <b>" + DB.fmtPLN(wartosc) + "</b>";

  var prowizja = Auth.moze("finanse.prowizja")
    ? kartaKpi("Prowizja naliczona", '<a href="08-administracja.html">Administracja</a>', "jedno źródło liczb prowizji", true) : "";
  document.getElementById("kpi").innerHTML =
    kartaKpi("Projekty", DB.fmtNum(W.length), zloz.length + " złożonych w urzędach", false, link14({})) +
    kartaKpi("Skuteczność", skut + "%", '<span class="tag pos"' + link14({ status: "Pozytywna" }) + '>' + poz.length + " poz.</span> " +
      '<span class="tag neg"' + link14({ status: "Negatywna" }) + '>' + neg.length + " neg.</span>") +
    kartaKpi("Przyznane dofinansowania", DB.fmtPLN(sumaPola(poz, "przyznano")), "z wnioskowanych " + DB.fmtPLN(wartosc), false,
      link14({ status: "Pozytywna" })) +
    prowizja;
}

function renderMiesiace(W) {
  var mies = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
  var dane = mies.map(function () { return { poz: 0, neg: 0, brak: 0 }; });
  W.forEach(function (w) {
    var m = parseInt(w.dataWniosku.slice(5, 7), 10) - 1;
    if (w.statusDec === "Pozytywna") dane[m].poz++;
    else if (w.statusDec === "Negatywna") dane[m].neg++;
    else dane[m].brak++;
  });
  var maxM = Math.max.apply(null, dane.map(function (d) { return d.poz + d.neg + d.brak; })) || 1;
  /* Klik w segment: wnioski z tego miesiaca z ta decyzja; klik w liczbe albo miesiac: caly miesiac */
  document.getElementById("barsMies").innerHTML = dane.map(function (d, i) {
    var razem = d.poz + d.neg + d.brak;
    var h = Math.round(razem / maxM * 100);
    var miesiac = String(i + 1).padStart(2, "0");
    var seg = function (n, cls, filtr) {
      return n ? '<div class="fill ' + cls + '"' + link14(Object.assign({ miesiac: miesiac }, filtr)) +
        ' style="height:' + (n / razem * h) + '%;border-radius:0"></div>' : "";
    };
    var calyMiesiac = razem ? link14({ miesiac: miesiac }) : "";
    return '<div class="b"><div class="val"' + calyMiesiac + '>' + (razem || "") + '</div>' +
      seg(d.brak, "alt", { decyzja: "bez" }) + seg(d.neg, "neg", { status: "Negatywna" }) + seg(d.poz, "pos", { status: "Pozytywna" }) +
      '<div class="lab"' + calyMiesiac + '>' + mies[i] + '</div></div>';
  }).join("");
}

/* Lejek osob z danych wnioskow: zgloszeni, zakwalifikowani, w projektach z decyzja pozytywna, w rozliczonych */
function renderLejek(W, poz, fis) {
  document.getElementById("lejekOpis").textContent = fis.length
    ? fis.map(function (id) { return instytucjaPoId(id).nazwa; }).join(", ") : "wszystkie instytucje";
  /* [etykieta, liczba osob, filtr listy wnioskow z tymi osobami] */
  var lej = [
    ["Uczestnicy zgłoszeni do projektów", sumaPola(W, "osob"), {}],
    ["Zakwalifikowani", sumaPola(W, "osobZakw"), {}],
    ["W projektach z decyzją pozytywną", sumaPola(poz, "osobZakw"), { status: "Pozytywna" }],
    ["W projektach rozliczonych", sumaPola(W.filter(function (w) { return w.rozliczenie === "Rozliczone"; }), "osobZakw"), { rozl: "Rozliczone" }]
  ];
  var maxL = lej[0][1] || 1;
  document.getElementById("lejek").innerHTML = lej.map(function (r, i) {
    var konw = i && lej[i - 1][1] ? Math.round(r[1] / lej[i - 1][1] * 100) : 100;
    return '<div class="fn-row"' + link14(r[2]) + '><div class="fl">' + r[0] + '</div>' +
      '<div class="ft"><i style="width:' + Math.round(r[1] / maxL * 100) + '%"></i></div>' +
      '<div class="fv">' + DB.fmtNum(r[1]) + (i ? ' <span class="small muted">' + konw + '%</span>' : "") + '</div></div>';
  }).join("");
}

function renderWielkosciIUrzedy(W) {
  renderWielkosci14(W);

  var wgP = {};
  W.forEach(function (w) {
    var d = wgP[w.pupNazwa] = wgP[w.pupNazwa] || { n: 0, poz: 0, r: 0, id: w.pup };
    d.n++;
    if (w.statusDec === "Pozytywna") { d.poz++; d.r++; }
    if (w.statusDec === "Negatywna") d.r++;
  });
  document.getElementById("pupy").innerHTML = Object.keys(wgP)
    .sort(function (a, b) { return wgP[b].n - wgP[a].n; }).slice(0, LIMIT_LISTY)
    .map(function (k) {
      var d = wgP[k];
      var s = d.r ? Math.round(d.poz / d.r * 100) : 0;
      return '<tr' + link14({ pup: d.id }) + '><td>' + esc(k) + '</td><td class="num">' + d.n + '</td>' +
        '<td class="num"><span class="tag ' + klasaSkutecznosci(s) + '">' + s + '%</span></td></tr>';
    }).join("");
}

function renderKompletnosc(W, poz) {
  var brakKosztu = W.filter(function (w) { return w.statusDec === "Pozytywna" && w.kosztCalkowity == null; }).length;
  var brakUcz = W.filter(function (w) { return !w.uczestnicy.length; }).length;
  var nieRozliczone = poz.filter(function (w) { return w.rozliczenie === "Oczekuje"; }).length;
  var niezakw = W.reduce(function (s, w) { return s + (w.osob - w.osobZakw); }, 0);
  document.getElementById("kompletnosc").innerHTML = [
    ["Projekty bez kosztu całkowitego", brakKosztu, brakKosztu ? "neg" : "pos", { brak: "koszt" }],
    ["Projekty bez uczestników", brakUcz, brakUcz ? "warn" : "pos", { brak: "uczestnicy" }],
    ["Pozytywne, nierozliczone", nieRozliczone, "info", { status: "Pozytywna", rozl: "Oczekuje" }],
    ["Uczestnicy niezakwalifikowani", niezakw, "warn", { brak: "niezakw" }]
  ].map(function (r) {
    return '<div' + (r[1] ? link14(r[3]) : "") + ' style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">' +
      '<span class="small">' + r[0] + '</span><span class="tag ' + r[2] + '" style="margin-left:auto">' + r[1] + '</span></div>';
  }).join("") +
  '<div class="small muted" style="margin-top:10px">Niezakwalifikowani wymagają odrębnej faktury komercyjnej <span class="ref">D-84</span></div>';
}
