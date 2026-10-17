/* Ekran Wniosek: uczestnicy projektu, kwalifikacja i kwota per szkolenie uczestnika (D-279).
   Od spotkania 14.10.2026 osoba jest w tabeli raz: dane, lista jej szkolen z terminem (kazde z kwota do edycji,
   kwalifikacja, zmiana pozycji i usuniecie jak dotad) i suma kwot osoby. Funkcje wiersza dzialaja na indeksie
   szkolenia uczestnika w STAN_03.w.uczestnicy (pola uKwota{i}, uSzk{i}).
   Glowna droga dodania osoby to wybor przy szkoleniu (03-wniosek-pozycje-wybor.js); wybor z listy klienta
   zostaje (03-wniosek-uczestnicy-wybor.js), nowych wpisuje sie w karcie klienta (D-236).
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function opisDanychUczestnika(uk) {
  if (!uk) return '<span class="small muted">przepisany ręcznie, spoza listy klienta</span>';
  var rodzaj = KlientLogika.etykieta(KlientLogika.RODZAJE_ZATRUDNIENIA, uk.zatrudnienie) || "brak rodzaju zatrudnienia";
  var termin = uk.zatrudnienieDo ? ", do " + DB.fmtDate(uk.zatrudnienieDo) : ", czas nieokreślony";
  var reszta = [uk.wyksztalcenie, uk.zawod, uk.wiek != null ? uk.wiek + " lat" : null].filter(Boolean).map(esc).join(", ");
  return '<div class="small">' + esc(rodzaj + termin) + '</div><div class="small muted">' + (reszta || "brak danych") + '</div>';
}

function ostrzezenieUczestnika(uk) {
  var tekst = WniosekLogika.ostrzezenieUmowy(uk, dzis());
  return tekst ? '<div class="small" style="color:var(--neg,#b91c1c)">&#9888; ' + esc(tekst) + '</div>' : "";
}

/* Szkolenie uczestnika wskazuje jedna z pozycji projektu (szkolenie + termin, D-264, D-279) */
function selectSzkolenia(u, i) {
  var pozycje = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  var opcje = pozycje.map(function (ws) {
    return '<option value="' + esc(ws.id) + '"' + (ws.id === u.wniosekSzkolenie ? " selected" : "") + '>' + esc(SzkoleniaWniosku.nazwaPozycji(ws)) + '</option>';
  }).join("");
  return '<select class="inp wybor-pozycji" id="uSzk' + i + '" aria-label="Szkolenie i termin"' + (STAN_03.mozeEdytowac ? "" : " disabled") +
    ' onchange="zmienSzkolenieUcz(' + i + ')">' + opcje + '</select>';
}

function szkolenieOsoby(u, i) {
  var zak = u.status === "zakwalifikowany";
  var edycja = STAN_03.mozeEdytowac;
  return '<div class="szk-osoby' + (zak ? "" : " niezakw") + '">' + selectSzkolenia(u, i) +
    '<input class="inp num" id="uKwota' + i + '" aria-label="Kwota" value="' + esc(formatKwoty(u.kwota)) + '"' + (edycja ? "" : " disabled") +
    ' onchange="zapiszKwoteUcz(' + i + ')">' +
    (zak ? '<span class="tag pos dot">zakwalifikowany</span>'
      : '<span class="tag neg dot" title="' + esc(u.powod) + '">niezakwalifikowany</span>') +
    (edycja ? '<span class="szk-osoby-akcje"><button class="btn xs" onclick="przelacz(' + i + ')">Zmień</button> ' +
      '<button class="btn xs" title="Usuwa to szkolenie uczestnika; osoba bez szkoleń znika z projektu, zostaje na karcie klienta" onclick="usunZProjektu(' + i + ')">Usuń</button></span>' : "") +
    (zak ? "" : '<div class="small muted szk-osoby-powod">' + esc(u.powod) + '</div>') + '</div>';
}

