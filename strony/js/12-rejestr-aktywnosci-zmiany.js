/* Ekran 12, czesc 1: wspolny stan, zakladki, rejestr zmian danych i istotne zdarzenia.
   Plik zawiera wylacznie deklaracje. Dane sa czytane dopiero w inicjuj12(). */

var STAN_12 = { A: [], L: [], UMAP: {}, DZIS: "", tylkoFin: false, tylkoIstotne: false };
var TYPY_FIN = ["Zmiana kwoty", "Nadpisanie prowizji", "Przywrócenie reguły", "Zmiana warunków IS"];
/* Istotne zdarzenia z D-189: nie kazde klikniecie, tylko te, ktore maja znaczenie dowodowe */
var ISTOTNE = ["Otwarcie karty", "Eksport", "Wejście w moduł finansowy", "Wysyłka maila", "Zmiana statusu", "Zmiana uprawnień"];

function przelaczZakladke(id) {
  document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("on", x.dataset.t === id); });
  document.querySelectorAll(".tab-pane").forEach(function (x) { x.classList.toggle("on", x.id === id); });
}

/* Rejestr jest tylko do dopisywania (D-189): ekran nie ma zadnej akcji edycji ani usuwania wpisow. */
function dzisiajData() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function najnowszeNaGorze(a, b) { return a.czas < b.czas ? 1 : a.czas > b.czas ? -1 : 0; }

function jestFin(w) { return TYPY_FIN.indexOf(w.typ) >= 0; }
function jestIstotne(w) {
  return ISTOTNE.some(function (t) { return (w.typ || "").indexOf(t) === 0; });
}

function opcje(lista) {
  return lista.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join("");
}
function unikalne(lista, pole) {
  var out = [];
  lista.forEach(function (w) { if (w[pole] && out.indexOf(w[pole]) < 0) out.push(w[pole]); });
  return out.sort();
}
function odswiezFiltryA() {
  var fKto = document.getElementById("fKto"), fTyp = document.getElementById("fTyp");
  var kto = Wielowybor.wartosci(fKto), typ = Wielowybor.wartosci(fTyp);
  fKto.innerHTML = opcje(unikalne(STAN_12.A, "kto"));
  fTyp.innerHTML = opcje(unikalne(STAN_12.A, "typ"));
  Wielowybor.ustaw(fKto, kto);
  Wielowybor.ustaw(fTyp, typ);
}

function kpi(label, val, foot, admin) {
  return '<div class="kpi' + (admin ? " admin" : "") + '">' +
    '<div class="k-label">' + esc(label) + '</div>' +
    '<div class="k-value">' + esc(val) + '</div>' +
    (foot ? '<div class="k-foot">' + foot + '</div>' : "") + '</div>';
}

function renderKpiA() {
  var A = STAN_12.A;
  var dzisiaj = A.filter(function (w) { return w.czas.slice(0, 10) === STAN_12.DZIS; });
  var nadpisania = A.filter(function (w) {
    return w.typ === "Nadpisanie prowizji" || w.typ === "Przywrócenie reguły";
  });
  var admini = DB.UZYTKOWNICY.filter(function (u) { return u.rolaId === "admin"; }).map(function (u) { return u.imie; });
  var opAdmina = A.filter(function (w) { return admini.indexOf(w.kto) >= 0; });
  document.getElementById("kpi").innerHTML =
    kpi("Zmiany dzisiaj", dzisiaj.length, "stan na " + esc(STAN_12.DZIS)) +
    kpi("Zmiany o charakterze finansowym", A.filter(jestFin).length,
        '<span class="tag warn dot">wartości finansowe</span>', true) +
    kpi("Nadpisania i przywrócenia reguł", nadpisania.length, "pola wyliczane edytowane ręcznie", true) +
    kpi("Operacje administratora", opAdmina.length, "z " + A.length + " wpisów w rejestrze");
}

function tagTypu(t) {
  var k = t === "Zmiana kwoty" ? "warn"
        : t === "Nadpisanie prowizji" ? "neg"
        : t === "Przywrócenie reguły" ? "set"
        : t === "Zmiana statusu" ? "info"
        : t === "Zmiana uprawnień" ? "set"
        : t === "Blokada konta" ? "neg" : "mute";
  return '<span class="tag ' + k + '">' + esc(t) + '</span>';
}

