/* Ekran Wniosek: szkolenia projektu z cena ustalona w tym projekcie (D-264) i przycisk
   "Zastosuj kwote dla wszystkich" (D-263). Od spotkania 14.10.2026 wiersz to pozycja = szkolenie + termin:
   Szkolenie | Termin od | Termin do | Cena w projekcie | Uczestnicy | Usun. To samo szkolenie mozna dodac
   kilka razy (grupy). Uczestnikow pozycji wybiera sie lista z polami wyboru (03-wniosek-pozycje-wybor.js).
   Logika bez DOM: 03-wniosek-szkolenia-logika.js i 03-wniosek-pozycje-logika.js.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function liczbaUczestnikowPozycji(wsId) {
  return STAN_03.w.uczestnicy.filter(function (u) { return u.wniosekSzkolenie === wsId; }).length;
}

/* Zgodnosc wstecz: liczba szkolen uczestnikow we wszystkich pozycjach danego szkolenia */
function liczbaUczestnikowSzkolenia(szkolenieId) {
  return STAN_03.w.uczestnicy.filter(function (u) { return u.szkolenie === szkolenieId; }).length;
}

/* "grupa 2 z 3", gdy to samo szkolenie jest w projekcie kilka razy */
function opisGrupy03(ws, lista) {
  var tego = lista.filter(function (r) { return r.szkolenie_id === ws.szkolenie_id; });
  return tego.length > 1 ? '<div class="small muted">grupa ' + (tego.indexOf(ws) + 1) + ' z ' + tego.length + '</div>' : "";
}

function poleDaty03(ws, pole, edycja) {
  var wartosc = pole === "od" ? ws.data_od : (ws.data_do || ws.data_od);
  return '<input type="date" class="inp data-pozycji" id="' + pole + '_' + esc(ws.id) + '" value="' + esc(wartosc || "") + '"' +
    ' aria-label="Termin ' + pole + '"' + (edycja ? "" : " disabled") + ' onchange="zmienTerminPozycji(\'' + escJs(ws.id) + '\', \'' + pole + '\')">';
}

function wierszSzkolenia(ws, i, lista) {
  var kat = SzkoleniaWniosku.szkolenieKatalogu(ws.szkolenie_id);
  var edycja = STAN_03.mozeEdytowac;
  var n = liczbaUczestnikowPozycji(ws.id);
  var otwarta = WYBOR_03.pozycja === ws.id;
  return '<tr data-pozycja="' + esc(ws.id) + '"' + (otwarta ? ' class="pozycja-otwarta"' : "") + '>' +
    '<td class="strong">' + esc(kat ? kat.nazwa : ws.szkolenie_id) + opisGrupy03(ws, lista) + '</td>' +
    '<td>' + poleDaty03(ws, "od", edycja) + '</td><td>' + poleDaty03(ws, "do", edycja) + '</td>' +
    '<td class="num"><input class="inp num" id="cena_' + esc(ws.id) + '" style="width:110px;height:28px;font-size:12.5px" value="' +
    esc(formatKwoty(ws.cena)) + '"' + (edycja ? "" : " disabled") + ' aria-label="Cena w projekcie" onchange="zmienCeneSzkoleniaWniosku(\'' + escJs(ws.id) + '\')"></td>' +
    '<td><button type="button" class="btn sm przycisk-wyboru" id="ucz_' + esc(ws.id) + '" aria-expanded="' + otwarta + '"' +
    ' onclick="otworzWyborPozycji(\'' + escJs(ws.id) + '\')">' + n + ' os. <span aria-hidden="true">&#9662;</span></button></td>' +
    '<td class="right">' + (edycja ? '<button class="btn xs" onclick="usunSzkolenieWniosku(\'' + escJs(ws.id) + '\')">Usuń</button>' : "") + '</td></tr>' +
    (otwarta ? '<tr class="wiersz-wyboru"><td colspan="6">' + panelWyboruPozycji(ws) + '</td></tr>' : "");
}

