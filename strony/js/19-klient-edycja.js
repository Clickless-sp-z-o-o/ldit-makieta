/* Ekran 19, edycja karty klienta: wszystkie dane firmy (D-235, D-256), Kolejny nabor (D-265), czarna lista
   z Przywroc regule (D-249, D-19) i dodatkowe urzedy z oddzialami (D-238). Tylko deklaracje. */

var PREFIKS_KLIENTA = "ek";

function przyciskAkcji19(akcja, tekst, tip) {
  return ' <button class="btn xs" data-akcja="' + akcja + '"' + (tip ? ' data-tip="' + esc(tip) + '"' : "") + '>' + esc(tekst) + '</button>';
}

/* "Kolejny" zmienia sie tylko polem wyboru w edycji klienta, nie przyciskiem w widoku (D-265) */

/* Wiersz tylko dla kont z dostepem do zgloszen: pozostale konta w ogole nie widza czarnej listy */
function czarnaListaHtml19(kl) {
  if (!KlientLogika.mozeCzarnaLista()) return null;
  var zrodlo = kl.czarnaListaRegula
    ? "wg reguły: " + kl.niezlozonych + " zgłoszeń „Niezłożony wniosek” z różnych dat (próg 2)"
    : "ustawiona ręcznie, reguła wyłączona";
  var stan = kl.czarnaLista ? '<span class="tag neg">tak</span>' : '<span class="tag mute">nie</span>';
  var akcje = "";
  if (mozeEdytowac19()) {
    akcje = przyciskAkcji19("czarna", kl.czarnaLista ? "Zdejmij z listy" : "Dodaj do listy") +
      (kl.czarnaListaRegula ? "" : przyciskAkcji19("czarna-regula", "Przywróć regułę"));
  }
  return stan + ' <span class="small muted">' + esc(zrodlo) + '</span>' + akcje;
}

function obsluzAkcjeDanych19(e) {
  var a = e.target.closest("button[data-akcja]");
  if (!a) return;
  var kl = STAN_19.kl;
  if (a.dataset.akcja === "czarna") KlientLogika.ustawCzarnaListe(kl.id, !kl.czarnaLista);
  else if (a.dataset.akcja === "czarna-regula") KlientLogika.przywrocRegule(kl.id);
}

/* ---------- Formularz edycji wszystkich danych klienta ---------- */
function otworzEdycje19() {
  el19("edycjaPola").innerHTML = KlientFormularz.klientHtml(PREFIKS_KLIENTA, Store.find("klienci", STAN_19.kl.id));
  el19("edycjaBledy").textContent = "";
  el19("cardEdycja").style.display = "block";
  el19("cardEdycja").scrollIntoView({ behavior: "smooth", block: "start" });
}
function zamknijEdycje19() { el19("cardEdycja").style.display = "none"; }

function zapiszEdycje19() {
  var wynik = KlientLogika.zapiszDaneKlienta(STAN_19.kl.id, KlientFormularz.zbierzKlienta(PREFIKS_KLIENTA));
  if (!wynik.ok) { el19("edycjaBledy").textContent = wynik.bledy.join(" "); return; }
  zamknijEdycje19();
}

/* Zlozenie wniosku: ekran Nowy formularz, zakladka Nowy projekt, z klientem z karty (D-265, uwaga 08.10) */
function mozeZlozycWniosek19() { return Auth.edytujeModul("dofin"); }
function zlozWniosek19() {
  location.href = Nawigacja.adresNowegoProjektu({ klient: STAN_19.kl.id });
}

/* ---------- Dodatkowe urzedy klienta ---------- */
function nazwaUrzedu19(id) {
  var p = DB.PUPY.filter(function (x) { return x.id === id; })[0];
  return p ? p.nazwa : id;
}

function renderUrzedy19() {
  var kl = STAN_19.kl;
  var dodatkowe = KlientLogika.urzedyKlienta(kl.id);
  var edycja = mozeEdytowac19();
  el19("urzedyGlowny").innerHTML = "Główny urząd: <b>" + esc(nazwaUrzedu19(kl.pup)) + "</b> (zmiana w danych klienta)";
  el19("urzedyDodatkowe").innerHTML = dodatkowe.length ? dodatkowe.map(function (u) {
    return '<tr data-ku="' + esc(u.id) + '"><td class="strong">' + esc(nazwaUrzedu19(u.pup_id)) + '</td><td>' + (esc(u.oddzial) || "") + '</td>' +
      '<td class="right">' + (edycja ? '<button class="btn xs" data-akcja="usun-urzad">Usuń</button>' : "") + '</td></tr>';
  }).join("") : '<tr><td colspan="3" class="muted">Brak dodatkowych urzędów.</td></tr>';
  el19("nowyUrzad").innerHTML = DB.PUPY.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nazwa) + '</option>'; }).join("");
  el19("urzadForm").style.display = edycja ? "flex" : "none";
}

function dodajUrzad19() {
  var wynik = KlientLogika.dodajUrzadKlienta(STAN_19.kl.id, el19("nowyUrzad").value, el19("nowyOddzial").value);
  el19("urzadBledy").textContent = wynik.ok ? "" : wynik.bledy.join(" ");
  if (wynik.ok) el19("nowyOddzial").value = "";
}
function usunUrzad19(e) {
  var a = e.target.closest("button[data-akcja='usun-urzad']");
  var tr = e.target.closest("tr[data-ku]");
  if (!a || !tr) return;
  var wiersz = KlientLogika.urzedyKlienta(STAN_19.kl.id).filter(function (u) { return u.id === tr.dataset.ku; })[0];
  KlientLogika.usunUrzadKlienta(wiersz);
}

function podepnijEdycje19() {
  el19("btnEdytuj").style.display = mozeEdytowac19() ? "" : "none";
  el19("btnEdytuj").addEventListener("click", otworzEdycje19);
  el19("btnZapiszKlienta").addEventListener("click", zapiszEdycje19);
  el19("btnAnulujKlienta").addEventListener("click", zamknijEdycje19);
  el19("sekcjeDanych").addEventListener("click", obsluzAkcjeDanych19);
  el19("btnZlozWniosek").style.display = mozeZlozycWniosek19() ? "" : "none";
  el19("btnZlozWniosek").addEventListener("click", zlozWniosek19);
  el19("btnDodajUrzad").addEventListener("click", dodajUrzad19);
  el19("urzedyDodatkowe").addEventListener("click", usunUrzad19);
  if (new URLSearchParams(location.search).get("edytuj") && mozeEdytowac19()) otworzEdycje19();
}
