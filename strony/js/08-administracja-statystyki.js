/* Administracja 08: zakladka Statystyki per instytucja i zbiorczo (D-141). Tylko deklaracje. */
function widokStatystyki() {
  document.getElementById("t-statystyki").innerHTML = `

    <div class="note">
      <b>Statystyki ilościowe i kwotowe per instytucja oraz zbiorczo <span class="ref">D-141</span>.</b>
      Ile wniosków złożono, ile decyzji pozytywnych i negatywnych, ile rezygnacji, jaki obrót i jaki przychód LDIT
      (suma prowizji z tego samego silnika co zakładka Prowizje). Widok wyłącznie dla administratora
      <span class="ref">D-34</span>.
    </div>

    <div class="grid g4" style="margin-bottom:18px" id="kpiStat"></div>

    <div class="card">
      <div class="card-head">
        <h3>Statystyki per instytucja szkoleniowa</h3>
        <span class="sub">skuteczność, obrót i przychód LDIT</span>
        <div class="ch-actions">
          <label class="small muted" for="miaraNagrody">Wyróżnienie wg</label>
          <select class="inp" id="miaraNagrody" style="width:auto">
            <option value="przychod">przychodu LDIT</option>
            <option value="obrot">obrotu</option>
            <option value="skutecznosc">skuteczności</option>
            <option value="pozytywne">liczby decyzji pozytywnych</option>
          </select>
        </div>
      </div>
      <div class="card-body tight">
        <div class="tbl-wrap" style="overflow-x:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th>Instytucja</th>
                <th class="num">Złożone</th>
                <th class="num">Pozytywne</th>
                <th class="num">Odrzucone</th>
                <th class="num">Rezygnacje</th>
                <th class="num">Skuteczność<span class="tip-mark" data-tip="Udział wniosków z decyzją pozytywną w liczbie rozstrzygniętych (pozytywne plus odrzucone).">i</span></th>
                <th class="num">Obrót<span class="tip-mark" data-tip="Podstawa prowizji projektów z decyzją pozytywną (koszt całkowity z dopłatą albo bez, wg znacznika na wniosku).">i</span></th>
                <th class="num">Przychód LDIT<span class="tip-mark" data-tip="Suma prowizji naliczonej przez silnik okresowy, z korektami i nadpisaniami. To ta sama liczba co w zakładce Prowizje.">i</span></th>
                <th class="num">VAT z faktur<span class="tip-mark" data-tip="Z kolumny VAT faktur instytucji. Stawka liczbowa daje kwotę VAT z kwoty brutto, oznaczenia typu ZW są pokazane wprost. Brak faktur to brak danych.">i</span></th>
                <th class="c">Wyróżnienie</th>
              </tr>
            </thead>
            <tbody id="tabStat"></tbody>
            <tfoot id="stopkaStat"></tfoot>
          </table>
        </div>
      </div>
      <div class="card-body" style="border-top:1px solid var(--line)">
        <div class="small muted">
          <b>System nagród dla instytucji <span class="ref">D-141</span>.</b>
          Klient chce wyróżniać najlepiej współpracujące instytucje. Mechanizm nagrody (rabat na prowizji,
          wyróżnienie, benefit) nie został ustalony, więc tu wskazujemy tylko lidera wg wybranej miary,
          bez żadnej kwoty.
        </div>
      </div>
    </div>
`;
}

var MIARY_NAGRODY = {
  przychod: function (r) { return r.przychod; },
  obrot: function (r) { return r.obrot; },
  skutecznosc: function (r) { return r.rozstrzygniete ? r.poz / r.rozstrzygniete : -1; },
  pozytywne: function (r) { return r.poz; }
};

/* VAT z kolumny faktury.vat: stawka liczbowa (kwota brutto) daje kwote, inne oznaczenia (ZW) pokazujemy wprost */
function vatInstytucji(isId) {
  var faktury = DB.FAKTURY.filter(function (f) { return f.isId === isId && f.vat; });
  if (!faktury.length) return "brak danych";
  var kwota = 0, oznaczenia = {}, liczbowe = 0;
  faktury.forEach(function (f) {
    var stawka = parseFloat(String(f.vat).replace(",", "."));
    if (isNaN(stawka)) { oznaczenia[f.vat] = true; return; }
    liczbowe++;
    kwota += f.kwota * stawka / (100 + stawka);
  });
  var opis = Object.keys(oznaczenia).map(esc).join(", ");
  return (liczbowe ? DB.fmtPLN(kwota) : "") + (liczbowe && opis ? ", " : "") + opis;
}

function statystykiWg() {
  var wnioski = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.rok === STAN_08.rok; });
  return DB.INSTYTUCJE.map(function (inst) {
    var wsz = wnioski.filter(function (w) { return w.is === inst.id; });
    var s = podsumujPozycje(pozycjeIS(inst.id, ""));
    var poz = wsz.filter(function (w) { return w.statusDec === "Pozytywna"; }).length;
    var odrz = wsz.filter(function (w) { return w.statusDec === "Negatywna"; }).length;
    return { inst: inst, zlozone: wsz.filter(function (w) { return w.statusSkl === "Złożony"; }).length,
             poz: poz, odrz: odrz, rozstrzygniete: poz + odrz,
             rez: wsz.filter(function (w) { return w.statusSkl === "Rezygnacja"; }).length,
             obrot: s.obrot, przychod: s.prow, wnioski: wsz.length, blad: STAN_08.wyniki[inst.id].blad };
  }).filter(function (r) { return r.wnioski > 0; });
}

