/* Zadania: stan strony, KPI, lista zadan i akceptacje formularzy (tylko deklaracje) */
var STAN_18 = { sesja: null, moznaEdytowac: false, widziWszystkie: false, filtrHistorii: "", edytowany: null, rok: 0, mies: 0 };

/* Uprawnienia po feature (D-176): edycja modulu i wglad we wszystkie zadania (admin.konta = administrator) */
function wczytajUprawnienia18() {
  STAN_18.sesja = Auth.sesja();
  STAN_18.moznaEdytowac = Auth.edytujeModul("zadania");
  STAN_18.widziWszystkie = Auth.moze("zespol.zadania");
}

function dzisiaj() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/* Kafelek prowadzi do szczegolow: akcja to wywolanie funkcji strony albo adres innego ekranu */
function kartaKpi18(label, val, foot, akcja) {
  var tresc = '<div class="k-label">' + esc(label) + '</div>' +
    '<div class="k-value">' + esc(val) + '</div>' +
    (foot ? '<div class="k-foot">' + foot + '</div>' : "");
  if (akcja && akcja.adres) return '<a class="kpi kpi-link" href="' + esc(akcja.adres) + '">' + tresc + "</a>";
  if (akcja && akcja.js) return '<button type="button" class="kpi kpi-link" onclick="' + akcja.js + '">' + tresc + "</button>";
  return '<div class="kpi">' + tresc + "</div>";
}

/* Zalegle: widok dnia z najstarszym zaleglym terminem, zeby od razu bylo widac, od kiedy */
function pokazZalegle18() {
  var dzis = dzisiaj();
  var zalegle = poSekcji("doZrobienia").filter(function (z) { return z.termin && z.termin < dzis; })
    .sort(function (a, b) { return a.termin.localeCompare(b.termin); });
  zmienWidokKalendarza18(zalegle.length ? "dzien" : "miesiac", zalegle.length ? zalegle[0].termin : dzis);
  document.getElementById("kartaKalendarza").scrollIntoView({ behavior: "smooth", block: "start" });
}

function pokazDzis18() {
  zmienWidokKalendarza18("dzien", dzisiaj());
  document.getElementById("kartaKalendarza").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Wniosek zadania jako link do karty wniosku */
function linkWniosku18(id) {
  if (!id) return esc(opisWniosku(id));
  return '<a href="03-wniosek.html?id=' + encodeURIComponent(id) + '">' + esc(opisWniosku(id)) + "</a>";
}

function imieUzytkownika(id) {
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === id; })[0];
  return u ? u.imie : "nieprzypisane";
}

function opisWniosku(id) {
  var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === id; })[0];
  return w ? w.nr + " · " + w.klNazwa : "bez wniosku";
}

/* Plan dnia: pracownik widzi swoje zadania, administrator wszystkie (D-140) */
function mojeZadania() {
  return Zadania18.widoczne(DB.ZADANIA, STAN_18.sesja.uzytkownik_id, STAN_18.widziWszystkie);
}

function kontekst18() {
  return { uzytkownikId: STAN_18.sesja.uzytkownik_id, widziWszystkie: STAN_18.widziWszystkie, dzis: dzisiaj() };
}

function poSekcji(nazwa) {
  var dzis = dzisiaj();
  return mojeZadania().filter(function (z) { return Zadania18.sekcja(z, dzis) === nazwa; });
}

function oczekujaceFormularze() {
  return DB.KOLEJKA.filter(function (k) { return k.status === "oczekuje"; });
}

function renderKpi() {
  var zad = mojeZadania(), dzis = dzisiaj();
  var otwarte = poSekcji("doZrobienia");
  var naDzis = otwarte.filter(function (z) { return z.termin === dzis; }).length;
  var zalegle = otwarte.filter(function (z) { return z.termin && z.termin < dzis; }).length;
  document.getElementById("kpi").innerHTML =
    kartaKpi18("Zadania na dziś", naDzis, STAN_18.widziWszystkie ? "wszyscy pracownicy" : "Twój plan dnia", { js: "pokazDzis18()" }) +
    kartaKpi18("Zaległe", zalegle, zalegle ? '<span class="tag neg dot">do nadrobienia</span>' : "brak", { js: "pokazZalegle18()" }) +
    kartaKpi18("Formularze do akceptacji", oczekujaceFormularze().length, '<span class="tag warn dot">czekają na decyzję</span>', { adres: "20-akceptacje.html" });
}

