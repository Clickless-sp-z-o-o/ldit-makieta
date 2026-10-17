/* Ekran Wniosek: wybor uczestnikow pozycji szkolenia (spotkanie 14.10.2026). Lista rozwijana pod wierszem
   pozycji z polami wyboru, jak filtr w Excelu: wyszukiwanie, Zaznacz wszystkich (widocznych), Wyczysc,
   licznik, a zapis dopiero przyciskiem Zapisz wybor. Pula to uczestnicy klienta wniosku
   (DB.UCZESTNICY_KLIENTA). Zaznaczenie dodaje osobe do projektu i tworzy jej szkolenie w tej pozycji z cena
   pozycji, odznaczenie usuwa to szkolenie (PozycjeWniosku.ustawUczestnikow).
   Komponent Wielowybor (assets/wielowybor.js) zapisuje kazde klikniecie od razu i nie ma przycisku
   zatwierdzenia ani licznika, dlatego ta lista jest osobna, w tym samym ukladzie.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

var WYBOR_03 = { pozycja: null, zaznaczeni: {}, fraza: "" };

function pulaWyboru03() { return WniosekLogika.uczestnicyKlienta(STAN_03.w.klient); }

/* Osoby w innych pozycjach tego samego szkolenia (inne grupy): podpowiedz przy dzieleniu na grupy */
function innaGrupa03(ws) {
  var mapa = {};
  PozycjeWniosku.pozycjeWniosku(STAN_03.w.id).forEach(function (p) {
    if (p.id === ws.id || p.szkolenie !== ws.szkolenie_id) return;
    p.osoby.forEach(function (k) { mapa[k] = p.od ? DB.fmtDate(p.od) : "bez terminu"; });
  });
  return mapa;
}

function wierszOsoby03(uk, inne, edycja) {
  var ostrz = WniosekLogika.ostrzezenieUmowy(uk, dzis());
  return '<label class="wybor-osoba" data-szukaj="' + esc((uk.imie + " " + (uk.zawod || "")).toLowerCase()) + '">' +
    '<input type="checkbox" value="' + esc(uk.id) + '"' + (WYBOR_03.zaznaczeni[uk.id] ? " checked" : "") + (edycja ? "" : " disabled") +
    ' onchange="przelaczOsobe03(this)"> <span><b>' + esc(uk.imie) + '</b>' +
    (uk.zawod ? '<span class="muted"> ' + esc(uk.zawod) + '</span>' : "") +
    (inne[uk.id] ? ' <span class="tag mute" title="Ta osoba jest już w innej grupie tego szkolenia">inna grupa: ' + esc(inne[uk.id]) + '</span>' : "") +
    (ostrz ? ' <span class="wybor-ostrz" title="' + esc(ostrz) + '">&#9888; ' + esc(ostrz) + '</span>' : "") + '</span></label>';
}

function panelWyboruPozycji(ws) {
  var pula = pulaWyboru03();
  var edycja = STAN_03.mozeEdytowac;
  var inne = innaGrupa03(ws);
  var lista = pula.length ? pula.map(function (uk) { return wierszOsoby03(uk, inne, edycja); }).join("")
    : '<div class="small muted">Klient nie ma jeszcze uczestników. Dodaj ich w karcie klienta.</div>';
  return '<div class="panel-wyboru" id="panelWyboru03" onkeydown="if (event.key === \'Escape\') zamknijWyborPozycji()">' +
    '<div class="panel-wyboru-glowa"><b>Uczestnicy: ' + esc(SzkoleniaWniosku.nazwaPozycji(ws)) + '</b>' +
    '<span class="small muted" id="wybLicznik03" role="status"></span></div>' +
    '<div class="panel-wyboru-narzedzia"><input type="search" class="inp" id="wybSzukaj03" placeholder="Szukaj osoby..." aria-label="Szukaj osoby"' +
    ' oninput="filtrujWybor03()">' + (edycja
      ? '<button type="button" class="btn xs" id="wybWszyscy03" onclick="zaznaczWidocznych03(true)">Zaznacz wszystkich</button>' +
        '<button type="button" class="btn xs" onclick="zaznaczWidocznych03(false)">Wyczyść</button>' : "") + '</div>' +
    '<div class="wybor-lista" id="wybLista03">' + lista + '</div>' +
    '<div class="panel-wyboru-stopka">' + (edycja
      ? '<span class="small muted">Zaznaczona osoba trafia do projektu z ceną ' + esc(DB.fmtPLN2(ws.cena)) +
        (ws.data_od ? ' i terminem ' + esc(SzkoleniaWniosku.opisTerminu(ws.data_od, ws.data_do)) : "") +
        '. Odznaczenie usuwa jej to szkolenie, osoba zostaje w karcie klienta.</span>' +
        '<button type="button" class="btn primary sm" id="wybZapisz03" onclick="zapiszWyborPozycji()">Zapisz wybór</button>' +
        '<button type="button" class="btn sm" onclick="zamknijWyborPozycji()">Anuluj</button>'
      : '<button type="button" class="btn sm" onclick="zamknijWyborPozycji()">Zamknij</button>') + '</div></div>';
}

