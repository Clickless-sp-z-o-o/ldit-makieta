/* Panel instytucji: stan strony, dane zakresu konta i KPI (tylko deklaracje) */
var STAN_16 = { inst: null, W: [], KL: [], TR: [], SZ: [], FORMULARZE: [], terminWniosku: {}, filtr: "all", widok: "klienci" };

function el16(id) { return document.getElementById(id); }
function wiersze16(dane, sklej) { return dane.map(sklej).join(""); }

/* Panel pokazuje instytucje zalogowanego konta. Konto LDIT ogladajace panel
   widzi pierwsza instytucje ze swojego zakresu. Zwraca false, gdy brak instytucji. */
function wczytajDane16() {
  var sesja = Auth.sesja();
  var IS = (sesja && sesja.instytucja_id) || (DB.INSTYTUCJE[0] && DB.INSTYTUCJE[0].id);
  var inst = DB.INSTYTUCJE.filter(function (i) { return i.id === IS; })[0];
  if (!inst) {
    el16("zalogowano").textContent = "Brak instytucji w zakresie tego konta.";
    return false;
  }
  STAN_16.inst = inst;
  STAN_16.W = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.is === IS; });
  STAN_16.KL = DB.KLIENCI.filter(function (k) { return k.is === IS; });
  STAN_16.TR = DB.TERMINY.filter(function (t) { return t.is === IS; });
  STAN_16.SZ = DB.SZKOLENIA.filter(function (s) { return s.is === IS; });
  STAN_16.FORMULARZE = DB.KOLEJKA.filter(function (k) { return k.isId === IS; });
  return true;
}

function naglowek16() {
  var sesja = Auth.sesja();
  var inst = STAN_16.inst;
  el16("zalogowano").textContent = "Zalogowano jako " + (sesja ? sesja.imie + " (" + sesja.login + ")" : "gość") +
    " › " + inst.nazwa;
  el16("tytul").textContent = inst.nazwa;
  el16("tagInst").textContent = "tylko " + inst.nazwa;
  el16("standard").textContent = inst.standard || "-";
  /* D-210: handlowiec widzi tylko swoich klientow i wnioski */
  el16("infoHandlowiec").hidden = Auth.handlowiec() === null;
}

function kartaKpi16(label, val, foot) {
  return '<div class="kpi"><div class="k-label">' + label + '</div>' +
    '<div class="k-value">' + val + '</div>' +
    (foot ? '<div class="k-foot">' + foot + '</div>' : "") + '</div>';
}

/* KPI, bez jakichkolwiek kwot prowizji */
function renderKpi16() {
  var W = STAN_16.W;
  var zlozone = W.filter(function (w) { return w.statusSkl === "Złożony"; });
  var poz = W.filter(function (w) { return w.statusDec === "Pozytywna"; });
  var zrealizowane = W.filter(function (w) { return w.rozliczenie === "Rozliczone" || w.rozliczenie === "Zafakturowany"; });
  var osobyPoz = poz.reduce(function (s, w) { return s + w.osobZakw; }, 0);
  el16("kpi").innerHTML =
    kartaKpi16("Moi klienci", DB.fmtNum(STAN_16.KL.length), Auth.handlowiec() ? "przypisani do Ciebie" : "przypisani do instytucji") +
    kartaKpi16("Wnioski złożone", DB.fmtNum(zlozone.length), "z " + W.length + " projektów") +
    kartaKpi16("Decyzje pozytywne", DB.fmtNum(poz.length),
        '<span class="tag pos dot">' + (zlozone.length ? Math.round(poz.length / zlozone.length * 100) : 0) + '% skuteczności</span>') +
    kartaKpi16("Szkolenia zrealizowane", DB.fmtNum(zrealizowane.length), DB.fmtNum(osobyPoz) + " osób zakwalifikowanych");
}
