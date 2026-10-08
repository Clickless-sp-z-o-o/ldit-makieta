/* Administracja 08: stan wspolny, slowniki, pomocniki i inicjalizacja. Tylko deklaracje. */
var MIES = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
            "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
var MARGINES_PROGU = 0.2;

/* Jeden slownik modeli, zgodny z komentarzem naglowka assets/prowizja.js */
var MODELE = {
  A: { klasa: "pill", opis: "kumulacja miesięczna, stawka od całości obrotu okresu" },
  B: { klasa: "pill k", opis: "kumulacja roczna, stawka od nadwyżki ponad próg" },
  C: { klasa: "pill w", opis: "kumulacja miesięczna, stawka od nadwyżki ponad próg" },
  D: { klasa: "pill", opis: "stała stawka, bez progów" }
};

/* Stan wspolny miedzy plikami strony, wypelniany w inicjuj08() */
var STAN_08 = {};

/* ---------- Pomocnicze ---------- */
function kartaKpi(label, val, foot, admin) {
  return '<div class="kpi' + (admin ? " admin" : "") + '">' +
    '<div class="k-label">' + label + '</div><div class="k-value">' + val + '</div>' +
    (foot ? '<div class="k-foot">' + foot + '</div>' : "") + '</div>';
}
function pillModel(m) {
  return '<span class="' + (MODELE[m] ? MODELE[m].klasa : "pill") + '">' + esc(m) + '</span>';
}
function opisOkresu(kum) {
  return kum === "miesieczny" ? "miesięczny" : kum === "roczny" ? "roczny" : "bez kumulacji";
}
function nazwaOkresu(okres) {
  return okres ? MIES[parseInt(okres.slice(5, 7), 10) - 1] + " " + STAN_08.rok : "cały rok " + STAN_08.rok;
}
function pct2(n) { return DB.fmtPct(Math.round(n * 100) / 100); }
function znakPodpowiedzi(txt) { return '<span class="tip-mark" data-tip="' + esc(txt) + '">i</span>'; }
function brakDanych(kolumn, tytul, opis) {
  return '<tr><td colspan="' + kolumn + '"><div class="empty"><div class="ei">&#9744;</div>' +
    '<div class="et">' + tytul + '</div>' + opis + '</div></td></tr>';
}

function podlaczZakladki() {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
      document.querySelectorAll(".tab-pane").forEach(function (x) { x.classList.remove("on"); });
      t.classList.add("on");
      document.getElementById(t.dataset.t).classList.add("on");
    });
  });
}

/* Wejscie z linku (np. dashboard "Faktury po terminie"): ?zakladka=faktury&status=Po terminie
   otwiera zakladke i ustawia filtr statusu faktur. Nieznana zakladka zostawia domyslna. */
function otworzZakladkeZAdresu() {
  var p = Nawigacja.odczytajZapytanie(location.search, ["zakladka", "status"]);
  var tab = document.querySelector('.tab[data-t="t-' + CSS.escape(p.zakladka) + '"]');
  if (tab) tab.click();
  if (p.status) Wielowybor.ustaw(document.getElementById("fFSt"), p.status);
}

function wypelnijSelektorOkresu() {
  var miesiace = {};
  Object.keys(STAN_08.wyniki).forEach(function (k) {
    STAN_08.wyniki[k].pozycje.forEach(function (p) {
      if (p.data.slice(0, 4) === STAN_08.rok) miesiace[p.data.slice(0, 7)] = true;
    });
  });
  STAN_08.selOkres = document.getElementById("okres");
  STAN_08.selOkres.innerHTML = '<option value="">Cały rok ' + STAN_08.rok + "</option>" +
    Object.keys(miesiace).sort().map(function (m) {
      return '<option value="' + esc(m) + '">' + nazwaOkresu(m) + "</option>";
    }).join("");
}

function przygotujDane08() {
  var d = new Date();
  STAN_08.dzis = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  STAN_08.rok = STAN_08.dzis.slice(0, 4);
  STAN_08.mapSzk = {};
  DB.SZKOLENIA.forEach(function (s) { STAN_08.mapSzk[s.id] = s; });
  STAN_08.mapWniosek = {};
  DB.WNIOSKI_WSZYSTKIE.forEach(function (w) { STAN_08.mapWniosek[w.id] = w; });
  /* Faktury do rozliczenia: pozytywne wnioski z data faktury (podstawa z widoku SQL)
     oraz faktury korygujace z tabeli faktury */
  STAN_08.poz = DB.WNIOSKI_WSZYSTKIE.filter(function (w) {
    return w.statusDec === "Pozytywna" && w.dataFaktury && w.podstawaProwizji != null;
  });
  STAN_08.fakturyPoId = {};
  DB.FAKTURY.forEach(function (f) { STAN_08.fakturyPoId[f.id] = f; });
  STAN_08.wyniki = {};
  DB.INSTYTUCJE.forEach(function (inst) { STAN_08.wyniki[inst.id] = rozliczInstytucje(inst); });
}

function inicjuj08() {
  przygotujDane08();
  widokFaktury();
  /* Zakladka Faktury powstaje w skrypcie, po zamianie filtrow przez boot.js */
  Wielowybor.zamienWszystkie(document.getElementById("t-faktury"));
  widokStatystyki();
  widokWewnetrzne();

  document.getElementById("legendaModeli").innerHTML = Object.keys(MODELE).map(function (m) {
    return '<span><span class="' + MODELE[m].klasa + '">' + m + "</span> " + MODELE[m].opis + "</span>";
  }).join("");
  document.getElementById("tagRok").textContent = "rok " + STAN_08.rok;
  podlaczZakladki();
  otworzZakladkeZAdresu();

  wypelnijSelektorOkresu();
  STAN_08.wybranaIS = (DB.INSTYTUCJE.filter(function (i) { return pozycjeIS(i.id, "").length; })[0] ||
                       DB.INSTYTUCJE[0] || {}).id;
  STAN_08.selOkres.addEventListener("change", function () { renderProwizje(); renderProjekty(); });
  STAN_08.selFIS = document.getElementById("fFIS");
  podlaczFaktury();
  document.getElementById("miaraNagrody").addEventListener("change", renderStat);

  renderProwizje();
  renderProjekty();
  renderDashboard();
  renderPrognoza();
  renderFaktury();
  renderStat();
  renderKaskada();
  renderCele();
}
