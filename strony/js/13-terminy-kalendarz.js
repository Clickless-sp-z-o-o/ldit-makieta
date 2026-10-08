/* Ekran Terminy: KPI, filtry instytucji i kalendarz miesieczny.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- KPI ---------- */
function kpi(label, val, foot) {
  return '<div class="kpi"><div class="k-label">' + label + '</div>' +
    '<div class="k-value">' + val + '</div><div class="k-foot">' + foot + '</div></div>';
}
function renderKPI() {
  var pierwszyDzien = iso(STAN_13.rok, STAN_13.mies, 1), ostatniDzien = iso(STAN_13.rok, STAN_13.mies, 31);
  var wMiesiacu = STAN_13.T.filter(function (t) { return t.od <= ostatniDzien && t.do >= pierwszyDzien; });
  var zapisaniRazem = STAN_13.T.reduce(function (s, t) { return s + zapisani(t); }, 0);
  var limitRazem = STAN_13.T.reduce(function (s, t) { return s + (t.limit || 0); }, 0);
  var wolne = STAN_13.T.filter(function (t) { return t.status === "Wolny" && obsada13(t).stan !== "przekroczony"; });
  var przekroczone = STAN_13.T.filter(function (t) { return obsada13(t).stan === "przekroczony"; }).length;
  el("kpi").innerHTML =
    kpi("Terminy w miesiącu: " + MIES_NAZWY[STAN_13.mies] + " " + STAN_13.rok, wMiesiacu.length, "wraz z kursami wchodzącymi z poprzedniego miesiąca") +
    kpi("Terminy wolne", wolne.length, przekroczone
      ? '<span class="przekroczenie">' + "przekroczony limit miejsc: " + przekroczone + " terminów</span>"
      : "można dopisywać uczestników bez pytania instytucji") +
    kpi("Uczestnicy przypisani", zapisaniRazem, "na " + limitRazem + " miejsc, obłożenie " +
        (limitRazem ? Math.round(zapisaniRazem / limitRazem * 100) : 0) + "%") +
    kpi("Terminy w bazie", STAN_13.T.length, "wystawiane przez instytucje, źródło prawdy o realizacji");
}

/* ---------- Filtry instytucji ---------- */
function wypelnijFiltryIS() {
  var instId = {};
  STAN_13.T.forEach(function (t) { instId[t.is] = nazwaIS(t.is); });
  ["fIS", "fIS2"].forEach(function (id) {
    var sel = el(id), stare = Wielowybor.wartosci(sel);
    sel.innerHTML = Object.keys(instId).map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(instId[k]) + '</option>';
    }).join("");
    Wielowybor.ustaw(sel, stare);
  });
}

/* ---------- Kalendarz ---------- */
function terminyDnia13(data) {
  var fis = Wielowybor.wartosci(el("fIS"));
  return STAN_13.T.filter(function (t) {
    return Wielowybor.pasuje(fis, t.is) && data >= t.od && data <= t.do;
  });
}
function komorkaDnia(data, dzien, poza) {
  var ev = terminyDnia13(data);
  return '<div class="day' + (poza ? " out" : "") + (data === STAN_13.DZIS ? " today" : "") + '">' +
    '<div class="dn">' + dzien + '</div>' +
    ev.slice(0, MAX_OSOB_W_KAFELKU).map(function (t) { return kafelek13(t, false); }).join("") +
    (ev.length > MAX_OSOB_W_KAFELKU
      ? '<div class="ev wiecej" data-wiecej="' + data + '" title="Pełna lista dnia">+' + (ev.length - MAX_OSOB_W_KAFELKU) + ' więcej</div>' : "") +
    '</div>';
}
function renderMiesiac13() {
  el("mLabel").textContent = MIES_NAZWY[STAN_13.mies] + " " + STAN_13.rok;
  var pierwszy = new Date(Date.UTC(STAN_13.rok, STAN_13.mies, 1));
  var przesun = (pierwszy.getUTCDay() + 6) % 7;          /* poniedzialek = 0 */
  var dniMies = new Date(Date.UTC(STAN_13.rok, STAN_13.mies + 1, 0)).getUTCDate();
  var dniPoprz = new Date(Date.UTC(STAN_13.rok, STAN_13.mies, 0)).getUTCDate();
  var html = DOW.map(function (d) { return '<div class="dow">' + d + '</div>'; }).join("");
  var komorek = Math.ceil((przesun + dniMies) / 7) * 7;

  for (var i = 0; i < komorek; i++) {
    var poza = i < przesun || i >= przesun + dniMies;
    if (i < przesun) {
      var dp = dniPoprz - przesun + i + 1;
      html += komorkaDnia(iso(STAN_13.mies === 0 ? STAN_13.rok - 1 : STAN_13.rok, STAN_13.mies === 0 ? 11 : STAN_13.mies - 1, dp), dp, poza);
    } else if (i >= przesun + dniMies) {
      var dn = i - przesun - dniMies + 1;
      html += komorkaDnia(iso(STAN_13.mies === 11 ? STAN_13.rok + 1 : STAN_13.rok, STAN_13.mies === 11 ? 0 : STAN_13.mies + 1, dn), dn, poza);
    } else {
      var d = i - przesun + 1;
      html += komorkaDnia(iso(STAN_13.rok, STAN_13.mies, d), d, poza);
    }
  }
  el("cal").className = "cal";
  el("cal").innerHTML = html;
}
