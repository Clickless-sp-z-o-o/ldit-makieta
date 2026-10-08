/* Ekran 12, czesc 2: log logowan, sygnaly do sprawdzenia i odswiezanie calego ekranu.
   Korzysta ze STAN_12 i funkcji z 12-rejestr-aktywnosci-zmiany.js. Same deklaracje. */

function udane(r) { return r.wynik === "OK" || r.wynik === "sukces"; }
function poGodzinach(r) {
  var g = parseInt(r.czas.slice(11, 13), 10);
  return g >= 20 || g < 6;
}

function renderKpiL() {
  var L = STAN_12.L;
  var nieudane = L.filter(function (r) { return !udane(r); });
  var ipy = unikalne(L, "ip");
  var dni = L.map(function (r) { return r.czas.slice(0, 10); }).sort();
  document.getElementById("kpiL").innerHTML =
    kpi("Logowania w rejestrze", L.length, L.length ? "zakres: " + esc(dni[0]) + " do " + esc(dni[dni.length - 1]) : "brak wpisów") +
    kpi("Próby nieudane", nieudane.length,
        nieudane.length ? '<span class="tag neg dot">wymaga sprawdzenia</span>' : "brak") +
    kpi("Unikalne adresy IP", ipy.length, "w całym logu") +
    kpi("Logowania poza godzinami", L.filter(poGodzinach).length, "przed 6:00 i po 20:00");
}

function wierszL(r) {
  var u = STAN_12.UMAP[r.kto], ok = udane(r);
  return '<tr class="' + (ok ? "" : "row-danger") + '">' +
    '<td class="mono muted nowrap">' + esc(DB.fmtDate(r.czas)) + '</td>' +
    '<td class="strong mono">' + esc(r.kto) +
      (u ? '<div class="small muted" style="font-family:inherit">' + esc(u.imie) + ", " + esc(u.rola) +
           (u["2fa"] ? "" : ", <b>bez 2FA</b>") + '</div>' : "") + '</td>' +
    '<td class="mono">' + esc(r.ip) + '</td>' +
    '<td class="muted">' + esc(r.urzadzenie) + '</td>' +
    '<td>' + (ok
        ? '<span class="tag pos dot">udane</span>'
        : '<span class="tag neg dot">' + esc(r.wynik) + '</span>') + '</td>' +
    '</tr>';
}

function renderL() {
  var L = STAN_12.L;
  var q = document.getElementById("qL").value.toLowerCase().trim();
  var fw = Wielowybor.wartosci(document.getElementById("fWynik"));
  var lista = L.filter(function (r) {
    if (!Wielowybor.pasuje(fw, udane(r) ? "udane" : "nieudane")) return false;
    if (q && (r.kto + " " + r.ip + " " + r.urzadzenie).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  document.getElementById("liczL").innerHTML = "<b>" + lista.length + "</b> z " + L.length + " prób logowania";
  document.getElementById("bodyL").innerHTML = lista.length ? lista.map(wierszL).join("") :
    '<tr><td colspan="5"><div class="empty"><div class="ei">&#9679;</div>' +
    '<div class="et">Brak prób logowania spełniających filtr</div>Zmień kryteria.</div></td></tr>';
  document.getElementById("stopkaL").textContent =
    "Widoczne " + lista.length + " pozycji. Log logowań jest niezależny od rejestru zmian " +
    "danych i podlega osobnej polityce retencji, patrz sekcja niżej.";
}

/* Sygnaly do sprawdzenia, wyliczane wylacznie z danych logu */
function nastepneUdane(r) {
  var kolejne = STAN_12.L.filter(function (x) { return x.kto === r.kto && udane(x) && x.czas > r.czas; })
    .sort(function (a, b) { return a.czas < b.czas ? -1 : 1; });
  return kolejne[0] || null;
}
function sygnalyLogowan() {
  var L = STAN_12.L, sygnaly = [];
  L.filter(function (r) { return !udane(r); }).forEach(function (r) {
    var nast = nastepneUdane(r);
    sygnaly.push(["problem", "Nieudane logowanie na konto " + r.kto,
      DB.fmtDate(r.czas) + ", IP " + r.ip + ", wynik: " + r.wynik + ". " +
      (nast ? "Kolejne udane logowanie tego konta: " + DB.fmtDate(nast.czas) + "." : "Brak późniejszego udanego logowania tego konta.")]);
  });
  L.filter(poGodzinach).forEach(function (r) {
    var u = STAN_12.UMAP[r.kto];
    sygnaly.push(["ostrzezenie", "Logowanie poza godzinami pracy",
      DB.fmtDate(r.czas) + ", konto " + r.kto + ", " + r.urzadzenie + (u ? ", rola: " + u.rola + (u["2fa"] ? "" : ", bez 2FA") : "") + "."]);
  });
  var bez2fa = DB.UZYTKOWNICY.filter(function (u) { return !u["2fa"]; }).length;
  if (bez2fa) sygnaly.push(["ostrzezenie", "Konta bez 2FA nadal aktywne", bez2fa + " kont loguje się jednoskładnikowo."]);
  return sygnaly;
}
/* Kolor kropki zawsze z etykieta: problem na czerwono, ostrzezenie na zolto, zielony tylko dla stanu w porzadku */
var POZIOMY_SYGNALOW = { problem: "problem", ostrzezenie: "ostrzeżenie", ok: "w porządku" };

function renderSygnaly() {
  var s = sygnalyLogowan();
  document.getElementById("sygnaly").innerHTML = s.length ? s.map(function (x) {
    return '<div class="tl-item ' + x[0] + '"><div class="t"><span class="sygnal ' + x[0] + '">' + POZIOMY_SYGNALOW[x[0]] + '</span> ' +
      esc(x[1]) + '</div>' +
      '<div class="m">' + esc(x[2]) + '</div></div>';
  }).join("") : '<div class="small muted">Brak sygnałów w logu.</div>';
}

function odswiez() {
  STAN_12.A = DB.AKTYWNOSC.slice().sort(najnowszeNaGorze);
  STAN_12.L = DB.LOGOWANIA.slice().sort(najnowszeNaGorze);
  DB.UZYTKOWNICY.forEach(function (u) { STAN_12.UMAP[u.login] = u; });
  odswiezFiltryA(); renderKpiA(); renderA(); renderIstotne();
  renderKpiL(); renderL(); renderSygnaly(); renderSesje12();
}

function inicjuj12() {
  STAN_12.DZIS = dzisiajData();
  podlaczZmiany();
  ["qL", "fWynik"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderL);
    document.getElementById(id).addEventListener("change", renderL);
  });
  window.addEventListener("db:changed", odswiez);
  odswiez();
}
