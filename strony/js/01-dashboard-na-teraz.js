/* Dashboard, sekcja "Na teraz" (D-324, ankieta klienta 09.10.2026): liczba zadan zalogowanego
   pracownika do wykonania i planowane nabory po dniach rozpoczecia z przejsciem do naboru.
   Kolejki spraw do dzialania sa w 01-dashboard-kolejki.js. Dane juz zawezone przez
   assets/zakres.js, wiec ekran niczego nie odfiltrowuje sam. Tylko deklaracje. */

var DNI_PLANOWANYCH_NABOROW = 10;
var DNI_TYGODNIA_01 = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

/* Otwarte zadania przypisane do zalogowanego konta, ktorym minela data przypomnienia
   (ta sama regula co na ekranie Zadania: Zadania18.sekcja) */
function mojeZadania01() {
  var ja = Auth.sesja().uzytkownik_id, dzis = STAN_01.dzis;
  var zadania = Zadania18.widoczne(DB.ZADANIA, ja, false)
    .filter(function (z) { return Zadania18.sekcja(z, dzis) === "doZrobienia"; });
  return {
    razem: zadania.length,
    zalegle: zadania.filter(function (z) { return z.termin && z.termin < dzis; }).length,
    dzis: zadania.filter(function (z) { return z.termin === dzis; }).length
  };
}

function renderMojeZadania01() {
  var el = document.getElementById("mojeZadania");
  if (!Auth.widziModul("zadania")) { el.remove(); return; }
  var m = mojeZadania01();
  var stopka = m.razem
    ? (m.zalegle ? '<span class="tag neg dot">zaległe: ' + m.zalegle + "</span> " : "") +
      (m.dzis ? '<span class="tag warn dot">na dziś: ' + m.dzis + "</span>" : "") +
      (!m.zalegle && !m.dzis ? "żadne nie jest zaległe" : "")
    : "nie masz otwartych zadań";
  el.innerHTML = kpi("Moje zadania do wykonania", DB.fmtNum(m.razem), stopka, false,
    "Otwarte zadania przypisane do Ciebie, łącznie z zaległymi. Kliknij, żeby przejść do Zadań.", "18-zadania.html");
}

/* Nabory rozpoczynajace sie dzis lub pozniej, zgrupowane po dniu rozpoczecia.
   Dzien bez naboru nie jest wierszem. Zwraca najblizsze DNI_PLANOWANYCH_NABOROW dni. */
function planowaneNabory01() {
  var dzis = STAN_01.dzis, dni = {};
  DB.NABORY.forEach(function (n) {
    if (!n.od || n.od < dzis || n.status === "zakończony") return;
    (dni[n.od] = dni[n.od] || []).push(n);
  });
  return Object.keys(dni).sort().slice(0, DNI_PLANOWANYCH_NABOROW).map(function (data) {
    return { data: data, nabory: dni[data].sort(function (a, b) { return a.pup < b.pup ? -1 : 1; }) };
  });
}

function dzienTygodnia01(data) {
  return DNI_TYGODNIA_01[new Date(data + "T00:00:00Z").getUTCDay()];
}

/* Przejscie do szczegolow naboru: lista Naborow z filtrem po urzedzie i stanie w adresie */
function adresNaboru01(n) {
  return "05-nabory.html" + Nawigacja.zbudujZapytanie({ q: n.pup, stan: n.status });
}

function liczbaNaborow01(n) {
  return n + (n === 1 ? " nabór" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? " nabory" : " naborów");
}

function dzienNaborow01(d) {
  return '<details class="nabory-dnia">' +
    '<summary><span class="nabory-data">' + esc(DB.fmtDate(d.data)) + '<span class="muted small"> ' + dzienTygodnia01(d.data) + '</span></span>' +
    '<span class="nabory-liczba">' + liczbaNaborow01(d.nabory.length) + '</span></summary>' +
    '<ul class="nabory-lista">' + d.nabory.map(function (n) {
      return '<li><a href="' + esc(adresNaboru01(n)) + '" title="Szczegóły naboru">' + esc(n.pup) + '</a>' +
        '<span class="muted small"> ' + esc(n.woj || "") + (n.do ? ", do " + esc(DB.fmtDate(n.do)) : "") + '</span></li>';
    }).join("") + '</ul></details>';
}

function renderPlanowaneNabory01() {
  var el = document.getElementById("planowaneNabory");
  if (!Auth.widziModul("nabory")) { el.remove(); return; }
  var dni = planowaneNabory01();
  el.innerHTML = '<div class="card-head"><h3>Planowane nabory</h3><span class="sub">po dniu rozpoczęcia</span></div>' +
    '<div class="card-body tight">' + (dni.length
      ? dni.map(dzienNaborow01).join("")
      : '<div class="empty"><div class="et">Brak planowanych naborów</div>Żaden nabór nie zaczyna się w najbliższym czasie.</div>') +
    '</div>';
}
