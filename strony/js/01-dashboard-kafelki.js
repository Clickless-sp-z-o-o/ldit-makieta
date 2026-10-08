/* Dashboard: stan wspolny strony i kafelki KPI. Tylko deklaracje, dane wypelnia inicjalizacja. */
var STAN_01 = {};
var DNI_NABORU = 7;
var DNI_SZKOLENIA = 8;

function dzisiaj01() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* Zbiory wnioskow biezacego roku, z ktorych liczy sie kafelki i statusy */
function przygotujStan01() {
  var s = STAN_01;
  s.dzis = dzisiaj01();
  s.rok = s.dzis.slice(0, 4);
  s.rokPoprzedni = String(parseInt(s.rok, 10) - 1);
  s.wnioski = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.rok === s.rok; });
  s.zlozone = s.wnioski.filter(function (w) { return w.statusSkl === "Złożony"; });
  s.poz = s.wnioski.filter(function (w) { return w.statusDec === "Pozytywna"; });
  s.neg = s.wnioski.filter(function (w) { return w.statusDec === "Negatywna"; });
  s.oczek = s.wnioski.filter(function (w) { return w.statusSkl === "Złożony" && !w.statusDec; });
}

/* href: kafelek prowadzi do rekordow, z ktorych sie sklada (drill through, D-212) */
function kpi(label, val, foot, admin, tip, href) {
  var mark = tip ? '<span class="tip-mark" data-tip="' + esc(tip) + '">i</span>' : "";
  var klasy = "kpi" + (admin ? " admin" : "");
  var link = href ? ' data-href="' + esc(href) + '" title="Pokaż szczegóły"' : "";
  return '<div class="' + klasy + '"' + link + '>' +
    '<div class="k-label">' + label + mark + '</div>' +
    '<div class="k-value">' + val + '</div>' +
    (foot ? '<div class="k-foot">' + foot + '</div>' : "") + '</div>';
}

/* Porownanie rok do roku z podsumowan (D-175). Bierzemy tylko instytucje, ktore maja dane
   za rok poprzedni, zeby nie porownywac wszystkich z podzbiorem. Brak danych = brak porownania. */
function porownanieRokDoRoku(miara) {
  var rok = STAN_01.rok, rokPoprzedni = STAN_01.rokPoprzedni;
  var poprzednie = DB.PODSUMOWANIA.filter(function (p) { return p.rok === rokPoprzedni && p.miara === miara; });
  if (!poprzednie.length) return "";
  var ids = {};
  poprzednie.forEach(function (p) { ids[p.isId] = true; });
  var suma = function (r) {
    return DB.PODSUMOWANIA.filter(function (p) { return p.rok === r && p.miara === miara && ids[p.isId]; })
      .reduce(function (s, p) { return s + p.wartosc; }, 0);
  };
  var przed = suma(rokPoprzedni), teraz = suma(rok);
  if (!przed) return "";
  var delta = Math.round((teraz - przed) / przed * 100);
  return '<span class="delta ' + (delta >= 0 ? "up" : "down") + '">' + (delta >= 0 ? "&#9650; " : "&#9660; ") +
    Math.abs(delta) + '%</span> wobec ' + rokPoprzedni + " (" + Object.keys(ids).length + " instytucji z danymi)";
}

/* "Ile jest Klientow do obdzwonienia" - wprost z dokumentu klienta */
function liczPupZNaborem() {
  return DB.NABORY.filter(function (n) { return n.status === "trwa"; })
    .map(function (n) { return n.pup; });
}

function liczDoObdzwonienia(pupZNaborem) {
  return DB.KLIENCI.filter(function (k) {
    var pup = (DB.PUPY.filter(function (p) { return p.id === k.pup; })[0] || {}).nazwa;
    return pupZNaborem.indexOf(pup) >= 0;
  }).length;
}

/* Link do wnioskow biezacego roku; rola bez Dofinansowan (instytucja) dostaje kafelek bez linku */
function linkWnioskow01(filtry) {
  return Auth.widziModul("dofin") ? Nawigacja.adresWnioskow(Object.assign({ rok: STAN_01.rok }, filtry)) : null;
}

function renderKpiOperacyjne() {
  var s = STAN_01;
  var pupZNaborem = liczPupZNaborem();
  var rozstrzygniete = s.poz.length + s.neg.length;
  var sumaOczek = s.oczek.reduce(function (sum, w) { return sum + w.wartosc; }, 0);

  document.getElementById("kpi").innerHTML =
    kpi("Klienci do obdzwonienia", DB.fmtNum(liczDoObdzwonienia(pupZNaborem)),
        '<span class="tag neg dot">nabór trwa</span> ' + pupZNaborem.length + " urzędy", false,
        "Klienci, których urząd pracy ma teraz otwarty nabór.",
        Auth.widziModul("dofin") ? "04-baza-klientow.html" + Nawigacja.zbudujZapytanie({ nabor: "trwa", wnioski: "wszystkie" }) : null) +
    kpi("Wnioski złożone", DB.fmtNum(s.zlozone.length), porownanieRokDoRoku("wnioski_zlozone"), false,
        "Wnioski złożone w tym roku, w porównaniu z poprzednim.",
        linkWnioskow01({ zlozone: "1" })) +
    kpi("Decyzje pozytywne", DB.fmtNum(s.poz.length),
        '<span class="tag pos dot">' + (rozstrzygniete ? Math.round(s.poz.length / rozstrzygniete * 100) : 0) + '% skuteczności</span>', false,
        "Skuteczność to udział decyzji pozytywnych wśród pozytywnych i negatywnych.",
        linkWnioskow01({ status: "Pozytywna" })) +
    kpi("Oczekuje na rozpatrzenie", DB.fmtNum(s.oczek.length), "na kwotę " + DB.fmtPLN(sumaOczek), false,
        "Złożone wnioski bez decyzji urzędu i ich łączna wartość.",
        linkWnioskow01({ status: "Czekamy" }));
}

/* Drugie sito uprawnien. Dane finansowe i tak nie dojechaly do strony,
   bo odsial je assets/zakres.js, ale ekran nie ma nawet rysowac kafelkow,
   ktorych ta rola nie powinna znac (D-34, D-114). */
function renderKpiFinansowe() {
  var s = STAN_01;
  if (!Auth.moze("finanse.zysk_ldit")) { document.getElementById("kpiFin").remove(); return; }
  var sumaWnioskowana = s.wnioski.reduce(function (sum, w) { return sum + w.wartosc; }, 0);
  var sumaPrzyznana = s.poz.reduce(function (sum, w) { return sum + (w.przyznano || 0); }, 0);

  /* Prowizja naliczona i rozliczona liczy sie w jednym miejscu: modul Administracja */
  var kafelekProwizji = Auth.moze("finanse.prowizja")
    ? kpi("Prowizja", '<a href="08-administracja.html">Administracja</a>', "naliczona i rozliczona, jedno źródło liczb", true,
          "Prowizja jest liczona w module Administracja.")
    : "";

  document.getElementById("kpiFin").innerHTML =
    kpi("Wartość wniosków", DB.fmtPLN(sumaWnioskowana), "suma wnioskowana " + s.rok, true,
        "Suma wartości wniosków w tym roku, niezależnie od decyzji.") +
    kpi("Przyznane dofinansowania", DB.fmtPLN(sumaPrzyznana), "faktycznie przyznane", true,
        "Suma kwot przyznanych w decyzjach pozytywnych.") +
    kafelekProwizji;
}
