/* Administracja 08: dashboard miesieczny i prognoza prowizji (D-26, D-138). Tylko deklaracje. */
/* ---------- Dashboard prowizji: miesiecznie + narastajaco (D-138) ---------- */
function obrotMiesieczny() {
  var perInst = {};
  DB.INSTYTUCJE.forEach(function (inst) {
    STAN_08.wyniki[inst.id].pozycje.forEach(function (p) {
      if (p.korekta || p.data.slice(0, 4) !== STAN_08.rok) return;
      var mc = parseInt(p.data.slice(5, 7), 10) - 1;
      var r = perInst[inst.id] = perInst[inst.id] || { inst: inst, mies: new Array(12).fill(0), suma: 0 };
      r.mies[mc] += p.kwota;
      r.suma += p.kwota;
    });
  });
  return Object.keys(perInst).map(function (k) { return perInst[k]; })
    .filter(function (r) { return r.suma > 0; })
    .sort(function (a, b) { return b.suma - a.suma; });
}

function renderDashboard() {
  var wiersze = obrotMiesieczny();
  var minM = 11, maxM = 0;
  wiersze.forEach(function (r) {
    r.mies.forEach(function (v, i) { if (v > 0) { if (i < minM) minM = i; if (i > maxM) maxM = i; } });
  });
  if (minM > maxM) { minM = 0; maxM = 0; }

  var head = '<th>Instytucja</th>';
  for (var m = minM; m <= maxM; m++) head += '<th class="num">' + MIES[m].slice(0, 3) + '</th>';
  head += '<th class="num">Narastająco' +
    znakPodpowiedzi("Suma obrotu od początku roku. W modelach z kumulacją roczną to narastająco decyduje, który próg jest aktywny, dlatego pokazujemy je obok słupków miesięcznych.") + '</th>';
  document.getElementById("dashHead").innerHTML = head;

  document.getElementById("dashBody").innerHTML = wiersze.map(function (r) {
    var akt = warunkiNaDzien(STAN_08.wyniki[r.inst.id].wersje, STAN_08.dzis);
    var row = '<td class="strong nowrap">' + esc(r.inst.nazwa) + (akt ? ' ' + pillModel(akt.model) : "") + '</td>';
    for (var i = minM; i <= maxM; i++) {
      row += '<td class="num' + (r.mies[i] ? "" : " muted") + '">' + (r.mies[i] ? DB.fmtPLN(r.mies[i]) : "&middot;") + '</td>';
    }
    row += '<td class="num strong">' + DB.fmtPLN(r.suma) +
      (akt && akt.kumulacja === "roczny" ? '<div class="small muted">próg roczny</div>' : "") + '</td>';
    return '<tr>' + row + '</tr>';
  }).join("");

  var sumMies = new Array(12).fill(0), sumTot = 0;
  wiersze.forEach(function (r) {
    r.mies.forEach(function (v, i) { sumMies[i] += v; });
    sumTot += r.suma;
  });
  var foot = '<td class="strong">Razem</td>';
  for (var mm = minM; mm <= maxM; mm++) foot += '<td class="num strong">' + (sumMies[mm] ? DB.fmtPLN(sumMies[mm]) : "&middot;") + '</td>';
  document.getElementById("dashFoot").innerHTML = '<tr>' + foot + '<td class="num strong">' + DB.fmtPLN(sumTot) + '</td></tr>';
}

/* ---------- Przewidywana prowizja (D-26): terminy biezacego miesiaca ---------- */
function prognozaWg() {
  var wg = {};
  DB.TERMINY.forEach(function (t) {
    if (t.od.slice(0, 7) !== STAN_08.dzis.slice(0, 7) || t.status === "Odbyty") return;
    var s = STAN_08.mapSzk[t.szk];
    var inst = DB.INSTYTUCJE.filter(function (i) { return i.id === t.is; })[0];
    var akt = inst ? warunkiNaDzien(STAN_08.wyniki[inst.id].wersje, STAN_08.dzis) : null;
    if (!s || !akt) return;
    var g = wg[t.is] = wg[t.is] || { inst: inst, akt: akt, terminy: 0, osoby: 0, obrot: 0, poz: [] };
    g.terminy++;
    g.osoby += t.zapisani;
    g.obrot += t.zapisani * s.cena;
    g.poz.push({ nazwa: t.nazwa, osoby: t.zapisani, cena: s.cena });
  });
  return wg;
}

