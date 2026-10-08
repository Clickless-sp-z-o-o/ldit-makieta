/* Ekran 04, czesc 4: formularz klienta (dodawanie i edycja). Z bazy nie usuwa sie klientow (D-128).
   Pelny zestaw pol w zwijanych sekcjach (D-256, D-257) dzieli z karta klienta (19-klient-pola.js i
   19-klient-formularz.js), zapis robi KlientLogika (19-klient-logika.js), a walidacje pol warstwa danych
   (walidacja.js). Przy dodawaniu od razu wpisuje sie uczestnikow (D-236). Same deklaracje. */

var PREFIKS_FORM_KLIENTA = "kf";
var PREFIKS_NOWEGO_UCZESTNIKA = "nu";
var STAN_FORM_04 = { uczestnicy: 0 };

function poleInstytucjiHtml() {
  var opcje = DB.INSTYTUCJE.map(function (i) { return '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + '</option>'; }).join("");
  return '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Instytucja</span>' +
    '<select class="inp" id="kf_is">' + opcje + '</select></label>';
}

function uczestnicyFormHTML(kl) {
  if (kl) {
    return '<div class="small muted" style="margin-top:10px">Uczestników i dodatkowe urzędy klienta edytujesz w ' +
      '<a class="link-rekordu" href="' + esc(Nawigacja.adresKlienta(kl.id)) + '#uczestnicy">karcie klienta</a> (D-236, D-238).</div>';
  }
  return '<div class="small strong" style="margin-top:14px">Uczestnicy <span class="muted">(opcjonalnie, można dodać później w karcie klienta)</span></div>' +
    '<div id="nowiUczestnicy"></div>' +
    '<button class="btn sm" type="button" style="margin-top:8px" onclick="dodajWierszUczestnika04()">+ Dodaj uczestnika</button>';
}

function klientFormHTML(kl, tytul) {
  return '<div class="card mb0"><div class="card-body">' +
    '<div class="small strong" style="margin-bottom:10px">' + esc(tytul) + '</div>' +
    (kl ? "" : '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding-bottom:10px">' + poleInstytucjiHtml() + '</div>') +
    KlientFormularz.klientHtml(PREFIKS_FORM_KLIENTA, kl) + uczestnicyFormHTML(kl) +
    '<div class="small" id="klientBledy" style="color:var(--neg,#b91c1c);margin-top:8px"></div>' +
    '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn primary sm" onclick="zapiszKlient()">Zapisz</button>' +
      '<button class="btn sm" onclick="zamknijKlientForm()">Anuluj</button>' +
    '</div></div></div>';
}

/* Kazdy dopisywany uczestnik ma wlasny prefiks pol: nu0, nu1, ... */
function dodajWierszUczestnika04() {
  var p = PREFIKS_NOWEGO_UCZESTNIKA + STAN_FORM_04.uczestnicy++;
  var wiersz = document.createElement("div");
  wiersz.dataset.prefiks = p;
  wiersz.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)";
  wiersz.innerHTML = KlientFormularz.uczestnikHtml(p, null);
  document.getElementById("nowiUczestnicy").appendChild(wiersz);
}

function zbierzNowychUczestnikow() {
  var wiersze = document.querySelectorAll("#nowiUczestnicy [data-prefiks]");
  return Array.prototype.map.call(wiersze, function (w) { return KlientFormularz.zbierzUczestnika(w.dataset.prefiks); })
    .filter(function (u) { return u.imie_nazwisko.trim() !== ""; });
}

function otworzKlientForm(kl, tytul) {
  var el = document.getElementById("klientForm");
  STAN_FORM_04.uczestnicy = 0;
  el.innerHTML = klientFormHTML(kl, tytul);
  el.style.display = "block";
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}
function zamknijKlientForm() {
  var el = document.getElementById("klientForm");
  el.style.display = "none"; el.innerHTML = ""; STAN_04.edytowanyKlient = null;
}
function edytujKlient(id) {
  STAN_04.edytowanyKlient = id;
  var kl = DB.KLIENCI.filter(function (x) { return x.id === id; })[0];
  otworzKlientForm(kl ? Store.find("klienci", id) : null, "Edycja klienta: " + (kl ? kl.nazwa : id));
}

function zapiszKlient() {
  var dane = KlientFormularz.zbierzKlienta(PREFIKS_FORM_KLIENTA);
  /* Instytucja pozyskujaca zostaje bez zmian przy edycji, formularz jej nie podaje */
  var wynik = STAN_04.edytowanyKlient
    ? KlientLogika.zapiszDaneKlienta(STAN_04.edytowanyKlient, dane)
    : KlientLogika.utworzKlienta(dane, document.getElementById("kf_is").value, zbierzNowychUczestnikow());
  if (!wynik.ok) { document.getElementById("klientBledy").textContent = wynik.bledy.join(" "); return; }
  if (!STAN_04.edytowanyKlient) document.getElementById("q").value = dane.nazwa;
  zamknijKlientForm();
}
