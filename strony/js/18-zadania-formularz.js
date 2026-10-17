/* Zadania: formularz dodawania i edycji, zmiana statusu i usuwanie (D-246, D-239) */
function pole18(id) { return document.getElementById(id); }

function pokazBlad18(tekst) { pole18("bladZadania").textContent = tekst || ""; }

/* Bledy domenowe i straznika (z kodem) pokazujemy w formularzu albo nad lista, pozostale leca dalej */
function wykonaj18(akcja, pokaz) {
  try { akcja(); return true; } catch (e) {
    if (!e.kod) throw e;
    (pokaz || pokazBlad18)(e.message);
    return false;
  }
}

function komunikatListy18(tekst) {
  var k = pole18("komunikat18");
  k.textContent = tekst || "";
  k.style.display = tekst ? "" : "none";
}

/* Nowe zadanie: kazdy pracownik LDIT wybiera osobe (sobie albo innym, spotkanie 14.10.2026).
   Istniejace zadanie przepisuje na inna osobe tylko administrator. */
function wypelnijPrzypisanie18(wybrany, nowe) {
  var wybor = STAN_18.widziWszystkie || (nowe && STAN_18.moznaEdytowac);
  var osoby = wybor ? Zadania18.kontaLdit() : [];
  pole18("wierszPrzypisania").style.display = osoby.length ? "" : "none";
  pole18("przypisaneZadania").innerHTML = osoby.map(function (u) {
    return '<option value="' + esc(u.login) + '"' + (u.login === wybrany ? " selected" : "") + ">" + esc(u.imie) + "</option>";
  }).join("");
  pole18("podpowiedzPrzypisania").textContent = STAN_18.widziWszystkie
    ? "Administrator przypisuje i przepisuje zadanie dowolnej osobie z LDIT."
    : nowe ? "Zadanie dodajesz sobie albo innej osobie z LDIT. Na inną osobę przepisuje je potem administrator."
      : "Zadanie zostaje przypisane do tej samej osoby. Na inną osobę przepisuje je administrator.";
}

function wypelnijWnioski18(wybrany) {
  pole18("wniosekZadania").innerHTML = '<option value="">bez wniosku (zadanie ogólne)</option>' + DB.WNIOSKI_WSZYSTKIE.map(function (w) {
    return '<option value="' + esc(w.id) + '"' + (w.id === wybrany ? " selected" : "") + ">" + esc(w.nr + " · " + w.klNazwa) + "</option>";
  }).join("");
}

function otworzFormularz18(z) {
  STAN_18.edytowany = z ? z.id : null;
  pole18("tytulFormularza").textContent = z ? "Edycja zadania" : "Nowe zadanie ręczne";
  wypelnijWnioski18(z && z.wniosek_id);
  wypelnijPrzypisanie18(z ? z.przypisane_do : STAN_18.sesja.uzytkownik_id, !z);
  pole18("tytulZadania").value = z ? z.tytul : "";
  pole18("opisZadania").value = z && z.opis ? z.opis : "";
  pole18("terminZadania").value = z ? z.termin || "" : dzisiaj();
  pole18("przypomnijZadania").value = z && z.przypomnij_dni != null ? z.przypomnij_dni : "";
  pokazBlad18("");
  pole18("formZadania").style.display = "block";
  pole18("tytulZadania").focus();
}

function otworzFormularzZadania() { otworzFormularz18(null); }

function edytujZadanie(id) { otworzFormularz18(Store.find("zadania", id)); }

/* Administrator: przepisanie zadania na inna osobe, formularz edycji z wyborem osoby */
function przepiszZadanie18(id) {
  edytujZadanie(id);
  pole18("przypisaneZadania").focus();
}

function zamknijFormularzZadania() {
  STAN_18.edytowany = null;
  pole18("formZadania").style.display = "none";
}

function daneFormularza18() {
  var dni = pole18("przypomnijZadania").value;
  var osoba = pole18("przypisaneZadania").value;
  return {
    tytul: pole18("tytulZadania").value, opis: pole18("opisZadania").value.trim() || null,
    wniosek_id: pole18("wniosekZadania").value || null, termin: pole18("terminZadania").value || null,
    przypomnij_dni: dni === "" ? null : parseInt(dni, 10),
    przypisane_do: osoba || (STAN_18.edytowany ? Store.find("zadania", STAN_18.edytowany).przypisane_do : STAN_18.sesja.uzytkownik_id)
  };
}

function zapiszZadanie() {
  var dane = daneFormularza18();
  var zapisano = wykonaj18(function () {
    if (STAN_18.edytowany) Zadania18.zmien(STAN_18.edytowany, dane, kontekst18());
    else Zadania18.dodaj(dane, kontekst18());
  });
  if (zapisano) zamknijFormularzZadania();
}

function przelaczZadanie(id, zrobione) {
  komunikatListy18("");
  if (!wykonaj18(function () { Zadania18.zmien(id, { status: zrobione ? "zrobione" : "otwarte" }, kontekst18()); }, komunikatListy18)) render();
}

function anulujZadanie(id) {
  komunikatListy18("");
  wykonaj18(function () { Zadania18.zmien(id, { status: "anulowane" }, kontekst18()); }, komunikatListy18);
}

function usunZadanie(id) {
  if (!window.confirm("Usunąć to zadanie na stałe? Historia zachowuje zadania zrobione i anulowane.")) return;
  komunikatListy18("");
  wykonaj18(function () { Zadania18.usun(id, kontekst18()); }, komunikatListy18);
}

function podepnijOdswiezanie18() {
  if (!STAN_18.moznaEdytowac) pole18("btnNoweZadanie").style.display = "none";
  window.addEventListener("db:changed", function () { STAN_18.sesja = Auth.sesja(); render(); });
}