/* Osoby projektu: szkolenia uczestnika zgrupowane po osobie, alfabetycznie */
function osobyWniosku03() {
  var mapa = {}, osoby = [];
  STAN_03.w.uczestnicy.forEach(function (u, i) {
    var klucz = u.uczestnik;
    if (!mapa[klucz]) { mapa[klucz] = { imie: u.imie, pesel: u.pesel, uczestnikKlienta: u.uczestnikKlienta, szkolenia: [] }; osoby.push(mapa[klucz]); }
    mapa[klucz].szkolenia.push({ u: u, i: i });
  });
  return osoby.sort(function (a, b) { return String(a.imie).localeCompare(String(b.imie), "pl"); });
}

function wierszOsoby(o) {
  var uk = DB.UCZESTNICY_KLIENTA.filter(function (x) { return x.id === o.uczestnikKlienta; })[0];
  var pesel = o.pesel ? esc(o.pesel.slice(0, 6)) + "*****" : '<span class="muted">ukryty</span>';
  var suma = o.szkolenia.reduce(function (s, x) { return s + (x.u.kwota || 0); }, 0);
  var zakw = o.szkolenia.reduce(function (s, x) { return s + (x.u.status === "zakwalifikowany" ? x.u.kwota || 0 : 0); }, 0);
  var wszystkieNiezakw = o.szkolenia.every(function (x) { return x.u.status !== "zakwalifikowany"; });
  return '<tr' + (wszystkieNiezakw ? ' class="row-danger"' : "") + '>' +
    '<td><div class="strong">' + esc(o.imie) + '</div><div class="small mono muted">' + pesel + '</div>' + ostrzezenieUczestnika(uk) + '</td>' +
    '<td>' + opisDanychUczestnika(uk) + '</td>' +
    '<td>' + o.szkolenia.map(function (x) { return szkolenieOsoby(x.u, x.i); }).join("") + '</td>' +
    '<td class="num nowrap"><b>' + esc(DB.fmtPLN2(suma)) + '</b>' +
    (zakw !== suma ? '<div class="small muted" title="Do wartości szkolenia wchodzą tylko zakwalifikowane szkolenia">do wartości: ' + esc(DB.fmtPLN2(zakw)) + '</div>' : "") + '</td></tr>';
}

function renderUcz() {
  var zakw = STAN_03.w.uczestnicy.filter(function (u) { return u.status === "zakwalifikowany"; }).length;
  el("subUcz").innerHTML = STAN_03.w.osob + " osób, " +
    zakw + " zakwalifikowanych szkoleń z " + STAN_03.w.uczestnicy.length +
    (zakw < STAN_03.w.uczestnicy.length ? ' &middot; niezakwalifikowani wymagają odrębnej faktury komercyjnej <span class="ref">D-84</span>' : "");
  el("uczestnicy").innerHTML = STAN_03.w.uczestnicy.length
    ? osobyWniosku03().map(wierszOsoby).join("")
    : '<tr><td colspan="4" class="muted">Brak uczestników w tym projekcie. Wybierz ich przy szkoleniu (kolumna Uczestnicy) albo z listy klienta.</td></tr>';
  el("linkUczKlienta").href = Nawigacja.adresKlienta(STAN_03.w.klient) + "#uczestnicy";
  renderWyborUcz();
}

function przelacz(i) {
  var u = STAN_03.w.uczestnicy[i];
  var nowy = u.status === "zakwalifikowany" ? "niezakwalifikowany" : "zakwalifikowany";
  var patch = {
    status_kwalifikacji: nowy,
    powod_niezakwalifikowania: nowy === "niezakwalifikowany" ? (u.powod || "brak umowy o pracę") : null
  };
  zapiszZmiany("uczestnik_szkolenia", u.id, patch,
    [{ typ: "Zmiana kwalifikacji", pole: "Kwalifikacja: " + u.imie, przed: u.status, po: nowy }]);
}