/* Kazde szkolenie z katalogu instytucji mozna dodac, takze drugi raz z innym terminem (grupa) */
function formularzDodaniaSzkolenia() {
  var dostepne = SzkoleniaWniosku.szkoleniaInstytucji(STAN_03.w.is);
  if (!STAN_03.mozeEdytowac) return "";
  if (!dostepne.length) return '<div class="small muted" style="padding:8px 12px">Instytucja nie ma szkoleń w katalogu.</div>';
  return '<div class="formularz-szkolenia">' +
    '<select class="inp" id="szkNowe" onchange="podpowiedzCeneSzkolenia()" aria-label="Szkolenie z katalogu">' +
    dostepne.map(function (s) { return '<option value="' + esc(s.id) + '" data-cena="' + esc(s.cena == null ? 0 : s.cena) + '">' + esc(s.nazwa) + '</option>'; }).join("") +
    '</select><input class="inp num" id="szkNowaCena" list="cenySzkolenia03" aria-label="Cena w tym projekcie" placeholder="cena w projekcie">' +
    '<datalist id="cenySzkolenia03"></datalist>' +
    '<label class="pole-daty">Termin od<input type="date" class="inp" id="szkNoweOd"></label>' +
    '<label class="pole-daty">Termin do<input type="date" class="inp" id="szkNoweDo"></label>' +
    '<button class="btn primary sm" onclick="dodajSzkolenieWniosku()">+ Dodaj szkolenie</button></div>';
}

function renderSzkolenia() {
  var lista = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  if (WYBOR_03.pozycja && !lista.some(function (r) { return r.id === WYBOR_03.pozycja; })) WYBOR_03.pozycja = null;
  var wiersze = lista.length ? lista.map(function (ws, i) { return wierszSzkolenia(ws, i, lista); }).join("")
    : '<tr><td colspan="6" class="muted">Projekt nie ma jeszcze szkoleń. Dodaj szkolenie z katalogu instytucji, ustaw termin i wybierz uczestników.</td></tr>';
  el("szkoleniaWniosku").innerHTML =
    '<div class="tabela-pozycji"><table class="tbl"><thead><tr><th>Szkolenie</th><th>Termin od</th><th>Termin do</th>' +
    '<th class="num">Cena w projekcie</th><th>Uczestnicy</th><th></th></tr></thead>' +
    '<tbody>' + wiersze + '</tbody></table></div>' + formularzDodaniaSzkolenia();
  podpowiedzCeneSzkolenia();
  if (WYBOR_03.pozycja) poOtwarciuWyboru();
}

/* Cena z katalogu jest tylko wartoscia domyslna pola ceny (D-264); do wyboru cala lista cen szkolenia (D-277) */
function podpowiedzCeneSzkolenia() {
  var wybor = el("szkNowe");
  if (!wybor || !wybor.selectedOptions.length) return;
  el("szkNowaCena").value = formatKwoty(wybor.selectedOptions[0].getAttribute("data-cena"));
  var sz = SzkoleniaWniosku.szkolenieKatalogu(wybor.value);
  el("cenySzkolenia03").innerHTML = (sz ? sz.ceny : []).map(function (c) { return '<option value="' + esc(formatKwoty(c)) + '">'; }).join("");
}

function odswiezPoZmianieSzkolen() { wczytaj(); renderWszystko(); }

/* Cena spoza cennika szkolenia: pytanie, czy dopisac ja do cennika (D-277, R-11) */
function potwierdzCene03(szkolenieId, cenaTekst) {
  var cena = SzkoleniaWniosku.parsujKwote(cenaTekst);
  if (!SzkoleniaWniosku.czyNowaCena(szkolenieId, cena)) return false;
  return window.confirm("Dodać " + DB.fmtPLN2(cena) + " do cennika szkolenia " + ((SzkoleniaWniosku.szkolenieKatalogu(szkolenieId) || {}).nazwa || "") + "?");
}

function dodajSzkolenieWniosku() {
  var szk = el("szkNowe").value, cena = el("szkNowaCena").value, od = el("szkNoweOd").value, doDnia = el("szkNoweDo").value;
  if (od && doDnia && doDnia < od) { komunikat("Data do nie może być wcześniejsza niż data od."); return; }
  var wynik = SzkoleniaWniosku.dodajSzkolenie(STAN_03.w.id, szk, cena, { dopiszDoCennika: potwierdzCene03(szk, cena) });
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  var termin = od || doDnia ? PozycjeWniosku.ustawTermin(wynik.id, od, doDnia) : { ok: true };
  odswiezPoZmianieSzkolen();
  komunikat("Dodano szkolenie do projektu, cena " + DB.fmtPLN2(wynik.cena) + "." +
    (termin.ok ? (od ? " Termin zapisany w kalendarzu szkoleń." : "") : " Termin nie zapisany: " + termin.bledy.join(" ")));
}

