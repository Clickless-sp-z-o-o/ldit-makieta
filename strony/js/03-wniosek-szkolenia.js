/* Ekran Wniosek: szkolenia projektu z cena ustalona w tym projekcie (D-264) i przycisk
   "Zastosuj kwote dla wszystkich" (D-263). Logika bez DOM: 03-wniosek-szkolenia-logika.js.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function liczbaUczestnikowSzkolenia(szkolenieId) {
  return STAN_03.w.uczestnicy.filter(function (u) { return u.szkolenie === szkolenieId; }).length;
}

function wierszSzkolenia(ws) {
  var kat = SzkoleniaWniosku.szkolenieKatalogu(ws.szkolenie_id);
  var edycja = STAN_03.mozeEdytowac;
  return '<tr><td class="strong">' + esc(kat ? kat.nazwa : ws.szkolenie_id) + '</td>' +
    '<td class="num"><input class="inp num" id="cena_' + esc(ws.id) + '" style="width:110px;height:28px;font-size:12.5px" value="' +
    esc(formatKwoty(ws.cena)) + '"' + (edycja ? "" : " disabled") + ' onchange="zmienCeneSzkoleniaWniosku(\'' + escJs(ws.id) + '\')"></td>' +
    '<td class="c">' + liczbaUczestnikowSzkolenia(ws.szkolenie_id) + '</td>' +
    '<td class="right">' + (edycja ? '<button class="btn xs" onclick="usunSzkolenieWniosku(\'' + escJs(ws.id) + '\')">Usuń</button>' : "") + '</td></tr>';
}

function formularzDodaniaSzkolenia(juz) {
  var dostepne = SzkoleniaWniosku.szkoleniaInstytucji(STAN_03.w.is).filter(function (s) { return juz.indexOf(s.id) < 0; });
  if (!STAN_03.mozeEdytowac) return "";
  if (!dostepne.length) return '<div class="small muted" style="padding:8px 12px">Wszystkie szkolenia z katalogu instytucji są już w projekcie.</div>';
  return '<div class="formularz-szkolenia">' +
    '<select class="inp" id="szkNowe" onchange="podpowiedzCeneSzkolenia()" aria-label="Szkolenie z katalogu">' +
    dostepne.map(function (s) { return '<option value="' + esc(s.id) + '" data-cena="' + esc(s.cena == null ? 0 : s.cena) + '">' + esc(s.nazwa) + '</option>'; }).join("") +
    '</select><input class="inp num" id="szkNowaCena" list="cenySzkolenia03" aria-label="Cena w tym projekcie" placeholder="cena w projekcie">' +
    '<datalist id="cenySzkolenia03"></datalist>' +
    '<button class="btn primary sm" onclick="dodajSzkolenieWniosku()">+ Dodaj szkolenie</button></div>';
}

function renderSzkolenia() {
  var lista = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  var wiersze = lista.length ? lista.map(wierszSzkolenia).join("")
    : '<tr><td colspan="4" class="muted">Projekt nie ma jeszcze szkoleń. Dodaj szkolenie z katalogu instytucji, potem przypisz je uczestnikom.</td></tr>';
  el("szkoleniaWniosku").innerHTML =
    '<table class="tbl"><thead><tr><th>Szkolenie</th><th class="num">Cena w tym projekcie</th><th class="c">Uczestników</th><th></th></tr></thead>' +
    '<tbody>' + wiersze + '</tbody></table>' +
    formularzDodaniaSzkolenia(lista.map(function (r) { return r.szkolenie_id; }));
  podpowiedzCeneSzkolenia();
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
  var szk = el("szkNowe").value, cena = el("szkNowaCena").value;
  var wynik = SzkoleniaWniosku.dodajSzkolenie(STAN_03.w.id, szk, cena, { dopiszDoCennika: potwierdzCene03(szk, cena) });
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  odswiezPoZmianieSzkolen();
  komunikat("Dodano szkolenie do projektu, cena " + DB.fmtPLN2(wynik.cena) + ".");
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

/* ---------- Zastosuj kwote dla wszystkich (D-263) ---------- */
function renderZakresKwoty() {
  var lista = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id);
  el("zakresKwoty").innerHTML = '<option value="">wszyscy uczestnicy</option>' + lista.map(function (ws) {
    var kat = SzkoleniaWniosku.szkolenieKatalogu(ws.szkolenie_id);
    return '<option value="' + esc(ws.szkolenie_id) + '">tylko: ' + esc(kat ? kat.nazwa : ws.szkolenie_id) + '</option>';
  }).join("");
}

/* Pusta kwota: dla wszystkich bierzemy kwote pierwszego uczestnika, dla szkolenia jego cene z projektu */
function zastosujKwoteDlaWszystkich() {
  if (!STAN_03.w.uczestnicy.length) { komunikat("Projekt nie ma uczestników, którym można ustawić kwotę."); return; }
  var szkolenieId = el("zakresKwoty").value;
  var wpisana = el("kwotaDlaWszystkich").value.trim();
  var kwota = wpisana !== "" || szkolenieId ? wpisana
    : (STAN_03.w.uczestnicy.length ? String(STAN_03.w.uczestnicy[0].kwota) : "");
  var sparsowana = kwota === "" ? SzkoleniaWniosku.cenaWniosku(STAN_03.w.id, szkolenieId) : SzkoleniaWniosku.parsujKwote(kwota);
  if (sparsowana === null) { komunikat("Kwota to liczba nie mniejsza niż 0, np. 4500 albo 4500,50."); return; }
  var ilu = szkolenieId ? liczbaUczestnikowSzkolenia(szkolenieId) : STAN_03.w.uczestnicy.length;
  if (!window.confirm("Ustawić kwotę " + DB.fmtPLN2(sparsowana) + " dla " + ilu + " uczestników? Zmiana trafi do rejestru aktywności.")) return;
  var wynik = SzkoleniaWniosku.zastosujKwote(STAN_03.w.id, kwota, { szkolenieId: szkolenieId });
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  odswiezPoZmianieSzkolen();
  komunikat("Kwota " + DB.fmtPLN2(wynik.kwota) + " ustawiona u " + wynik.zmieniono + " uczestników.");
}
