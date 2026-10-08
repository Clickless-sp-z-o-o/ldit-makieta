/* Ekran 19, uczestnicy klienta: lista, dodawanie, edycja i usuwanie (D-236).
   Dane leza przy kliencie, projekt tylko wybiera z tej listy. Tylko deklaracje. */

var PREFIKS_UCZESTNIKA = "uk";
var STAN_UCZESTNIKA = { edytowany: null };

/* Karta klienta edytuje sie z Bazy danych, ale konto z edycja Dofinansowan tez moze (D-265) */
function mozeEdytowac19() { return Auth.edytujeModul("baza") || Auth.edytujeModul("dofin"); }

function uczestnicyKlienta19() {
  return DB.UCZESTNICY_KLIENTA.filter(function (u) { return u.klient === STAN_19.kl.id; });
}

function wierszUczestnika19(u) {
  var brak = '<span class="muted">&mdash;</span>';
  var ostrz = KlientLogika.ostrzezenieUmowy(u, new Date().toISOString().slice(0, 10));
  return '<tr data-uk="' + esc(u.id) + '">' +
    '<td class="strong">' + esc(u.imie) + (ostrz ? '<div class="small" style="color:var(--neg,#b91c1c)">&#9888; ' + esc(ostrz) + '</div>' : "") + '</td>' +
    '<td>' + esc(KlientLogika.etykieta(KlientLogika.RODZAJE_ZATRUDNIENIA, u.zatrudnienie) || "") + '</td>' +
    '<td class="nowrap">' + (u.zatrudnienieDo ? esc(DB.fmtDate(u.zatrudnienieDo)) : '<span class="muted">czas nieokreślony</span>') + '</td>' +
    '<td>' + (esc(u.wyksztalcenie) || brak) + '</td>' +
    '<td class="mono">' + (u.pesel ? esc(u.pesel) : '<span class="muted">ukryty</span>') + '</td>' +
    '<td class="num">' + (u.wiek != null ? esc(u.wiek) : brak) + '</td>' +
    '<td>' + (esc(u.zawod) || brak) + '</td>' +
    '<td class="right nowrap">' + (mozeEdytowac19()
      ? '<button class="btn xs" data-akcja="edytuj">Edytuj</button> <button class="btn xs" data-akcja="usun">Usuń</button>' : "") + '</td></tr>';
}

function renderUczestnicy19() {
  var lista = uczestnicyKlienta19();
  el19("subUczestnicy").textContent = lista.length + " osób";
  el19("uczestnicyKlienta").innerHTML = lista.length ? lista.map(wierszUczestnika19).join("")
    : '<tr><td colspan="8" class="muted">Klient nie ma jeszcze uczestników. Dodaj ich tutaj, a projekt tylko ich wybierze.</td></tr>';
  el19("btnDodajUczestnika").style.display = mozeEdytowac19() ? "" : "none";
}

function otworzFormUczestnika(u) {
  STAN_UCZESTNIKA.edytowany = u ? u.id : null;
  var form = el19("uczestnikForm");
  form.innerHTML = '<div class="small strong" style="margin-bottom:10px">' + (u ? "Edycja uczestnika" : "Nowy uczestnik") + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' + KlientFormularz.uczestnikHtml(PREFIKS_UCZESTNIKA, u) + '</div>' +
    '<div class="small" id="uczestnikBledy" style="color:var(--neg,#b91c1c);margin-top:8px"></div>' +
    '<div class="btn-row" style="margin-top:12px"><button class="btn primary sm" data-akcja="zapisz">Zapisz</button>' +
    '<button class="btn sm" data-akcja="anuluj">Anuluj</button></div>';
  form.style.display = "block";
}
function zamknijFormUczestnika() {
  STAN_UCZESTNIKA.edytowany = null;
  el19("uczestnikForm").style.display = "none";
  el19("uczestnikForm").innerHTML = "";
}

/* Zmiana imienia, nazwiska albo PESEL osoby z wnioskami pyta o zgode (decyzja P-76 c, js/19-klient-osoba.js) */
function zapiszUczestnika19() {
  var dane = KlientFormularz.zbierzUczestnika(PREFIKS_UCZESTNIKA);
  var pytanie = KlientOsoba.pytanie(KlientOsoba.zmianaTozsamosci(STAN_UCZESTNIKA.edytowany, dane));
  if (pytanie && !window.confirm(pytanie)) {
    el19("uczestnikBledy").textContent = "Nie zapisano. Dane osoby na wnioskach zostały bez zmian.";
    return;
  }
  var wynik = KlientOsoba.zapiszZeSladem(STAN_19.kl.id, STAN_UCZESTNIKA.edytowany, dane);
  if (!wynik.ok) { el19("uczestnikBledy").textContent = wynik.bledy.join(" "); return; }
  zamknijFormUczestnika();
}

function usunUczestnika19(id) {
  var u = uczestnicyKlienta19().filter(function (x) { return x.id === id; })[0];
  if (!window.confirm("Usunąć uczestnika " + u.imie + " z karty klienta?")) return;
  var wynik = KlientLogika.usunUczestnikaKlienta(id);
  if (!wynik.ok) window.alert(wynik.bledy.join(" "));
}

function klikUczestnikow19(e) {
  var przycisk = e.target.closest("button[data-akcja]");
  if (!przycisk) return;
  var tr = e.target.closest("tr[data-uk]");
  var id = tr ? tr.dataset.uk : null;
  if (przycisk.dataset.akcja === "edytuj") otworzFormUczestnika(uczestnicyKlienta19().filter(function (x) { return x.id === id; })[0]);
  else if (przycisk.dataset.akcja === "usun") usunUczestnika19(id);
}

function podepnijUczestnikow19() {
  el19("btnDodajUczestnika").addEventListener("click", function () { otworzFormUczestnika(null); });
  el19("uczestnicyKlienta").addEventListener("click", klikUczestnikow19);
  el19("uczestnikForm").addEventListener("click", function (e) {
    var a = e.target.closest("button[data-akcja]");
    if (!a) return;
    if (a.dataset.akcja === "zapisz") zapiszUczestnika19();
    else zamknijFormUczestnika();
  });
}
