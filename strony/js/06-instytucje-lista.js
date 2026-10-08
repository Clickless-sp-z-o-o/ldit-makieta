/* Ekran Instytucje: filtry, lista kafelkow, zakladki, odswiezanie.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- Filtry listy ---------- */
function unikalne(pole) {
  var m = {};
  /* Pole moze byc lista (opiekunowie instytucji, D-274) */
  DB.INSTYTUCJE.forEach(function (i) { [].concat(i[pole] || []).forEach(function (v) { m[v] = 1; }); });
  return Object.keys(m).sort();
}
/* Filtr wielokrotnego wyboru (assets/wielowybor.js): opcje z danych, wybor zachowany po odswiezeniu */
function wypelnijFiltr(id, etykieta, pole) {
  var sel = el(id), stare = Wielowybor.wartosci(sel);
  sel.setAttribute("data-pusty", etykieta + ": wszyscy");
  sel.innerHTML = unikalne(pole).map(function (v) {
    return '<option value="' + esc(v) + '">' + esc(v) + "</option>";
  }).join("");
  Wielowybor.ustaw(sel, stare);
}
function widoczne() {
  var q = el("fSzukaj").value.trim().toLowerCase();
  var op = Wielowybor.wartosci(el("fOpiekun")), mi = Wielowybor.wartosci(el("fMiasto"));
  return DB.INSTYTUCJE.filter(function (i) {
    if (op.length && !i.opiekunowie.some(function (o) { return op.indexOf(o) >= 0; })) return false;
    if (!Wielowybor.pasuje(mi, i.miasto)) return false;
    if (!q) return true;
    return [i.nazwa, i.miasto, i.nip].join(" ").toLowerCase().indexOf(q) >= 0;
  });
}

/* ---------- Lista kafelkow ---------- */
var UDZIAL_KOLORU_TLA = 0.12;   /* tlo kafelka: 12% koloru instytucji na bialym, tekst zostaje czytelny */

/* Jasny wariant koloru instytucji na tlo kafelka (ten sam kolor co w kalendarzu, D-267) */
function tloKafelka06(hex) {
  return "#" + [1, 3, 5].map(function (p) {
    var v = Math.round(255 - (255 - parseInt(hex.slice(p, p + 2), 16)) * UDZIAL_KOLORU_TLA);
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
}

function mini06(liczba, slowo, opis) {
  return '<div class="mini" data-tip="' + opis + '"><div class="mv">' + DB.fmtNum(liczba) + '</div><div class="ml">' + odmiana06(liczba, slowo) + "</div></div>";
}

function kafelek(i) {
  return '<div class="card is-card" data-id="' + esc(i.id) + '" style="--kolor-is:' + esc(i.kolor) + ";--tlo-is:" + tloKafelka06(i.kolor) + '"' +
    ' aria-label="Konfiguracja instytucji ' + esc(i.nazwa) + '">' +
    '<div class="card-body">' +
      '<div style="display:flex;align-items:flex-start;gap:10px">' +
        '<div>' +
          '<div class="is-nazwa">' + esc(i.nazwa) + '</div>' +
          '<div class="small">' + esc(i.miasto) + ' &middot; NIP ' + esc(i.nip) + '</div>' +
        '</div>' +
        '<span class="pill" style="margin-left:auto">' + esc(i.skrot) + '</span>' +
      '</div>' +
      '<div class="small is-kontakt"><b>Kontakt:</b> ' + esc(i.kontakt) + '<br><b>Opiekunowie:</b> ' + esc(i.opiekun) + '</div>' +
      '<div class="miniset">' +
        mini06(klienciIS(i.id).length, "klient", "Liczba klientów końcowych przypisanych do tej instytucji.") +
        mini06(szkoleniaIS(i.id).length, "program", "Programy szkoleń tej instytucji.") +
        mini06(aktywneIS(i.id).length, "projekt", "Projekty aktywne w 2026: złożone bez decyzji lub z decyzją pozytywną, jeszcze nierozliczone.") +
      '</div>' +
    '</div>' +
  '</div>';
}
function renderLista() {
  var lista = widoczne();
  el("listaIS").innerHTML = lista.length ? lista.map(kafelek).join("") :
    '<div class="empty"><div class="et">Brak instytucji</div>Żadna instytucja nie spełnia filtrów.</div>';
  var akt = DB.INSTYTUCJE.filter(function (i) { return czyAktywna(i.id); }).length;
  el("chipAkt").textContent = akt;
  el("chipNieakt").textContent = DB.INSTYTUCJE.length - akt;
  el("stopkaLista").textContent = "Pokazano " + lista.length + " z " + DB.INSTYTUCJE.length +
    " instytucji dostępnych dla tego konta.";
  /* Kafelek otwiera konfiguracje instytucji jako osobny widok (06-instytucje-widoki.js);
     data-klik daje mu fokus i Enter z klawiatury (assets/interfejs.js) */
  Array.prototype.forEach.call(document.querySelectorAll(".is-card"), function (k) {
    k.setAttribute("data-klik", "");
    k.addEventListener("click", function () { otworzKonfiguracje06(k.getAttribute("data-id")); });
  });
}

function aktywujTab(pid) {
  Array.prototype.forEach.call(document.querySelectorAll("#tabs .tab"), function (x) { x.classList.remove("on"); });
  Array.prototype.forEach.call(document.querySelectorAll(".tab-pane"), function (x) { x.classList.remove("on"); });
  var tb = document.querySelector('#tabs .tab[data-p="' + pid + '"]');
  if (tb) tb.classList.add("on");
  el(pid).classList.add("on");
}

/* Po kazdej zmianie danych: lista zawsze, konfiguracja i karta planu gdy sa otwarte.
   Wejscie z linku (?id=IS-01) obsluguje wybierzZAdresu06 w 06-instytucje-widoki.js. */
function odswiez06() {
  wypelnijFiltr("fOpiekun", "Opiekun", "opiekunowie");
  wypelnijFiltr("fMiasto", "Miasto", "miasto");
  renderLista();
  if (STAN_06.widok !== "przeglad" && aktualnaIS()) renderSzczegol();
}