function otworzWyborPozycji(wsId) {
  if (WYBOR_03.pozycja === wsId) { zamknijWyborPozycji(); return; }
  WYBOR_03.pozycja = wsId;
  WYBOR_03.fraza = "";
  WYBOR_03.zaznaczeni = {};
  PozycjeWniosku.uczestnicyPozycji(wsId).forEach(function (r) { WYBOR_03.zaznaczeni[r.k] = true; });
  renderSzkolenia();
  var szukaj = el("wybSzukaj03");
  if (szukaj) szukaj.focus();
}

function zamknijWyborPozycji() {
  var bylo = WYBOR_03.pozycja;
  WYBOR_03.pozycja = null;
  renderSzkolenia();
  var btn = bylo ? el("ucz_" + bylo) : null;
  if (btn) btn.focus();
}

/* Po narysowaniu panelu: fraza wyszukiwania i licznik */
function poOtwarciuWyboru() {
  var szukaj = el("wybSzukaj03");
  if (szukaj) szukaj.value = WYBOR_03.fraza;
  filtrujWybor03();
}

function polaWyboru03() { return Array.prototype.slice.call(document.querySelectorAll("#wybLista03 .wybor-osoba")); }

function odswiezLicznik03() {
  var pola = polaWyboru03();
  var zazn = Object.keys(WYBOR_03.zaznaczeni).filter(function (k) { return WYBOR_03.zaznaczeni[k]; }).length;
  var widoczne = pola.filter(function (l) { return !l.hidden; }).length;
  var licznik = el("wybLicznik03");
  if (licznik) licznik.textContent = "Zaznaczono " + zazn + " z " + pola.length + (widoczne < pola.length ? ", widocznych " + widoczne : "");
  var wszyscy = el("wybWszyscy03");
  if (wszyscy) wszyscy.textContent = widoczne < pola.length ? "Zaznacz widocznych" : "Zaznacz wszystkich";
}

function filtrujWybor03() {
  var szukaj = el("wybSzukaj03");
  WYBOR_03.fraza = szukaj ? szukaj.value : "";
  var q = WYBOR_03.fraza.trim().toLowerCase();
  polaWyboru03().forEach(function (l) { l.hidden = !!q && l.getAttribute("data-szukaj").indexOf(q) < 0; });
  odswiezLicznik03();
}

function przelaczOsobe03(pole) {
  WYBOR_03.zaznaczeni[pole.value] = pole.checked;
  odswiezLicznik03();
}

function zaznaczWidocznych03(zaznacz) {
  polaWyboru03().forEach(function (l) {
    if (l.hidden) return;
    var pole = l.querySelector("input");
    pole.checked = zaznacz;
    WYBOR_03.zaznaczeni[pole.value] = zaznacz;
  });
  odswiezLicznik03();
}

function zapiszWyborPozycji() {
  var wsId = WYBOR_03.pozycja;
  var wybrani = Object.keys(WYBOR_03.zaznaczeni).filter(function (k) { return WYBOR_03.zaznaczeni[k]; });
  var odznaczeni = PozycjeWniosku.uczestnicyPozycji(wsId).filter(function (r) { return wybrani.indexOf(r.k) < 0; }).length;
  if (odznaczeni && !window.confirm("Odznaczono " + odznaczeni + " os. Ich szkolenie w tym terminie zostanie usunięte z projektu " +
    "(razem z kwotą i kwalifikacją), osoby zostają w karcie klienta. Zapisać?")) return;
  var wynik = PozycjeWniosku.ustawUczestnikow(wsId, wybrani);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  WYBOR_03.pozycja = null;
  odswiezPoZmianieSzkolen();
  komunikat("Uczestnicy szkolenia zapisani: dodano " + wynik.dodano + ", usunięto " + wynik.usunieto + ".");
}