function marginesDoProgu(p, obrot) {
  if (!p.progi.length) return '<span class="muted small">stawka stała, brak progów</span>';
  var akt = p.progi[0], nast = null;
  p.progi.forEach(function (x) { if (obrot >= x.od) akt = x; });
  p.progi.forEach(function (x) { if (x.od > obrot && !nast) nast = x; });
  var out;
  if (akt.od > 0) {
    var zapas = obrot - akt.od;
    out = '<span class="tag ' + (zapas < obrot * MARGINES_PROGU ? "neg" : "warn") + ' dot">zapas ' +
          DB.fmtPLN(zapas) + " nad progiem " + DB.fmtPLN(akt.od) + '</span>';
  } else {
    out = '<span class="tag mute">w progu bazowym</span>';
  }
  if (nast) out += '<div class="small muted">do progu ' + DB.fmtPLN(nast.od) + " brakuje " + DB.fmtPLN(nast.od - obrot) + '</div>';
  return out;
}

/* Ostrzezenie: rezygnacja zbija stawke, gdy model liczy od calosci. Wybieramy pierwsza
   instytucje z prognozy, ktora jest juz nad progiem modelu od calosci. */
function scenariuszRezygnacji(wg, klucze) {
  var k = klucze.filter(function (id) {
    var p = wg[id].akt;
    return p.sposob === "od_calosci" && p.progi.length > 1 && wg[id].obrot >= p.progi[1].od;
  })[0];
  var el = document.getElementById("scenariusz");
  if (!k) { el.style.display = "none"; return; }
  el.style.display = "";
  var g = wg[k], p = g.akt, prog = p.progi[1].od;
  var poz = g.poz.slice().sort(function (a, b) { return b.cena - a.cena; })[0];
  var ilu = Math.floor((g.obrot - prog) / poz.cena) + 1;
  var poObrot = g.obrot - poz.cena * ilu;
  var bazowa = liczProwizje(p, 0, g.obrot), po = liczProwizje(p, 0, poObrot);
  el.innerHTML =
    "<b>Ostrzeżenie: rezygnacja uczestnika zbija stawkę do niższego progu.</b><br>" +
    esc(g.inst.nazwa) + " pracuje na modelu " + esc(p.model) + ", w którym próg " + DB.fmtPLN(prog) +
    " przestawia stawkę z " + p.progi[0].st + "% na " + p.progi[1].st + "% <b>dla całego okresu</b>, a nie tylko dla nadwyżki. " +
    "Obrót planowany to <b>" + DB.fmtPLN(g.obrot) + "</b>, czyli stawka <b>" + bazowa.stawka + "%</b> i prowizja przewidywana <b>" +
    DB.fmtPLN(bazowa.kwota) + "</b>. Jeżeli ze szkolenia " + esc(poz.nazwa) + " zrezygnuje " + ilu +
    " uczestników po " + DB.fmtPLN(poz.cena) + ", obrót spadnie do <b>" + DB.fmtPLN(poObrot) +
    "</b>, czyli poniżej progu. Stawka spada z " + bazowa.stawka + "% na <b>" + po.stawka + "%</b>, a prowizja z " +
    DB.fmtPLN(bazowa.kwota) + " na <b>" + DB.fmtPLN(po.kwota) + "</b>, czyli o " + DB.fmtPLN(bazowa.kwota - po.kwota) + " mniej. " +
    "Klient opisał ten sam mechanizm na warsztacie na własnych liczbach: „czy to będzie 10 czy 12, " +
    "no bo tutaj było 54000, a ten się odpadł, zrobiło się 48. No to ja nie mogę mieć 12% tylko 10” (26:58).";
}

function renderPrognoza() {
  var wg = prognozaWg();
  var klucze = Object.keys(wg).sort(function (a, b) { return wg[b].obrot - wg[a].obrot; });
  document.getElementById("okresPrognozy").textContent = "okres prognozy: " + MIES[parseInt(STAN_08.dzis.slice(5, 7), 10) - 1] + " " + STAN_08.rok;

  document.getElementById("tabPrognoza").innerHTML = klucze.length ? klucze.map(function (k) {
    var g = wg[k];
    var r = liczProwizje(g.akt, 0, g.obrot);
    return '<tr>' +
      '<td class="strong nowrap">' + esc(g.inst.nazwa) + '</td>' +
      '<td class="c">' + pillModel(g.akt.model) + '</td>' +
      '<td class="num">' + g.terminy + '</td>' +
      '<td class="num">' + g.osoby + '</td>' +
      '<td class="num">' + DB.fmtPLN(g.obrot) + '<div class="small muted">' +
        g.poz.map(function (p) { return esc(p.nazwa) + " " + p.osoby + " os."; }).join(", ") + '</div></td>' +
      '<td class="num"><span class="tag info">' + pct2(r.stawka) + '</span></td>' +
      '<td class="num strong">' + DB.fmtPLN(r.kwota) + '</td>' +
      '<td>' + marginesDoProgu(g.akt, g.obrot) + '</td></tr>';
  }).join("") : brakDanych(8, "Brak zaplanowanych terminów w tym miesiącu", "Prognoza powstaje z terminów szkoleń, które jeszcze się nie odbyły.");
  scenariuszRezygnacji(wg, klucze);
}