function wierszA(w) {
  var fin = jestFin(w);
  return '<tr class="' + (fin ? "row-fin" : "") + '">' +
    '<td class="mono muted nowrap">' + esc(w.czas) + '</td>' +
    '<td class="strong nowrap">' + esc(w.kto) + '</td>' +
    '<td>' + tagTypu(w.typ) + '</td>' +
    '<td class="mono nowrap">' + esc(w.obiekt) + '</td>' +
    '<td class="small">' + esc(w.pole) + '</td>' +
    '<td class="small">' + (w.przed
        ? '<span class="przed">' + esc(w.przed) + '</span>'
        : '<span class="muted">wartość pusta</span>') + '</td>' +
    '<td class="small"><span class="arrow">&rarr;</span><span class="po">' + esc(w.po) + '</span></td>' +
    '<td class="c">' + (fin
        ? '<span class="tag warn dot">wartość finansowa</span>'
        : '<span class="tag mute">operacyjna</span>') + '</td>' +
    '</tr>';
}

function filtrujA() {
  var q = document.getElementById("qA").value.toLowerCase().trim();
  var fk = Wielowybor.wartosci(document.getElementById("fKto"));
  var ft = Wielowybor.wartosci(document.getElementById("fTyp"));
  var od = document.getElementById("dOd").value;
  var doo = document.getElementById("dDo").value;
  return STAN_12.A.filter(function (w) {
    var d = w.czas.slice(0, 10);
    if (!Wielowybor.pasuje(fk, w.kto)) return false;
    if (!Wielowybor.pasuje(ft, w.typ)) return false;
    if (od && d < od) return false;
    if (doo && d > doo) return false;
    if (STAN_12.tylkoFin && !jestFin(w)) return false;
    if (STAN_12.tylkoIstotne && !jestIstotne(w)) return false;
    if (q && ((w.obiekt || "") + " " + (w.pole || "") + " " + w.kto).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

function renderA() {
  var lista = filtrujA();
  document.getElementById("liczA").innerHTML =
    "<b>" + lista.length + "</b> z " + STAN_12.A.length + " wpisów &middot; w tym " +
    lista.filter(jestFin).length + " o charakterze finansowym";

  document.getElementById("bodyA").innerHTML = lista.length ? lista.map(wierszA).join("") :
    '<tr><td colspan="8"><div class="empty"><div class="ei">&#9679;</div>' +
    '<div class="et">Brak wpisów w wybranym zakresie</div>' +
    'Rozszerz zakres dat albo wyczyść filtry.</div></td></tr>';

  document.getElementById("stopkaA").textContent =
    "Widoczne " + lista.length + " wpisów. W systemie docelowym rejestr liczy setki tysięcy pozycji " +
    "rocznie, dlatego lista będzie stronicowana.";
}

/* Istotne zdarzenia (D-189): jedno zrodlo, te same wpisy co w rejestrze zmian.
   Tu tylko podsumowanie per typ i skrot do filtra. */
function renderIstotne() {
  document.getElementById("bodyIstotne").innerHTML = ISTOTNE.map(function (typ) {
    var wpisy = STAN_12.A.filter(function (w) { return (w.typ || "").indexOf(typ) === 0; });
    return '<tr><td class="strong">' + esc(typ) + '</td>' +
      '<td class="num">' + wpisy.length + '</td>' +
      '<td class="mono muted nowrap">' + (wpisy.length ? esc(wpisy[0].czas) : "brak wpisów") + '</td>' +
      '<td class="right">' + (wpisy.length
        ? '<button class="btn xs" onclick="pokazTyp(\'' + escJs(typ) + '\')">Pokaż wpisy</button>' : "") + '</td></tr>';
  }).join("");
}

/* Filtr po typie: zaznacza wszystkie typy z rejestru zaczynajace sie od podanego i wraca do listy */
function pokazTyp(typ) {
  var pasujace = unikalne(STAN_12.A, "typ").filter(function (t) { return t.indexOf(typ) === 0; });
  Wielowybor.ustaw(document.getElementById("fTyp"), pasujace);
  document.getElementById("dOd").value = "";
  przelaczZakladke("t1");
  renderA();
}

function przelaczChip(klucz, chipId) {
  STAN_12[klucz] = !STAN_12[klucz];
  document.getElementById(chipId).classList.toggle("on", STAN_12[klucz]);
  renderA();
}

function podlaczZmiany() {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () { przelaczZakladke(t.dataset.t); });
  });
  document.getElementById("chipFin").addEventListener("click", function () { przelaczChip("tylkoFin", "chipFin"); });
  document.getElementById("chipIstotne").addEventListener("click", function () { przelaczChip("tylkoIstotne", "chipIstotne"); });
  ["qA", "fKto", "fTyp", "dOd", "dDo"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderA);
    document.getElementById(id).addEventListener("change", renderA);
  });
  document.getElementById("dDo").value = STAN_12.DZIS;
}
