/* Statystyki 14: rok poprzedni i porownanie, tylko podsumowania (D-160, D-175). Tylko deklaracje. */
function miaraRoku(rok, isId, nazwa) {
  var wiersz = DB.PODSUMOWANIA.filter(function (p) { return p.rok === rok && p.isId === isId && p.miara === nazwa; })[0];
  return wiersz ? wiersz.wartosc : null;
}
function liczbaLubMyslnik(v) { return v == null ? "-" : DB.fmtNum(v); }
function idsInstytucjiZDanymi(rok, fis) {
  var ids = {};
  DB.PODSUMOWANIA.filter(function (p) { return p.rok === rok && Wielowybor.pasuje(fis, p.isId); })
    .forEach(function (p) { ids[p.isId] = true; });
  return Object.keys(ids).filter(function (id) { return instytucjaPoId(id); });
}
function procentZ(a, b) { return b ? Math.round(a / b * 100) + "%" : "-"; }

function renderPoprzedni(fis) {
  document.getElementById("historiaTytul").textContent = "Podsumowanie roku " + STAN_14.rokPoprz;
  document.getElementById("historiaHead").innerHTML = "<tr><th>Instytucja</th><th class='num'>Wnioski złożone</th>" +
    "<th class='num'>Pozytywne</th><th class='num'>Skuteczność</th><th class='num'>Obrót</th></tr>";
  var ids = idsInstytucjiZDanymi(STAN_14.rokPoprz, fis);
  document.getElementById("historiaBody").innerHTML = ids.length ? ids.map(function (id) {
    var zl = miaraRoku(STAN_14.rokPoprz, id, "wnioski_zlozone"), po = miaraRoku(STAN_14.rokPoprz, id, "wnioski_pozytywne");
    return "<tr><td class='strong'>" + esc(instytucjaPoId(id).nazwa) + "</td><td class='num'>" + liczbaLubMyslnik(zl) + "</td>" +
      "<td class='num'>" + liczbaLubMyslnik(po) + "</td><td class='num'>" + procentZ(po, zl) + "</td>" +
      "<td class='num'>" + (miaraRoku(STAN_14.rokPoprz, id, "obrot") == null ? "-" : DB.fmtPLN(miaraRoku(STAN_14.rokPoprz, id, "obrot"))) + "</td></tr>";
  }).join("") : "<tr><td colspan='5'><div class='empty'><div class='et'>Brak podsumowań za rok " + STAN_14.rokPoprz + "</div></div></td></tr>";
}

function znacznikZmiany(przed, teraz) {
  if (!przed) return "-";
  var d = Math.round((teraz - przed) / przed * 100);
  return '<span class="delta ' + (d >= 0 ? "up" : "down") + '">' + (d >= 0 ? "&#9650; " : "&#9660; ") + Math.abs(d) + "%</span>";
}

function renderPorownanie(fis) {
  document.getElementById("historiaTytul").textContent = "Porównanie " + STAN_14.rokPoprz + " / " + STAN_14.rok;
  document.getElementById("historiaHead").innerHTML = "<tr><th>Instytucja</th>" +
    "<th class='num'>Złożone " + STAN_14.rokPoprz + "</th><th class='num'>Złożone " + STAN_14.rok + "</th><th class='num'>Zmiana</th>" +
    "<th class='num'>Pozytywne " + STAN_14.rokPoprz + "</th><th class='num'>Pozytywne " + STAN_14.rok + "</th><th class='num'>Zmiana</th></tr>";
  var ids = idsInstytucjiZDanymi(STAN_14.rokPoprz, fis);
  var wiersze = ids.map(function (id) {
    return { nazwa: instytucjaPoId(id).nazwa,
             zl0: miaraRoku(STAN_14.rokPoprz, id, "wnioski_zlozone"), zl1: miaraRoku(STAN_14.rok, id, "wnioski_zlozone"),
             po0: miaraRoku(STAN_14.rokPoprz, id, "wnioski_pozytywne"), po1: miaraRoku(STAN_14.rok, id, "wnioski_pozytywne") };
  });
  var razem = { nazwa: "Razem", zl0: sumaPola(wiersze, "zl0"), zl1: sumaPola(wiersze, "zl1"), po0: sumaPola(wiersze, "po0"), po1: sumaPola(wiersze, "po1") };
  document.getElementById("historiaBody").innerHTML = wiersze.concat(wiersze.length ? [razem] : []).map(function (r, i, a) {
    var ostatni = i === a.length - 1 && wiersze.length;
    var tag = ostatni ? "strong" : "";
    return "<tr><td class='strong'>" + esc(r.nazwa) + "</td><td class='num " + tag + "'>" + liczbaLubMyslnik(r.zl0) + "</td>" +
      "<td class='num " + tag + "'>" + liczbaLubMyslnik(r.zl1) + "</td><td class='num'>" + znacznikZmiany(r.zl0, r.zl1) + "</td>" +
      "<td class='num " + tag + "'>" + liczbaLubMyslnik(r.po0) + "</td><td class='num " + tag + "'>" + liczbaLubMyslnik(r.po1) + "</td>" +
      "<td class='num'>" + znacznikZmiany(r.po0, r.po1) + "</td></tr>";
  }).join("") || "<tr><td colspan='7'><div class='empty'><div class='et'>Brak podsumowań za rok " + STAN_14.rokPoprz + "</div></div></td></tr>";
}