/* Zmiana daty od przesuwa date do, gdy byla pusta albo wczesniejsza (jednodniowe szkolenie jednym polem) */
function zmienTerminPozycji(wsId, pole) {
  var od = el("od_" + wsId).value, doDnia = el("do_" + wsId).value;
  if (pole === "od" && od && (!doDnia || doDnia < od)) doDnia = od;
  if (pole === "do" && doDnia && !od) od = doDnia;
  var wynik = PozycjeWniosku.ustawTermin(wsId, od, doDnia);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); renderSzkolenia(); return; }
  odswiezPoZmianieSzkolen();
  if (!wynik.zmiana) return;
  komunikat(wynik.terminId ? "Termin zapisany w kalendarzu szkoleń" + (wynik.przeniesiono ? ", przeniesiono uczestników: " + wynik.przeniesiono : "") + "."
    : "Termin usunięty z pozycji, uczestnicy bez terminu.");
}

function zmienCeneSzkoleniaWniosku(wsId) {
  var ws = Store.find("wniosek_szkolenia", wsId);
  var wynik = SzkoleniaWniosku.zmienCeneSzkolenia(wsId, el("cena_" + wsId).value,
    { dopiszDoCennika: ws ? potwierdzCene03(ws.szkolenie_id, el("cena_" + wsId).value) : false });
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); renderSzkolenia(); return; }
  komunikat("Cena szkolenia zapisana. Kwoty uczestników zmienisz przyciskiem Zastosuj kwotę dla wszystkich.");
  odswiezPoZmianieSzkolen();
}

function usunSzkolenieWniosku(wsId) {
  if (!window.confirm("Usunąć szkolenie z projektu?")) return;
  var wynik = SzkoleniaWniosku.usunSzkolenie(wsId);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  odswiezPoZmianieSzkolen();
}

/* ---------- Zastosuj kwote dla wszystkich (D-263), zakres: wszyscy albo jedna pozycja ---------- */
function renderZakresKwoty() {
  var lista = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  el("zakresKwoty").innerHTML = '<option value="">wszyscy uczestnicy</option>' + lista.map(function (ws) {
    return '<option value="' + esc(ws.id) + '">tylko: ' + esc(SzkoleniaWniosku.nazwaPozycji(ws)) + '</option>';
  }).join("");
}

/* Pusta kwota: dla wszystkich bierzemy kwote pierwszego uczestnika, dla pozycji jej cene z projektu */
function zastosujKwoteDlaWszystkich() {
  if (!STAN_03.w.uczestnicy.length) { komunikat("Projekt nie ma uczestników, którym można ustawić kwotę."); return; }
  var pozycjaId = el("zakresKwoty").value;
  var wpisana = el("kwotaDlaWszystkich").value.trim();
  var kwota = wpisana !== "" || pozycjaId ? wpisana : String(STAN_03.w.uczestnicy[0].kwota);
  var sparsowana = kwota === "" ? SzkoleniaWniosku.cenaWniosku(STAN_03.w.id, pozycjaId) : SzkoleniaWniosku.parsujKwote(kwota);
  if (sparsowana === null) { komunikat("Kwota to liczba nie mniejsza niż 0, np. 4500 albo 4500,50."); return; }
  var ilu = pozycjaId ? liczbaUczestnikowPozycji(pozycjaId) : STAN_03.w.uczestnicy.length;
  if (!window.confirm("Ustawić kwotę " + DB.fmtPLN2(sparsowana) + " dla " + ilu + " uczestników? Zmiana trafi do rejestru aktywności.")) return;
  var wynik = SzkoleniaWniosku.zastosujKwote(STAN_03.w.id, kwota, { pozycjaId: pozycjaId });
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  odswiezPoZmianieSzkolen();
  komunikat("Kwota " + DB.fmtPLN2(wynik.kwota) + " ustawiona u " + wynik.zmieniono + " uczestników.");
}
