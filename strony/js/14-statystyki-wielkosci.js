/* Statystyki 14: skutecznosc wg wielkosci firmy. Kategoria "JDG bez pracowników" (D-253)
   to wnioski z liczba zatrudnionych rowna 0, wydzielone z pozostalych wielkosci. */
var KATEGORIA_JDG = "JDG bez pracowników";
var KOLEJNOSC_WIELKOSCI = ["JDG", "mikro", "mały", "średni", "duży"];
var WIELKOSC_PROGU_JDG = "mikro";

function kategoriaWielkosci(w) {
  return w.zatrudnienie === 0 ? "JDG" : w.wielkosc;
}

function nazwaKategorii(k) { return k === "JDG" ? KATEGORIA_JDG : k; }

function zliczWielkosci(W) {
  var wgW = {};
  W.forEach(function (w) {
    var d = wgW[kategoriaWielkosci(w)] = wgW[kategoriaWielkosci(w)] || { n: 0, poz: 0, rozstrzyg: 0 };
    d.n++;
    if (w.statusDec === "Pozytywna") { d.poz++; d.rozstrzyg++; }
    if (w.statusDec === "Negatywna") d.rozstrzyg++;
  });
  return wgW;
}

function wierszWielkosci(k, d) {
  var s = d.rozstrzyg ? Math.round(d.poz / d.rozstrzyg * 100) : 0;
  var progu = k === "JDG" ? WIELKOSC_PROGU_JDG : k;
  return '<div style="margin-bottom:12px"' + (k === "JDG" ? "" : link14({ wielkosc: k })) + '>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
    '<span style="font-size:12.5px;font-weight:650;text-transform:capitalize">' + esc(nazwaKategorii(k)) + '</span>' +
    '<span class="pill">dofin. ' + esc(procentDofinansowania(progu)) + '</span>' +
    '<span style="margin-left:auto;font-size:12.5px;font-weight:700">' + s + '%</span></div>' +
    '<div class="progress"><i style="width:' + s + '%"></i></div>' +
    '<div class="small muted" style="margin-top:3px">' + d.n + ' projektów</div></div>';
}

function renderWielkosci14(W) {
  var wgW = zliczWielkosci(W);
  document.getElementById("wgWielkosci").innerHTML =
    KOLEJNOSC_WIELKOSCI.filter(function (k) { return wgW[k]; })
      .map(function (k) { return wierszWielkosci(k, wgW[k]); }).join("");
}
