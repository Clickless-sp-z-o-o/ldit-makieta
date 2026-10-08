/* Ekran Wniosek: wybor uczestnikow z listy klienta i edycja kwoty per szkolenie uczestnika (D-236, D-237, D-279).
   Osoba juz w projekcie moze dostac kolejne szkolenie.
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

/* Dodawani uczestnicy dostaja jedno ze szkolen projektu, a kwote z jego ceny w projekcie (D-264) */
function opcjeSzkolenWyboru() {
  var lista = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  var domyslne = lista.some(function (ws) { return ws.szkolenie_id === STAN_03.raw.szkolenie_glowne_id; })
    ? STAN_03.raw.szkolenie_glowne_id : (lista[0] ? lista[0].szkolenie_id : "");
  return lista.map(function (ws) {
    var kat = SzkoleniaWniosku.szkolenieKatalogu(ws.szkolenie_id);
    return '<option value="' + esc(ws.szkolenie_id) + '"' + (ws.szkolenie_id === domyslne ? " selected" : "") + '>' + esc(kat ? kat.nazwa : ws.szkolenie_id) + '</option>';
  }).join("");
}

function renderWyborUcz() {
  var lista = WniosekLogika.uczestnicyKlienta(STAN_03.w.klient);
  var wProjekcie = WniosekLogika.idUczestnikowWniosku(STAN_03.w.id);
  var wiersze = lista.length
    ? lista.map(function (uk) { return wierszWyboru(uk, wProjekcie.indexOf(uk.id) >= 0); }).join("")
    : '<div class="small muted">Klient nie ma jeszcze uczestników. Dodaj ich w karcie klienta.</div>';
  el("wyborUcz").innerHTML =
    '<div class="small strong" style="margin-bottom:6px">Uczestnicy klienta ' + esc(STAN_03.w.klNazwa) + '</div>' + wiersze +
    '<div class="field" style="margin:10px 0 6px"><label>Szkolenie dla dodawanych<span class="tip-mark" data-tip="Wybierasz spośród szkoleń projektu. Kwota uczestnika to cena tego szkolenia w projekcie, potem możesz ją zmienić ręcznie (D-237, D-264).">i</span></label>' +
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

/* Zmiana szkolenia uczestnika ustawia jego kwote na cene tego szkolenia w projekcie, dalej edytowalna */
function zmienSzkolenieUcz(i) {
  var u = STAN_03.w.uczestnicy[i];
  var szkolenieId = el("uSzk" + i).value;
  var cena = szkolenieId ? SzkoleniaWniosku.cenaWniosku(STAN_03.w.id, szkolenieId) : u.kwota;
  var wynik = WniosekLogika.zapiszKwoteUczestnika(u.id, szkolenieId, String(cena));
  if (!wynik.ok) { pokazBledy03(wynik); renderUcz(); return; }
  wpiszDoRejestru("Zmiana pola", "Szkolenie uczestnika: " + u.imie, u.szkNazwa, szkolenieId ? szkolenieId : "brak");
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