/* Liczby w wierszu instytucji prowadza do jej wnioskow w danym statusie (drill through, D-212) */
function linkStat(inst, filtry) {
  var adres = Nawigacja.adresWnioskow(Object.assign({ rok: STAN_08.rok, inst: inst.id }, filtry));
  return ' data-href="' + esc(adres) + '" title="Pokaż wnioski"';
}

function wierszStatystykHtml(r, lider) {
  var skut = r.rozstrzygniete ? Math.round(r.poz / r.rozstrzygniete * 100) : 0;
  return '<tr class="' + (r === lider ? "sel" : "") + '"' + linkStat(r.inst, {}) + '>' +
    '<td class="strong nowrap">' + esc(r.inst.nazwa) + '<div class="small muted">' + esc(r.inst.miasto) + '</div></td>' +
    '<td class="num"' + linkStat(r.inst, { zlozone: "1" }) + '>' + r.zlozone + '</td>' +
    '<td class="num"' + linkStat(r.inst, { status: "Pozytywna" }) + '><span class="tag pos">' + r.poz + '</span></td>' +
    '<td class="num"' + linkStat(r.inst, { status: "Negatywna" }) + '>' + (r.odrz ? '<span class="tag neg">' + r.odrz + '</span>' : '<span class="muted">0</span>') + '</td>' +
    '<td class="num"' + linkStat(r.inst, { status: "Rezygnacja" }) + '>' + (r.rez ? '<span class="tag warn">' + r.rez + '</span>' : '<span class="muted">0</span>') + '</td>' +
    '<td class="num">' + skut + '%</td>' +
    '<td class="num">' + DB.fmtPLN(r.obrot) + '</td>' +
    '<td class="num strong">' + (r.blad ? '<span class="tag neg">' + esc(r.blad) + '</span>' : DB.fmtPLN(r.przychod)) + '</td>' +
    '<td class="num muted">' + vatInstytucji(r.inst.id) + '</td>' +
    '<td class="c">' + (r === lider ? '<span class="tag pos dot">top 1</span>' : "") + '</td></tr>';
}

function renderStat() {
  var wiersze = statystykiWg();
  var miara = MIARY_NAGRODY[document.getElementById("miaraNagrody").value];
  var lider = wiersze.slice().sort(function (a, b) { return miara(b) - miara(a); })[0];
  wiersze.sort(function (a, b) { return b.przychod - a.przychod; });

  document.getElementById("tabStat").innerHTML = wiersze.length
    ? wiersze.map(function (r) { return wierszStatystykHtml(r, lider); }).join("")
    : brakDanych(10, "Brak wniosków w roku " + STAN_08.rok, "");

  var s = { zlozone: 0, poz: 0, odrz: 0, rez: 0, obrot: 0, przychod: 0 };
  wiersze.forEach(function (r) {
    Object.keys(s).forEach(function (k) { s[k] += (r.blad && k === "przychod") ? 0 : r[k]; });
  });
  var rozstrz = s.poz + s.odrz;
  var skutRazem = rozstrz ? Math.round(s.poz / rozstrz * 100) : 0;
  document.getElementById("stopkaStat").innerHTML =
    '<tr><td class="strong">Zbiorczo, ' + wiersze.length + ' instytucji</td><td class="num strong">' + s.zlozone + '</td>' +
    '<td class="num strong">' + s.poz + '</td><td class="num strong">' + s.odrz + '</td><td class="num strong">' + s.rez + '</td>' +
    '<td class="num strong">' + skutRazem + '%</td><td class="num strong">' + DB.fmtPLN(s.obrot) + '</td>' +
    '<td class="num strong">' + DB.fmtPLN(s.przychod) + '</td><td></td><td></td></tr>';

  document.getElementById("kpiStat").innerHTML =
    kartaKpi('Wnioski złożone' + znakPodpowiedzi("Wnioski o statusie Złożony w roku bieżącym, po wszystkich instytucjach."),
        DB.fmtNum(s.zlozone), s.poz + " pozytywnych, " + s.odrz + " odrzuconych, " + s.rez + " rezygnacji", true) +
    kartaKpi('Skuteczność zbiorcza' + znakPodpowiedzi("Udział decyzji pozytywnych w rozstrzygniętych, po wszystkich instytucjach."),
        skutRazem + "%", "z " + rozstrz + " rozstrzygniętych", true) +
    kartaKpi('Obrót' + znakPodpowiedzi("Suma podstawy prowizji projektów z decyzją pozytywną."), DB.fmtPLN(s.obrot), "zsumowany po instytucjach", true) +
    kartaKpi('Przychód LDIT' + znakPodpowiedzi("Suma prowizji z silnika okresowego, ta sama co w zakładce Prowizje."),
        DB.fmtPLN(s.przychod), "suma prowizji naliczonej", true);
}
