/* Ekran 04, czesc 3: podsumowanie naborow, filtry, lista klientow i inicjalizacja strony.
   Korzysta ze STAN_04 z 04-baza-klientow-dane.js i wierszy z 04-baza-klientow-wiersze.js.
   Same deklaracje. */

var LIMIT_WIERSZY_04 = 120;

/* Podsumowanie w jednej linii: kazda liczba ustawia filtr naboru (drill through, D-212) */
function renderKPI() {
  var K = STAN_04.K;
  var ile = function (statusy) { return K.filter(function (r) { return statusy.indexOf(r.status) >= 0; }).length; };
  var pozycja = function (etykieta, liczba, nabor, tip) {
    return '<a href="#" onclick="ustawNabor(\'' + escJs(nabor) + '\');return false" data-tip="' + esc(tip) + '">' +
      etykieta + ' <b>' + DB.fmtNum(liczba) + '</b></a>';
  };
  document.getElementById("kpi").innerHTML =
    pozycja("nabór trwa", ile(["trwa"]), "trwa", "Klienci, których urząd ma trwający nabór. Priorytet, sortowani po końcu naboru (D-130).") +
    pozycja("oczekuje", ile(["oczekuje"]), "oczekuje", "Urząd ogłosił nabór, termin jeszcze się nie zaczął (D-271).") +
    pozycja("prognoza", ile(["prognozowany"]), "prognozowany", "Urząd z prognozowaną datą naboru (D-90, D-271).") +
    pozycja("wszyscy", K.length, "", "Wszyscy klienci w bazie, jeden klient to jeden wiersz.");
}

function ustawNabor(nabor) {
  Wielowybor.ustaw(document.getElementById("fNab"), nabor ? [nabor] : []);
  render();
}

function wypelnijFiltry() {
  var selIS = document.getElementById("fIS");
  DB.INSTYTUCJE.forEach(function (i) {
    selIS.innerHTML += '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + '</option>';
  });
  var selPUP = document.getElementById("fPUP");
  DB.PUPY.forEach(function (p) {
    selPUP.innerHTML += '<option value="' + esc(p.id) + '">' + esc(p.nazwa) + '</option>';
  });
}

/* Filtr urzedu obejmuje urzad glowny i dodatkowe urzedy klienta (D-238) */
function urzadPasuje04(wybrane, kl) {
  return Wielowybor.pasuje(wybrane, kl.pup) || kl.urzedy.some(function (u) { return Wielowybor.pasuje(wybrane, u.pup); });
}

/* Wyszukiwarka po polach klienta: nazwa, NIP, osoby kontaktowe, telefony i e-maile, urzad, instytucja (D-256) */
function tekstWyszukiwania04(r) {
  var kontakty = r.kl.kontakty.map(function (k) { return [k.osoba, k.tel, k.mail].join(" "); });
  return [r.kl.nazwa, r.kl.nip, r.kl.miasto, r.kl.telBiura, r.kl.mailFirmy, r.pupNazwa, r.isNazwa]
    .concat(kontakty).join(" ").toLowerCase();
}

function filtrujKlientow() {
  var q = document.getElementById("q").value.toLowerCase().trim();
  var wyb = function (id) { return Wielowybor.wartosci(document.getElementById(id)); };
  var fis = wyb("fIS"), fpup = wyb("fPUP"), fnab = wyb("fNab");
  return STAN_04.K.filter(function (r) {
    if (!Wielowybor.pasuje(fis, r.kl.is)) return false;
    if (!urzadPasuje04(fpup, r.kl)) return false;
    if (!Wielowybor.pasuje(fnab, r.status)) return false;
    if (!klientWFiltrzeStatusu(r)) return false;
    if (!q) return true;
    return tekstWyszukiwania04(r).indexOf(q) >= 0;
  });
}

function render() {
  var lista = filtrujKlientow();
  document.getElementById("licz").innerHTML = "<b>" + lista.length + "</b> z " + STAN_04.K.length;

  var html = lista.slice(0, LIMIT_WIERSZY_04).map(wierszKlienta).join("");
  if (lista.length > LIMIT_WIERSZY_04) {
    html += '<tr><td colspan="12" class="c muted small" style="padding:10px">Pokazano ' + LIMIT_WIERSZY_04 + ' z ' +
      lista.length + ' wierszy, zawęź filtr.</td></tr>';
  }
  if (!lista.length) {
    html = '<tr><td colspan="12"><div class="empty"><div class="ei">&#9788;</div>' +
      '<div class="et">Brak klientów dla tych filtrów</div>Zmień kryteria albo wybierz „Wszyscy klienci”.</div></td></tr>';
  }
  document.getElementById("body").innerHTML = html;
  Nawigacja.zapiszWAdresie(wartosciFiltrow04());
}

/* Wyszukiwanie po kliknieciu "Wyszukaj" albo Enterze, jak na liscie wnioskow (decyzja klienta P-69) */
function podlaczWyszukiwanie04() {
  document.getElementById("btnSzukaj").addEventListener("click", render);
  document.getElementById("q").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); render(); }
  });
}

