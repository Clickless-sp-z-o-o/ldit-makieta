/* Ekran 20, czesc 1: dwie listy do akceptacji (formularze zgloszeniowe, zmiany danych),
   filtry w adresie i wybor wiersza. Same deklaracje. */

var STAN_20 = { widok: "formularze", wybrany: null };
var FILTRY_20 = { q: "q", inst: "fIS", status: "fStatus" };
var WYPELNIL_20 = { pracownik: "pracownik", handlowiec: "handlowiec instytucji", instytucja: "instytucja" };
var ZRODLO_20 = { reczny: "ręcznie", csv: "plik CSV", xlsx: "plik Excel", pdf: "plik PDF" };

function el20(id) { return document.getElementById(id); }

function imieKonta(id) {
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === id; })[0];
  return u ? u.imie : (id || "-");
}

/* Zwrot do uzupelnienia to odrzucenie z powodem zaczynajacym sie od Akceptacje.PREFIKS_ZWROTU (D-269) */
function etykietaStatusu20(r) {
  return r.status === "odrzucony" && r.powod && r.powod.indexOf(Akceptacje.PREFIKS_ZWROTU) === 0 ? "zwrócony do uzupełnienia" : r.status;
}

function tagStatusu20(r) {
  var klasa = r.status === "oczekuje" ? "warn" : r.status === "zaakceptowany" || r.status === "zatwierdzona" ? "pos" : "neg";
  return '<span class="tag ' + klasa + ' dot">' + esc(etykietaStatusu20(r)) + '</span>';
}

function pasujeStatus20(status) {
  var wybrane = Wielowybor.wartosci(el20("fStatus"));
  return Wielowybor.pasuje(wybrane, status === "oczekuje" ? "oczekuje" : "rozpatrzone");
}

function lista20() {
  var q = el20("q").value.toLowerCase().trim();
  var fis = Wielowybor.wartosci(el20("fIS"));
  var zrodlo = STAN_20.widok === "formularze" ? DB.KOLEJKA : DB.PROPOZYCJE;
  return zrodlo.filter(function (r) {
    if (!Wielowybor.pasuje(fis, r.isId) || !pasujeStatus20(r.status)) return false;
    var h = STAN_20.widok === "formularze" ? [r.firma, r.nip, r.is, r.szkolenie, r.kontakt, r.email, r.telefon].join(" ") : [r.is, r.tabela, r.rekord].join(" ");
    return !q || h.toLowerCase().indexOf(q) >= 0;
  }).sort(function (a, b) { return (b.data || b.zgloszono || "") < (a.data || a.zgloszono || "") ? -1 : 1; });
}

function wierszFormularza20(f) {
  return '<tr data-id="' + esc(f.id) + '"' + (f.id === STAN_20.wybrany ? ' class="wybrany"' : "") + '>' +
    '<td class="nowrap mono small">' + esc(DB.fmtDate(f.data)) + '</td>' +
    '<td class="strong"><div class="tnij" title="' + esc(f.firma) + '">' + esc(f.firma) + '</div><span class="pod mono">' + esc(f.nip) + '</span></td>' +
    '<td><div class="tnij" title="' + esc(f.is) + '">' + esc(f.is) + '</div></td>' +
    '<td class="small">' + esc(WYPELNIL_20[f.wypelnil] || f.wypelnil) + '<div class="pod">' + esc(ZRODLO_20[f.zrodlo] || f.zrodlo) + '</div></td>' +
    '<td class="c">' + esc(f.osob) + '</td>' +
    '<td>' + tagStatusu20(f) + (f.braki.length && f.status === "oczekuje" ? ' <span class="tag warn" title="Brakuje: ' + esc(f.braki.join(", ")) + '">braki ' + f.braki.length + '</span>' : "") + '</td></tr>';
}

function opisRekordu20(p) {
  if (p.tabela === "instytucje") return "dane instytucji";
  var k = DB.KLIENCI.filter(function (x) { return x.id === p.rekord; })[0];
  return "klient " + (k ? k.nazwa : p.rekord);
}

function wierszZmiany20(p) {
  return '<tr data-id="' + esc(p.id) + '"' + (p.id === STAN_20.wybrany ? ' class="wybrany"' : "") + '>' +
    '<td class="nowrap mono small">' + esc(DB.fmtDate(p.zgloszono)) + '</td>' +
    '<td class="strong"><div class="tnij" title="' + esc(p.is) + '">' + esc(p.is) + '</div></td>' +
    '<td><div class="tnij">' + esc(opisRekordu20(p)) + '</div></td>' +
    '<td class="small">' + esc(Object.keys(p.zmiany).map(function (k) { return (Akceptacje.POLA[p.tabela] || {})[k] || k; }).join(", ")) + '</td>' +
    '<td>' + tagStatusu20(p) + '</td></tr>';
}

function render20() {
  var formularze = STAN_20.widok === "formularze";
  el20("glowa").innerHTML = formularze
    ? "<tr><th>Wpłynął</th><th>Firma</th><th>Instytucja</th><th>Wypełnił</th><th class='c'>Osób</th><th>Status</th></tr>"
    : "<tr><th>Zgłoszono</th><th>Instytucja</th><th>Czego dotyczy</th><th>Pola</th><th>Status</th></tr>";
  var lista = lista20();
  el20("body").innerHTML = lista.length ? lista.map(formularze ? wierszFormularza20 : wierszZmiany20).join("")
    : '<tr><td colspan="6"><div class="empty"><div class="et">Nic do akceptacji</div>Zmień filtr statusu, żeby zobaczyć rozpatrzone.</div></td></tr>';
  el20("licz").innerHTML = "<b>" + lista.length + "</b>";
  el20("nForm").textContent = Nawigacja.liczbaDoAkceptacji(DB.KOLEJKA);
  el20("nZmiany").textContent = Nawigacja.liczbaDoAkceptacji(DB.PROPOZYCJE);
  document.querySelectorAll("#zakladki a").forEach(function (a) { a.classList.toggle("on", a.dataset.widok === STAN_20.widok); });
  Nawigacja.zapiszWAdresie(Object.assign(wartosciFiltrow20(), { widok: STAN_20.widok, id: STAN_20.wybrany || "" }));
  renderPanel20();
}

function wartosciFiltrow20() {
  var w = {};
  Object.keys(FILTRY_20).forEach(function (p) { w[p] = Wielowybor.tekst(el20(FILTRY_20[p])); });
  return w;
}

function przelaczWidok20(widok) {
  STAN_20.widok = widok;
  STAN_20.wybrany = null;
  render20();
}

function wybierz20(e) {
  var tr = e.target.closest("tr[data-id]");
  if (!tr) return;
  STAN_20.wybrany = tr.dataset.id;
  render20();
}

function inicjuj20() {
  el20("fIS").innerHTML += DB.INSTYTUCJE.map(function (i) {
    return '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + '</option>';
  }).join("");
  var z = Nawigacja.odczytajZapytanie(location.search, ["widok", "id"]);
  if (z.widok === "zmiany") STAN_20.widok = "zmiany";
  STAN_20.wybrany = z.id || null;
  Nawigacja.wczytajFiltry(FILTRY_20);
  ["q", "fIS", "fStatus"].forEach(function (id) {
    el20(id).addEventListener("input", render20);
    el20(id).addEventListener("change", render20);
  });
  el20("body").addEventListener("click", wybierz20);
  el20("btnNowyFormularz").hidden = !Auth.moze("formularze.zglaszanie");
  window.addEventListener("db:changed", render20);
  render20();
}
