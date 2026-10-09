/* Nabory: panel "Pokaz klientow" urzedu. Klient z dodatkowymi urzedami (D-238) wystepuje
   osobnym wierszem przy kazdym swoim urzedzie, z nazwa oddzialu. Widac date rozpoczecia
   i zakonczenia naboru (D-254) oraz znacznik czarnej listy (D-249). */

var TYTUL_CZARNEJ_LISTY = "Widnieje na czarnej liście";

function nazwaUrzedu05(id) {
  var p = DB.PUPY.filter(function (x) { return x.id === id; })[0];
  return p ? p.nazwa : "";
}

function naborUrzedu05(id) {
  return STAN_05.N.filter(function (n) { return pupId(n) === id; })[0] || null;
}

/* Wiersze: jeden na pare klient + urzad (glowny albo dodatkowy z oddzialem) */
function wierszeKlientow05(id) {
  var wiersze = [];
  DB.KLIENCI.forEach(function (k) {
    urzedyKlienta05(k).forEach(function (u) {
      if (u.pup === id) wiersze.push({ klient: k, oddzial: u.oddzial || "" });
    });
  });
  return wiersze;
}

function znacznikCzarnejListy05(k) {
  return k.czarnaLista
    ? '<span class="tag neg" title="' + esc(TYTUL_CZARNEJ_LISTY) + '" aria-label="' + esc(TYTUL_CZARNEJ_LISTY) + '">&#9760;</span>'
    : "";
}

function wierszKlienta05(w, nabor) {
  var k = w.klient;
  var od = nabor && nabor.od ? DB.fmtDate(nabor.od) : "";
  var koniec = nabor && nabor.do ? DB.fmtDate(nabor.do) : "";
  return "<tr>" +
    '<td class="c">' + znacznikCzarnejListy05(k) + "</td>" +
    '<td class="strong">' + esc(k.nazwa) + "</td>" +
    '<td class="mono">' + esc(k.nip || "") + "</td>" +
    "<td>" + (w.oddzial ? esc(w.oddzial) : '<span class="muted">-</span>') + "</td>" +
    "<td>" + (k.osoba ? esc(k.osoba) : '<span class="muted">-</span>') + "</td>" +
    '<td class="mono nowrap">' + (k.tel ? esc(k.tel) : '<span class="muted">-</span>') + "</td>" +
    "<td>" + (k.mail ? esc(k.mail) : '<span class="muted">-</span>') + "</td>" +
    '<td class="mono nowrap">' + (od ? esc(od) : '<span class="muted">-</span>') + "</td>" +
    '<td class="mono nowrap">' + (koniec ? esc(koniec) : '<span class="muted">-</span>') + "</td>" +
    '<td class="nowrap">' + przyciskiKlienta05(k) + "</td></tr>";
}

function otworzPanelKlientow05(id) {
  var wiersze = wierszeKlientow05(id);
  var nabor = naborUrzedu05(id);
  var panel = el05("panelKlientow");
  panel.innerHTML =
    '<div class="card-head"><h3>Klienci urzędu: ' + esc(nazwaUrzedu05(id)) + "</h3>" +
    '<span class="sub">' + wiersze.length + " wierszy, klient z kilkoma urzędami jest w każdym z nich</span>" +
    '<span class="ch-actions"><button class="btn xs" onclick="pokazKlientow(\'' + escJs(id) + '\')">Otwórz w Bazie klientów</button>' +
    '<button class="btn xs" onclick="zamknijPanelKlientow05()">Zamknij</button></span></div>' +
    '<div class="card-body tight" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr>' +
    '<th class="c" title="' + esc(TYTUL_CZARNEJ_LISTY) + '">&#9760;</th><th>Klient</th><th>NIP</th><th>Oddział</th><th>Osoba kontaktowa</th><th>Telefon</th><th>E-mail</th>' +
    '<th class="nowrap">Nabór od</th><th class="nowrap">Nabór do</th><th></th></tr></thead><tbody>' +
    (wiersze.map(function (w) { return wierszKlienta05(w, nabor); }).join("") ||
      '<tr><td colspan="10" class="small muted">Brak klientów przypisanych do tego urzędu.</td></tr>') +
    "</tbody></table></div>" +
    '<div class="note"><b>Czarna lista</b> <span class="ref">D-249</span>: symbol &#9760; oznacza klienta z co najmniej ' +
    "dwoma niezłożonymi wnioskami z różnych dat. <b>Inny PUP</b> <span class=\"ref\">D-238</span>: oddział klienta " +
    "składający do innego urzędu ma tu osobny wiersz. <span class=\"ref\">D-254</span></div>" +
    '<div class="note" data-tip="Zawężanie robi assets/zakres.js na poziomie danych."><b>Zakres widoczności</b> <span class="ref">D-266</span> <span class="ref p">P-73</span>: ' +
    "urzędy widzą wszyscy, klientów pod urzędem pracownik widzi tylko z instytucji, do których jest przypisany. " +
    "Administrator widzi wszystkich i rozszerza zakres przydziałem instytucji (np. na czas zastępstwa).</div>";
  panel.style.display = "";
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function zamknijPanelKlientow05() { el05("panelKlientow").style.display = "none"; }
