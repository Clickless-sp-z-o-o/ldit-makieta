/* Ekran Wniosek: wybor uczestnikow z listy klienta i edycja kwoty per szkolenie uczestnika (D-236, D-237, D-279).
   Osoba juz w projekcie moze dostac kolejne szkolenie. Od 14.10.2026 wybiera sie pozycje (szkolenie + termin),
   a glowna droga jest wybor przy szkoleniu (03-wniosek-pozycje-wybor.js).
   Kolejny wniosek nie wymaga przepisywania ludzi, bo dane leza przy kliencie.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function pokazBledy03(wynik) {
  komunikat(wynik.bledy.join(" "));
}

function wierszWyboru(uk, juzWProjekcie) {
  var ostrz = WniosekLogika.ostrzezenieUmowy(uk, dzis());
  return '<label class="small" style="display:flex;gap:8px;align-items:flex-start;padding:4px 0">' +
    '<input type="checkbox" name="wybUcz" value="' + esc(uk.id) + '"> ' +
    '<span><b>' + esc(uk.imie) + '</b> ' + (juzWProjekcie ? '<span class="tag mute" title="Dostanie kolejne szkolenie (D-279)">już w projekcie</span>' : "") +
    '<span class="muted"> ' + esc(KlientLogika.etykieta(KlientLogika.RODZAJE_ZATRUDNIENIA, uk.zatrudnienie)) +
    (uk.zawod ? ", " + esc(uk.zawod) : "") + '</span>' +
    (ostrz ? '<span style="color:var(--neg,#b91c1c)"> &#9888; ' + esc(ostrz) + '</span>' : "") + '</span></label>';
}

/* Dodawani uczestnicy dostaja jedna z pozycji projektu (szkolenie + termin), a kwote z jej ceny (D-264) */
function opcjeSzkolenWyboru() {
  var lista = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  var glowna = lista.filter(function (ws) { return ws.szkolenie_id === STAN_03.raw.szkolenie_glowne_id; })[0] || lista[0];
  return lista.map(function (ws) {
    return '<option value="' + esc(ws.id) + '"' + (glowna && ws.id === glowna.id ? " selected" : "") + '>' + esc(SzkoleniaWniosku.nazwaPozycji(ws)) + '</option>';
  }).join("");
}

function zaznaczWszystkichKlienta03(zaznacz) {
  document.querySelectorAll('input[name="wybUcz"]').forEach(function (c) { c.checked = zaznacz; });
}

function renderWyborUcz() {
  var lista = WniosekLogika.uczestnicyKlienta(STAN_03.w.klient);
  var wProjekcie = WniosekLogika.idUczestnikowWniosku(STAN_03.w.id);
  var wiersze = lista.length
    ? lista.map(function (uk) { return wierszWyboru(uk, wProjekcie.indexOf(uk.id) >= 0); }).join("")
    : '<div class="small muted">Klient nie ma jeszcze uczestników. Dodaj ich w karcie klienta.</div>';
  el("wyborUcz").innerHTML =
    '<div class="small strong" style="margin-bottom:6px">Uczestnicy klienta ' + esc(STAN_03.w.klNazwa) +
    (lista.length ? ' <button type="button" class="btn xs" onclick="zaznaczWszystkichKlienta03(true)">Zaznacz wszystkich</button> ' +
      '<button type="button" class="btn xs" onclick="zaznaczWszystkichKlienta03(false)">Wyczyść</button>' : "") + '</div>' + wiersze +
    '<div class="field" style="margin:10px 0 6px"><label for="wybSzkolenie">Szkolenie i termin dla dodawanych<span class="tip-mark" data-tip="Wybierasz spośród szkoleń projektu z terminem. Kwota uczestnika to cena tego szkolenia w projekcie, potem możesz ją zmienić ręcznie (D-237, D-264). Szybciej: przycisk w kolumnie Uczestnicy przy szkoleniu.">i</span></label>' +
    '<select class="inp" id="wybSzkolenie">' + opcjeSzkolenWyboru() + '</select></div>' +
    '<div class="btn-row"><button class="btn primary sm" onclick="dodajWybranych()">Dodaj zaznaczonych do projektu</button>' +
    '<button class="btn sm" onclick="przelaczWyborUcz()">Zamknij</button></div>';
}

function przelaczWyborUcz() {
  var panel = el("wyborUcz");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function dodajWybranych() {
  var wybrani = Array.prototype.map.call(
    document.querySelectorAll('input[name="wybUcz"]:checked'), function (c) { return c.value; });
  var wynik = WniosekLogika.dodajUczestnikowDoWniosku(STAN_03.w, wybrani, el("wybSzkolenie").value);
  if (!wynik.ok) { pokazBledy03(wynik); return; }
  wczytaj();
  renderWszystko();
  komunikat("Dodano uczestników: " + wynik.dodano + ". Kwotę każdego możesz zmienić w tabeli.");
}

function zapiszKwoteUcz(i) {
  var u = STAN_03.w.uczestnicy[i];
  var wynik = WniosekLogika.zapiszKwoteUczestnika(u.id, el("uSzk" + i).value, el("uKwota" + i).value);
  if (!wynik.ok) { pokazBledy03(wynik); renderUcz(); return; }
  wpiszDoRejestru("Zmiana pola", "Kwota uczestnika: " + u.imie, u.kwota, el("uKwota" + i).value);
  wczytaj();
  renderWszystko();
}

/* Zmiana pozycji (szkolenie + termin) uczestnika ustawia jego kwote na cene tej pozycji, dalej edytowalna;
   uczestnik dostaje termin nowej pozycji */
function zmienSzkolenieUcz(i) {
  var u = STAN_03.w.uczestnicy[i];
  var pozycjaId = el("uSzk" + i).value;
  var cena = pozycjaId ? SzkoleniaWniosku.cenaWniosku(STAN_03.w.id, pozycjaId) : u.kwota;
  var wynik = WniosekLogika.zapiszKwoteUczestnika(u.id, pozycjaId, String(cena));
  if (!wynik.ok) { pokazBledy03(wynik); renderUcz(); return; }
  var ws = Store.find("wniosek_szkolenia", pozycjaId);
  wpiszDoRejestru("Zmiana pola", "Szkolenie uczestnika: " + u.imie, u.szkNazwa, ws ? SzkoleniaWniosku.nazwaPozycji(ws) : "brak");
  wczytaj();
  renderWszystko();
}

function usunZProjektu(i) {
  var u = STAN_03.w.uczestnicy[i];
  if (!window.confirm("Usunąć " + u.imie + " z tego projektu? Uczestnik zostaje na karcie klienta.")) return;
  WniosekLogika.usunUczestnikaZWniosku(u.id);
  wpiszDoRejestru("Zmiana pola", "Uczestnik projektu", u.imie, "usunięty z projektu");
  wczytaj();
  renderWszystko();
}