function przyciskiZadania(z) {
  if (!STAN_18.moznaEdytowac || !Zadania18.mozeZmieniac(z, STAN_18.sesja.uzytkownik_id, STAN_18.widziWszystkie)) return "";
  var id = escJs(z.id);
  return '<div class="btn-row" style="justify-content:flex-end;margin-top:5px">' +
    '<button class="btn xs" onclick="edytujZadanie(\'' + id + '\')">Edytuj</button>' +
    (z.status === "otwarte" ? '<button class="btn xs" onclick="anulujZadanie(\'' + id + '\')">Anuluj</button>' : "") +
    '<button class="btn xs" onclick="usunZadanie(\'' + id + '\')">Usuń</button></div>';
}

function opisPrzypomnienia(z) {
  return z.przypomnij_dni == null ? "" : ' · przypomnienie ' + esc(z.przypomnij_dni) + ' dni przed terminem';
}

function wierszZadania(z) {
  var zrodloTag = z.typ === "automatyczne"
    ? '<span class="tag info dot">automatyczne</span>'
    : '<span class="tag mute dot">ręczne</span>';
  var zrobione = z.status === "zrobione", dzis = dzisiaj();
  var pilne = z.status === "otwarte" && z.termin && z.termin <= dzis;
  var terminTag = '<span class="tag ' + (pilne ? "neg" : "mute") + '">' + esc(z.termin ? DB.fmtDate(z.termin) : "bez terminu") + '</span>';
  var anulowane = z.status === "anulowane" ? ' <span class="tag mute">anulowane</span>' : "";
  return '<div class="zad-row' + (z.status !== "otwarte" ? " done" : "") + '">' +
    '<input type="checkbox" class="chk"' + (zrobione ? " checked" : "") + (STAN_18.moznaEdytowac ? "" : " disabled") +
      ' onchange="przelaczZadanie(\'' + escJs(z.id) + '\', this.checked)">' +
    '<div style="flex:1 1 auto;min-width:0">' +
      '<div class="zt">' + esc(z.tytul) + anulowane + '</div>' +
      (z.opis ? '<div class="zm">' + esc(z.opis) + '</div>' : "") +
      '<div class="zm">' + linkWniosku18(z.wniosek_id) + ' · ' + esc(imieUzytkownika(z.przypisane_do)) + opisPrzypomnienia(z) + '</div>' +
    '</div>' +
    '<div class="zmeta">' + terminTag + '<div style="margin-top:5px">' + zrodloTag + '</div>' + przyciskiZadania(z) + '</div>' +
  '</div>';
}

function listaHtml18(zad, pusty) {
  return zad.length ? zad.map(wierszZadania).join("") : '<div class="empty"><div class="et">' + pusty + '</div></div>';
}

function renderZadania() {
  var doZrobienia = poSekcji("doZrobienia"), plan = poSekcji("zaplanowane");
  var hist = poSekcji("historia").filter(function (z) { return !STAN_18.filtrHistorii || z.status === STAN_18.filtrHistorii; });
  document.getElementById("subZad").textContent = doZrobienia.length + " do zrobienia";
  document.getElementById("subPlan").textContent = plan.length + " zaplanowanych";
  document.getElementById("listaZad").innerHTML = listaHtml18(doZrobienia, "Brak zadań do zrobienia");
  document.getElementById("listaPlan").innerHTML = listaHtml18(plan, "Brak zaplanowanych zadań");
  document.getElementById("listaHist").innerHTML = listaHtml18(hist, "Historia jest pusta");
}

function zmienFiltrHistorii(wartosc) { STAN_18.filtrHistorii = wartosc; renderZadania(); }

/* Decyzje zapadaja na ekranie Do akceptacji (20-akceptacje.html): tu tylko skrot z linkiem */
function wierszAkceptacji(a) {
  return '<div class="zad-row">' +
    '<div style="flex:1 1 auto;min-width:0">' +
      '<div class="zt">' + esc(a.firma) + '</div>' +
      '<div class="zm"><span class="mono">' + esc(a.nip) + '</span> · ' + esc(a.is) + ' · formularz z ' + esc(DB.fmtDate(a.data)) + '</div>' +
    '</div>' +
    '<div class="zmeta"><a class="btn xs primary" href="20-akceptacje.html' + esc(Nawigacja.zbudujZapytanie({ id: a.id })) +
      '">Szczegóły i decyzja</a></div></div>';
}

function renderAkceptacje() {
  var lista = oczekujaceFormularze();
  document.getElementById("badgeAkc").textContent = lista.length + " oczekuje";
  document.getElementById("listaAkc").innerHTML = lista.length ? lista.map(wierszAkceptacji).join("") :
    '<div class="empty"><div class="et">Brak formularzy do akceptacji</div></div>';
}

function render() { renderKpi(); renderZadania(); renderAkceptacje(); renderPowiadomienia18(); renderKalendarz18(); }
