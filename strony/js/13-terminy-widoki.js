/* Ekran Terminy: widoki kalendarza miesieczny, tygodniowy i dzienny, nawigacja i legenda
   kolorow instytucji (D-267). Tylko deklaracje, bez kodu wykonywanego od razu. */

var WIDOKI_13 = { miesiac: "Miesiąc", tydzien: "Tydzień", dzien: "Dzień" };
var DNI_W_TYGODNIU = 7;
var MS_NA_DOBE_13 = 86400000;

function dodajDni13(dataIso, ile) {
  var d = new Date(dataIso + "T00:00:00Z");
  return new Date(d.getTime() + ile * MS_NA_DOBE_13).toISOString().slice(0, 10);
}

function poczatekTygodnia13(dataIso) {
  var d = new Date(dataIso + "T00:00:00Z");
  return dodajDni13(dataIso, -((d.getUTCDay() + 6) % DNI_W_TYGODNIU));
}

/* Dzien aktywnego widoku wyznacza miesiac dla KPI i widoku miesiecznego */
function ustawDzien13(dataIso) {
  STAN_13.dzien = dataIso;
  STAN_13.rok = parseInt(dataIso.slice(0, 4), 10);
  STAN_13.mies = parseInt(dataIso.slice(5, 7), 10) - 1;
}

function ustawWidok13(widok) {
  if (!WIDOKI_13[widok]) return;
  STAN_13.widok = widok;
  renderKalendarz();
}

function przesun13(kierunek) {
  if (STAN_13.widok === "miesiac") {
    var m = STAN_13.mies + kierunek;
    var rok = STAN_13.rok + Math.floor(m / 12);
    STAN_13.rok = rok; STAN_13.mies = ((m % 12) + 12) % 12;
    var pierwszy = iso(STAN_13.rok, STAN_13.mies, 1);
    STAN_13.dzien = STAN_13.DZIS.slice(0, 7) === pierwszy.slice(0, 7) ? STAN_13.DZIS : pierwszy;
  } else {
    ustawDzien13(dodajDni13(STAN_13.dzien, kierunek * (STAN_13.widok === "tydzien" ? DNI_W_TYGODNIU : 1)));
  }
  renderKalendarz();
}
function poprzedniMiesiac() { przesun13(-1); }
function nastepnyMiesiac() { przesun13(1); }

function etykietaDnia13(dataIso) {
  return DOW[(new Date(dataIso + "T00:00:00Z").getUTCDay() + 6) % DNI_W_TYGODNIU] + " " + DB.fmtDate(dataIso);
}

function renderTydzien13() {
  var start = poczatekTygodnia13(STAN_13.dzien);
  el("mLabel").textContent = DB.fmtDate(start) + " - " + DB.fmtDate(dodajDni13(start, DNI_W_TYGODNIU - 1));
  var html = "";
  for (var i = 0; i < DNI_W_TYGODNIU; i++) {
    var data = dodajDni13(start, i);
    html += '<div class="day tydzien' + (data === STAN_13.DZIS ? " today" : "") + '"><div class="dn dn-tydz">' + etykietaDnia13(data) + "</div>" +
      terminyDnia13(data).map(function (t) { return kafelek13(t, false); }).join("") + "</div>";
  }
  el("cal").className = "cal";
  el("cal").innerHTML = html;
}

function renderDzien13() {
  el("mLabel").textContent = etykietaDnia13(STAN_13.dzien);
  var ev = terminyDnia13(STAN_13.dzien);
  el("cal").className = "cal dzienny";
  el("cal").innerHTML = '<div class="day' + (STAN_13.dzien === STAN_13.DZIS ? " today" : "") + '">' +
    (ev.length ? ev.map(function (t) { return kafelek13(t, true); }).join("") : '<div class="small muted">Brak terminów w tym dniu.</div>') + "</div>";
}

function renderLegenda13() {
  var uzyte = {};
  STAN_13.T.forEach(function (t) { uzyte[t.is] = true; });
  var kolory = DB.INSTYTUCJE.filter(function (i) { return uzyte[i.id]; }).map(function (i) {
    var kolor = kolorIS13(i.id);
    return '<span><i style="background:' + tloZKoloru13(kolor, PRZEZROCZYSTOSC_TLA) + ';border-color:' + kolor + '"></i>' + esc(i.nazwa) + "</span>";
  }).join("");
  el("legendaKolorow").innerHTML = kolory +
    '<span class="small muted">ramka przerywana: wolny termin, przygaszony: odbyty. Kolor ustawia się w konfiguracji instytucji i służy tylko kalendarzowi <span class="ref">D-267</span></span>';
}

function renderPrzelacznik13() {
  el("przelacznikWidoku").innerHTML = Object.keys(WIDOKI_13).map(function (k) {
    return '<button class="btn sm' + (STAN_13.widok === k ? " primary" : "") + '" data-widok="' + k + '">' + WIDOKI_13[k] + "</button>";
  }).join("");
}

function renderKalendarz() {
  if (STAN_13.widok === "tydzien") renderTydzien13();
  else if (STAN_13.widok === "dzien") renderDzien13();
  else renderMiesiac13();
  renderPrzelacznik13();
  renderLegenda13();
  renderKPI();
}

function klikKalendarza13(e) {
  var wiecej = e.target.closest("[data-wiecej]");
  if (wiecej) { ustawDzien13(wiecej.dataset.wiecej); ustawWidok13("dzien"); return; }
  var kafel = e.target.closest("[data-termin]");
  if (kafel) kliknijTermin13(kafel.dataset.termin);
}

function podepnijWidoki13() {
  el("cal").addEventListener("click", klikKalendarza13);
  el("przelacznikWidoku").addEventListener("click", function (e) {
    var b = e.target.closest("[data-widok]");
    if (b) ustawWidok13(b.dataset.widok);
  });
}
