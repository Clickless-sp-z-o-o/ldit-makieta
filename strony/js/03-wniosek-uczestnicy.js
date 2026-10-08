/* Ekran Wniosek: szkolenia uczestnikow projektu, kwalifikacja i kwota per szkolenie uczestnika (D-279).
   Wiersz to szkolenie uczestnika; osoba z dwoma szkoleniami ma dwa wiersze.
   Uczestnikow dodaje sie z listy klienta (03-wniosek-uczestnicy-wybor.js), nowych wpisuje sie w karcie klienta (D-236).
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

/* Wiersz wskazuje jedno ze szkolen projektu (D-264, D-279) */
function selectSzkolenia(u, i) {
  var szkolenia = SzkoleniaWniosku.szkoleniaWniosku(STAN_03.w.id).map(function (ws) { return ws.szkolenie_id; });
  if (u.szkolenie && szkolenia.indexOf(u.szkolenie) < 0) szkolenia.push(u.szkolenie);
  var opcje = szkolenia.map(function (id) {
    var kat = SzkoleniaWniosku.szkolenieKatalogu(id);
    return '<option value="' + esc(id) + '"' + (id === u.szkolenie ? " selected" : "") + '>' + esc(kat ? kat.nazwa : id) + '</option>';
  }).join("");
  return '<select class="inp" id="uSzk' + i + '" style="height:28px;font-size:12.5px"' + (STAN_03.mozeEdytowac ? "" : " disabled") +
    ' onchange="zmienSzkolenieUcz(' + i + ')">' + opcje + '</select>';
}

function wierszUczestnika(u, i) {
  var zak = u.status === "zakwalifikowany";
  var uk = DB.UCZESTNICY_KLIENTA.filter(function (x) { return x.id === u.uczestnikKlienta; })[0];
  var pesel = u.pesel ? esc(u.pesel.slice(0, 6)) + "*****" : '<span class="muted">ukryty</span>';
  var edycja = STAN_03.mozeEdytowac;
  return '<tr' + (zak ? "" : ' class="row-danger"') + '>' +
    '<td><div class="strong">' + esc(u.imie) + '</div><div class="small mono muted">' + pesel + '</div>' + ostrzezenieUczestnika(uk) + '</td>' +
    '<td>' + opisDanychUczestnika(uk) + '</td>' +
    '<td>' + selectSzkolenia(u, i) + '</td>' +
    '<td class="num"><input class="inp num" id="uKwota' + i + '" style="width:96px;height:28px;font-size:12.5px" value="' +
      esc(formatKwoty(u.kwota)) + '"' + (edycja ? "" : " disabled") + ' onchange="zapiszKwoteUcz(' + i + ')"></td>' +
    '<td>' + (zak
      ? '<span class="tag pos dot">zakwalifikowany</span>'
      : '<span class="tag neg dot" title="' + esc(u.powod) + '">niezakwalifikowany</span>' +
        '<div class="small muted">' + esc(u.powod) + '</div>') + '</td>' +
    '<td class="right nowrap">' + (edycja
      ? '<button class="btn xs" onclick="przelacz(' + i + ')">Zmień</button> ' +
        '<button class="btn xs" title="Usuwa to szkolenie uczestnika; osoba bez szkoleń znika z projektu, zostaje na karcie klienta" onclick="usunZProjektu(' + i + ')">Usuń</button>'
      : '') + '</td></tr>';
}

function renderUcz() {
  var zakw = STAN_03.w.uczestnicy.filter(function (u) { return u.status === "zakwalifikowany"; }).length;
  el("subUcz").innerHTML = STAN_03.w.osob + " osób, " +
    zakw + " zakwalifikowanych szkoleń z " + STAN_03.w.uczestnicy.length +
    (zakw < STAN_03.w.uczestnicy.length ? ' &middot; niezakwalifikowani wymagają odrębnej faktury komercyjnej <span class="ref">D-84</span>' : "");
  el("uczestnicy").innerHTML = STAN_03.w.uczestnicy.length
    ? STAN_03.w.uczestnicy.map(wierszUczestnika).join("")
    : '<tr><td colspan="6" class="muted">Brak uczestników w tym projekcie. Wybierz ich z puli klienta.</td></tr>';
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
