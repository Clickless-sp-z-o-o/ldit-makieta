/* Konfigurator prowizji: symulacja okresu (faktury, przeliczenie, kontrola). Tylko deklaracje. */
function renderFaktury() {
  document.getElementById("faktury").innerHTML = faktury.map(function (f, i) {
    return '<tr class="faktura-row"><td class="muted">' + (i + 1) + '</td>' +
      '<td><input class="inp" style="width:190px" value="' + esc(f.opis) + '" onchange="faktury[' + i + '].opis=this.value"></td>' +
      '<td class="num"><input class="inp num" value="' + f.kwota + '" onchange="faktury[' + i + '].kwota=parseFloat(this.value)||0;przelicz()"></td>' +
      '<td class="num" id="nar' + i + '"></td>' +
      '<td class="num" id="st' + i + '"></td>' +
      '<td class="num strong" id="pr' + i + '"></td>' +
      '<td class="right"><button class="btn xs danger" onclick="faktury.splice(' + i + ',1);renderFaktury();przelicz()">&times;</button></td>' +
      '</tr>';
  }).join("");
}
function dodajFakture() {
  faktury.push({ opis: "Faktura " + (faktury.length + 1), kwota: 10000 });
  renderFaktury(); przelicz();
}


/* Nadpisanie indywidualne dotyczy ostatniej pozycji (D-17, per wniosek) */
function zastosujNadpisanie(wynik, nadp) {
  var ost = wynik.pozycje[wynik.pozycje.length - 1];
  ost.stawka = nadp;
  ost.prowizja = ost.kwota * nadp / 100;
  ost.rozbicie = [{ kwota: ost.kwota, st: nadp }];
  wynik.suma = wynik.pozycje.reduce(function (s, p) { return s + p.prowizja; }, 0);
  wynik.stawkaEfektywna = wynik.obrot ? wynik.suma / wynik.obrot * 100 : 0;
}

/* Wypelnia kolumny wynikowe tabeli faktur, zwraca rozbicie wszystkich pozycji */
function wypelnijWierszeFaktur(wynik, maNadpisanie) {
  var narast = 0, rozbRazem = [];
  wynik.pozycje.forEach(function (p, i) {
    narast += p.kwota;
    rozbRazem = rozbRazem.concat(p.rozbicie);
    var nEl = document.getElementById("nar" + i);
    if (!nEl) return;
    nEl.textContent = DB.fmtPLN(narast);
    var nadpisana = maNadpisanie && i === wynik.pozycje.length - 1;
    document.getElementById("st" + i).innerHTML =
      '<span class="tag ' + (nadpisana ? "set" : p.rozbicie.length > 1 ? "warn" : "mute") + '">' +
      DB.fmtPct(Math.round(p.stawka * 100) / 100) + (nadpisana ? " ręcznie" : "") + "</span>";
    document.getElementById("pr" + i).textContent = DB.fmtPLN2(p.prowizja);
  });
  return rozbRazem;
}

function wypelnijPodsumowanie(w, obrot, suma, rozbRazem) {
  var efektywna = obrot ? DB.fmtPct(Math.round(suma / obrot * 10000) / 100) : "0%";
  document.getElementById("sumObrot").textContent = DB.fmtPLN(obrot);
  document.getElementById("sumProwizja").textContent = DB.fmtPLN2(suma);
  document.getElementById("sumStawka").innerHTML = obrot ? '<span class="tag info">' + efektywna + "</span>" : "";
  document.getElementById("bigKwota").textContent = DB.fmtPLN2(suma);
  document.getElementById("bigOpis").textContent =
    "Obrót " + DB.fmtPLN(obrot) + " · stawka efektywna " + efektywna + " · kumulacja " + w.kumulacja;

  /* Rozbicie zbiorcze wg stawek */
  var wg = {};
  rozbRazem.forEach(function (x) { wg[x.st] = (wg[x.st] || 0) + x.kwota; });
  document.getElementById("bigRozb").innerHTML = Object.keys(wg).sort(function (a, b) { return b - a; })
    .map(function (st) {
      return "<div>" + DB.fmtPLN(wg[st]) + " &times; " + st + "% = <b>" + DB.fmtPLN2(wg[st] * st / 100) + "</b></div>";
    }).join("");
}

/* Kontrola poprawnosci: efekt progu granicznego albo podzial faktury miedzy progi */
function uwagiKontroli(w, rozbRazem) {
  var uwagi = [];
  if (w.sposob === "od_calosci" && w.progi.length > 1) {
    var granica = w.progi[1].od;
    var przed = liczProwizje(w, 0, granica - 1).kwota;
    var po = liczProwizje(w, 0, granica).kwota;
    uwagi.push(['Efekt progu <b>' + DB.fmtPLN(granica) + "</b>",
      DB.fmtPLN(granica - 1) + " &rarr; " + DB.fmtPLN2(przed) + "<br>" +
      DB.fmtPLN(granica) + " &rarr; " + DB.fmtPLN2(po) +
      '<br><span class="tag warn">skok o ' + DB.fmtPLN2(po - przed) + "</span>", "warn"]);
  }
  if (w.sposob === "od_nadwyzki" && rozbRazem.some(function (x, i, a) { return i && a[i - 1].st !== x.st; })) {
    uwagi.push(["Podział faktury między progi",
      "Co najmniej jedna faktura została podzielona. Stawka efektywna jest średnią ważoną.", "info"]);
  }
  if (!uwagi.length) uwagi.push(["Brak progów granicznych w tym okresie", "Stawka jednolita dla całego obrotu.", "mute"]);
  return uwagi;
}

function renderKontroli(uwagi) {
  document.getElementById("kontrola").innerHTML = uwagi.map(function (u) {
    return '<div style="margin-bottom:11px"><div style="font-size:12.5px;font-weight:650;margin-bottom:4px">' +
      u[0] + '</div><div class="small muted" style="line-height:1.6">' + u[1] + "</div></div>";
  }).join("");
}

function przelicz() {
  var w = warunki();
  var nadpTxt = document.getElementById("nadpisz").value;
  var nadp = parseFloat(nadpTxt);
  var maNadpisanie = nadpTxt !== "" && !isNaN(nadp);

  /* Liczymy CALY okres naraz. W modelu "od calosci" przekroczenie progu
     podnosi stawke takze dla faktur juz wystawionych, wiec nie wolno
     sumowac wynikow liczonych fakturami po kolei. */
  var wynik = liczOkres(w, faktury);
  if (maNadpisanie && wynik.pozycje.length) zastosujNadpisanie(wynik, nadp);

  var rozbRazem = wypelnijWierszeFaktur(wynik, maNadpisanie);
  wypelnijPodsumowanie(w, wynik.obrot, wynik.suma, rozbRazem);
  renderKontroli(uwagiKontroli(w, rozbRazem));
  przeliczCzas();
}
