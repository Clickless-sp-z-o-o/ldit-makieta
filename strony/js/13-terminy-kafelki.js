/* Ekran Terminy: kafelek terminu w kalendarzu (D-267).
   Kafelek pokazuje firme klienta i wykonawce zamiast nazwy szkolenia, ma kolor instytucji,
   a klikniecie prowadzi do wniosku (przy kilku wnioskach w terminie: lista do wyboru).
   Tylko deklaracje. */

var KOLOR_DOMYSLNY_IS = "#64748b";
var PRZEZROCZYSTOSC_TLA = 0.16;
var WZOR_KOLORU = /^#[0-9A-Fa-f]{6}$/;
/* Napis terminu bez wniosku: wolny termin instytucji (uwaga 08.10); uzywa go tez 13-terminy-filtr.js */
var ETYKIETA_WOLNEGO_13 = "Wolny termin instytucji";

function kolorIS13(isId) {
  var i = DB.INSTYTUCJE.filter(function (x) { return x.id === isId; })[0];
  return i && WZOR_KOLORU.test(i.kolor || "") ? i.kolor : KOLOR_DOMYSLNY_IS;
}

function tloZKoloru13(hex, alfa) {
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alfa + ")";
}

/* Wnioski terminu: uczestnicy przypisani do terminu, tylko wnioski i klienci widoczne dla konta */
function wnioskiTerminu(t) {
  var widoczneWnioski = {};
  DB.WNIOSKI_WSZYSTKIE.forEach(function (w) { widoczneWnioski[w.id] = w; });
  var widoczniKlienci = {};
  DB.KLIENCI.forEach(function (k) { widoczniKlienci[k.id] = true; });
  var wynik = [], widziane = {};
  (STAN_13.uczestnicyPoTerminie[t.id] || []).forEach(function (u) {
    var w = widoczneWnioski[u.wniosek_id];
    if (!w || !widoczniKlienci[u.klient_id] || widziane[w.id]) return;
    widziane[w.id] = true;
    wynik.push({ id: w.id, firma: u.klient, wykonawca: w.wykonawca || nazwaIS(t.is) });
  });
  return wynik;
}

function unikalne13(lista) {
  return lista.filter(function (x, i) { return x && lista.indexOf(x) === i; });
}

/* Etykiety kafelka: firmy i wykonawcy (gdy brak wnioskow: wolny termin i instytucja) */
function opisKafelka13(t) {
  var wnioski = wnioskiTerminu(t);
  return {
    firmy: unikalne13(wnioski.map(function (w) { return w.firma; })),
    wykonawcy: wnioski.length ? unikalne13(wnioski.map(function (w) { return w.wykonawca; })) : [nazwaIS(t.is)],
    wnioski: wnioski
  };
}

function podpowiedzKafelka13(t, o) {
  return (o.firmy.length ? o.firmy.join(", ") : ETYKIETA_WOLNEGO_13) + ". Wykonawca: " + o.wykonawcy.join(", ") +
    ". Szkolenie: " + t.nazwa + ", " + nazwaIS(t.is) + ", " + t.miejsce + ", " + tekstObsady13(t) +
    ". " + (o.wnioski.length ? "Kliknij, aby otworzyć wniosek." : "Brak wniosku przypisanego do terminu.");
}

function kafelek13(t, szeroki) {
  var o = opisKafelka13(t);
  var kolor = kolorIS13(t.is);
  var firmy = o.firmy.length ? o.firmy.map(esc).join(", ") : ETYKIETA_WOLNEGO_13;
  var wiersz = "font-size:12px";
  return '<div class="ev kolor ' + klasaTerminu13(t) + (o.wnioski.length ? "" : " bez-wniosku") + (szeroki ? " szeroki" : "") + '" data-termin="' + esc(t.id) + '"' +
    ' style="background:' + tloZKoloru13(kolor, PRZEZROCZYSTOSC_TLA) + ';border-left-color:' + kolor + '"' +
    ' title="' + esc(podpowiedzKafelka13(t, o)) + '">' +
    '<div class="ev-firma" style="' + wiersz + '">' + firmy + '</div>' +
    '<div class="ev-wyk" style="' + wiersz + '">' + o.wykonawcy.map(esc).join(", ") + '</div>' +
    (szeroki ? '<div class="ev-szk' + (obsada13(t).stan === "przekroczony" ? " przekroczenie" : "") + '">' + esc(t.nazwa) + ", " + esc(t.miejsce) + ", " +
      esc(tekstObsady13(t)) + "</div>" : "") +
    '</div>';
}

/* Klikniecie: jeden wniosek otwiera sie od razu, kilka daje liste do wyboru */
function kliknijTermin13(id) {
  var t = STAN_13.T.filter(function (x) { return x.id === id; })[0];
  if (!t) return;
  var wnioski = opisKafelka13(t).wnioski;
  if (wnioski.length === 1) { location.href = Nawigacja.adresKarty(wnioski[0].id); return; }
  var tresc = wnioski.length
    ? '<div class="small muted" style="margin-bottom:8px">W tym terminie jest kilka wniosków. Wybierz wniosek:</div>' +
      wnioski.map(function (w) {
        return '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><a href="' + esc(Nawigacja.adresKarty(w.id)) + '">' +
          esc(w.firma) + '</a> <span class="small muted">wykonawca: ' + esc(w.wykonawca) + '</span></div>';
      }).join("")
    : '<div class="small muted">Wolny termin instytucji: nie ma jeszcze przypisanego wniosku. Przypiszesz go w karcie wniosku przy szkoleniu uczestnika.</div>';
  pokazOkno13(t.nazwa + ", " + DB.fmtDate(t.od), tresc);
}

function pokazOkno13(tytul, tresc) {
  zamknijOkno13();
  var tlo = document.createElement("div");
  tlo.className = "okno-tlo";
  tlo.id = "oknoTerminu";
  tlo.innerHTML = '<div class="okno" role="dialog" aria-modal="true"><div class="okno-head"><b>' + esc(tytul) + '</b></div>' +
    '<div class="okno-body">' + tresc + '</div>' +
    '<div class="okno-foot"><button class="btn" onclick="zamknijOkno13()">Zamknij</button></div></div>';
  document.body.appendChild(tlo);
}

function zamknijOkno13() {
  var tlo = document.getElementById("oknoTerminu");
  if (tlo) tlo.remove();
}
