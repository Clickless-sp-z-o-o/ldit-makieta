/* Ekran Instytucje: trzy widoki jednej strony (uwagi z 08.10.2026).
     przeglad  kafelki instytucji w ich kolorach
     konfig    konfiguracja jednej instytucji, wszystkie zakladki w jednym miejscu
               (Konto, Programy, Osoby, Korespondencja i, tylko dla administratora,
               Warunki prowizyjne, Wzor certyfikatu, Dane do faktury, Formularz, D-07)
     plan      karta planu szkolenia otwierana z zakladki Programy
   Stan widoku jest w adresie (?id=IS-01&zakladka=p-prow&plan=SZ-101), wiec Wstecz
   i linki z innych ekranow trafiaja w to samo miejsce. Tylko deklaracje. */

var WIDOKI_06 = { przeglad: "widokPrzeglad", konfig: "widokKonfig", plan: "widokPlan" };
var ZAKLADKA_STARTOWA_06 = "p-dane";
var ZAKLADKI_ADMINA_06 = ["p-prow", "p-cert", "p-fakt", "p-form"];

/* Zakladki z warunkami i konfiguracja wspolpracy widzi tylko konto z modulem Administracja (D-07) */
function widziKonfiguracje06() { return Auth.widziModul("admin"); }

function dozwolonaZakladka06(pid) {
  if (!el(pid)) return ZAKLADKA_STARTOWA_06;
  if (ZAKLADKI_ADMINA_06.indexOf(pid) >= 0 && !widziKonfiguracje06()) return ZAKLADKA_STARTOWA_06;
  return pid;
}

function pokazWidok06(nazwa) {
  STAN_06.widok = nazwa;
  Object.keys(WIDOKI_06).forEach(function (w) { el(WIDOKI_06[w]).hidden = w !== nazwa; });
  Array.prototype.forEach.call(document.querySelectorAll(".tylko-admin"), function (x) { x.hidden = !widziKonfiguracje06(); });
  window.scrollTo(0, 0);
}

function zapiszStan06() {
  if (STAN_06.widok === "przeglad") { Nawigacja.zapiszWAdresie({}); return; }
  Nawigacja.zapiszWAdresie({
    id: STAN_06.wybrana,
    zakladka: STAN_06.zakladka !== ZAKLADKA_STARTOWA_06 ? STAN_06.zakladka : "",
    plan: STAN_06.widok === "plan" ? STAN_06.edytowanyPlan : ""
  });
}

function wybierzZakladke06(pid) {
  STAN_06.zakladka = dozwolonaZakladka06(pid);
  aktywujTab(STAN_06.zakladka);
  zapiszStan06();
}

function otworzKonfiguracje06(id, zakladka) {
  STAN_06.wybrana = id;
  STAN_06.edytowanyPlan = null;
  STAN_06.zakladka = dozwolonaZakladka06(zakladka || ZAKLADKA_STARTOWA_06);
  pokazWidok06("konfig");
  renderSzczegol();
  aktywujTab(STAN_06.zakladka);
  zapiszStan06();
}

function wrocDoPrzegladu06() {
  STAN_06.edytowanyPlan = null;
  pokazWidok06("przeglad");
  renderLista();
  zapiszStan06();
}

/* Wejscie z linku: ?id=IS-01 otwiera konfiguracje tej instytucji, &plan= karte planu.
   Instytucja spoza zakresu konta nie jest w DB.INSTYTUCJE, wiec link pokazuje tylko przeglad. */
function wybierzZAdresu06() {
  var a = Nawigacja.odczytajZapytanie(location.search, ["id", "zakladka", "plan"]);
  var jest = DB.INSTYTUCJE.some(function (i) { return i.id === a.id; });
  if (!jest) { pokazWidok06("przeglad"); return false; }
  STAN_06.wybrana = a.id;
  STAN_06.zakladka = dozwolonaZakladka06(a.zakladka || ZAKLADKA_STARTOWA_06);
  var plan = a.plan ? Store.find("katalog_szkolen", a.plan) : null;
  STAN_06.edytowanyPlan = plan && plan.instytucja_id === a.id ? plan.id : null;
  pokazWidok06(STAN_06.edytowanyPlan ? "plan" : "konfig");
  aktywujTab(STAN_06.zakladka);
  return true;
}