/* "Wyczysc filtry" jak na liscie wnioskow: wyszukiwarka i wszystkie filtry, takze domyslny filtr statusu */
function wyczyscFiltry04() {
  document.getElementById("q").value = "";
  ["fIS", "fPUP", "fNab", "fStatusWn"].forEach(function (id) { Wielowybor.ustaw(document.getElementById(id), []); });
  render();
}

/* Filtry Bazy danych w adresie: link z Naborow (pup), z wyszukiwarki globalnej (q)
   i powrot z karty wniosku otwieraja liste juz przefiltrowana */
var FILTRY_04 = { q: "q", inst: "fIS", pup: "fPUP", nabor: "fNab", wnioski: "fStatusWn" };
/* Domyslny filtr statusu ("przed") nie trafia do adresu. Pusty wybor (wszyscy klienci)
   zapisuje sie jako "wszystkie", bo brak parametru oznacza powrot do domyslnego. */
var WNIOSKI_DOMYSLNIE_04 = "przed";
var WNIOSKI_WSZYSCY_04 = "wszystkie";

/* Rozwinieci klienci tez sa w adresie (rozwin=KL-1,KL-2), wiec Wstecz odtwarza widok */
function rozwinieci() {
  return Object.keys(STAN_04.expanded).filter(function (id) { return STAN_04.expanded[id]; });
}

function wartosciFiltrow04() {
  var w = {};
  Object.keys(FILTRY_04).forEach(function (p) { w[p] = Wielowybor.tekst(document.getElementById(FILTRY_04[p])); });
  if (w.wnioski === WNIOSKI_DOMYSLNIE_04) w.wnioski = "";
  else if (!w.wnioski) w.wnioski = WNIOSKI_WSZYSCY_04;
  w.rozwin = rozwinieci().join(",");
  return w;
}

/* Parametr wnioski=wszystkie (link z Naborow, wyszukiwarki, karty klienta) zdejmuje domyslny filtr */
function wczytajFiltry04() {
  Nawigacja.wczytajFiltry(FILTRY_04);
  if (Nawigacja.odczytajZapytanie(location.search, ["wnioski"]).wnioski === WNIOSKI_WSZYSCY_04) {
    Wielowybor.ustaw(document.getElementById("fStatusWn"), []);
  }
}

function otworzWniosek04(idWniosku, idKlienta) {
  STAN_04.expanded[idKlienta] = true;
  var powrot = "04-baza-klientow.html" + Nawigacja.zbudujZapytanie(Object.assign(wartosciFiltrow04(), { pokaz: idKlienta }));
  location.href = Nawigacja.adresKarty(idWniosku, powrot);
}

/* Klik w wiersz rozwinietego wniosku otwiera jego karte */
function klikWiersza04(e) {
  if (e.target.closest("input, select, button, a")) return;
  var tr = e.target.closest("tr[data-id]");
  if (tr) otworzWniosek04(tr.dataset.id, tr.dataset.klient);
}

/* Po powrocie z karty klient jest rozwiniety i widoczny na ekranie */
function pokazRozwinietego(idKlienta) {
  var wiersz = Array.prototype.filter.call(document.querySelectorAll("#body tr[data-kl]"), function (tr) {
    return tr.dataset.kl === idKlienta;
  })[0];
  if (!wiersz) return;   /* klient poza pierwszymi LIMIT_WIERSZY_04 wierszami albo poza filtrem */
  wiersz.classList.add("wiersz-powrotu");
  wiersz.scrollIntoView({ block: "center" });
}

function przelaczWnioski(id) {
  STAN_04.expanded[id] = !STAN_04.expanded[id];
  render();
}

function inicjuj04() {
  STAN_04.DZIS = new Date();
  STAN_04.DZIS.setHours(0, 0, 0, 0);
  STAN_04.NAB = budujNabory();
  wypelnijFiltry();
  var z = Nawigacja.odczytajZapytanie(location.search, ["rozwin", "pokaz", "edytuj"]);
  wczytajFiltry04();
  z.rozwin.split(",").filter(Boolean).forEach(function (id) { STAN_04.expanded[id] = true; });
  ["fIS", "fPUP", "fNab", "fStatusWn"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", render);
  });
  podlaczWyszukiwanie04();
  document.getElementById("btnWyczysc").addEventListener("click", wyczyscFiltry04);
  document.getElementById("body").addEventListener("click", klikWiersza04);
  document.getElementById("btnNowyKlient").addEventListener("click", function () {
    otworzKlientForm(null, "Nowy klient");
  });
  document.getElementById("btnImportKlienta").addEventListener("click", pokazImportKlienta04);
  window.addEventListener("db:changed", przebuduj04);
  przebuduj04();
  /* Powrot z karty wniosku: klient, z ktorego ja otwarto, jest wyrozniony i widoczny */
  if (z.pokaz) pokazRozwinietego(z.pokaz);
  /* Wejscie z karty klienta, przycisk "Edytuj dane" */
  if (z.edytuj && DB.KLIENCI.some(function (k) { return k.id === z.edytuj; })) edytujKlient(z.edytuj);
}
