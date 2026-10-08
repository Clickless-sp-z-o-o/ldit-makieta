/* Administracja 08: zakladka Prowizje, tabela instytucji i rozwiniecie projektow. Tylko deklaracje. */
/* ---------- Prowizja per instytucja ---------- */
/* Zamkniety okres (D-276) bierze liczby z prowizje_zamkniete, otwarty liczy silnik */
function wierszeProwizji(okres) {
  var zamkniete = zamknieteOkresu08(okres);
  return DB.INSTYTUCJE.map(function (inst) {
    var w = STAN_08.wyniki[inst.id];
    var s = podsumujPozycje(pozycjeIS(inst.id, okres));
    s.inst = inst;
    s.akt = warunkiNaDzien(w.wersje, STAN_08.dzis);
    s.blad = w.blad;
    return zZamkniecia08(s, zamkniete[inst.id]);
  }).filter(function (r) { return r.n > 0 || r.blad || r.prow; })
    .sort(function (a, b) { return b.prow - a.prow; });
}

function wierszInstytucjiHtml(r) {
  var st = r.obrot ? r.prow / r.obrot * 100 : 0;
  var doFakt = r.prow - r.rozl;
  var model = r.akt ? pillModel(r.akt.model) : '<span class="tag warn">brak warunków</span>';
  var wynik = r.blad
    ? '<td colspan="5"><span class="tag neg">' + esc(r.blad) + '</span></td>'
    : '<td class="num">' + r.n + '</td>' +
      '<td class="num">' + DB.fmtPLN(r.obrot) + '</td>' +
      '<td class="num"><span class="tag mute">' + pct2(st) + '</span></td>' +
      '<td class="num strong">' + DB.fmtPLN(r.prow) + '</td>' +
      '<td class="num"><span class="tag set">' + DB.fmtPLN(r.rozl) + '</span></td>';
  var zafakt = r.blad ? "" : '<td class="num">' + (Math.abs(doFakt) > 0.5
    ? '<span class="tag warn">' + DB.fmtPLN(doFakt) + '</span>' : '<span class="muted">0 zł</span>') + '</td>';
  return '<tr class="' + (r.inst.id === STAN_08.wybranaIS ? "sel" : "") + '">' +
    '<td class="strong nowrap">' + esc(r.inst.nazwa) +
      '<div class="small muted">' + esc(r.inst.miasto) + ' &middot; opiekun ' + esc(r.inst.opiekun) + '</div></td>' +
    '<td class="c">' + model + '</td>' +
    '<td class="muted nowrap">' + (r.akt ? opisOkresu(r.akt.kumulacja) : "-") + '</td>' +
    wynik + zafakt +
    '<td class="right"><button class="btn xs" data-is="' + esc(r.inst.id) + '">Pokaż projekty</button></td></tr>';
}

function renderProwizje() {
  var okres = STAN_08.selOkres.value;
  var wiersze = wierszeProwizji(okres);
  var poprawne = wiersze.filter(function (r) { return !r.blad; });

  document.getElementById("zamkniecieOkresu").innerHTML = " " + przyciskZamkniecia08(okres);
  var przycisk = document.getElementById("btnZamknijOkres");
  if (przycisk) przycisk.addEventListener("click", klikZamknijOkres08);
  document.getElementById("tabProw").innerHTML = wiersze.length
    ? wiersze.map(wierszInstytucjiHtml).join("")
    : brakDanych(10, "Brak projektów w wybranym okresie", "Zmień okres rozliczeniowy.");

  var razem = { n: 0, obrot: 0, prow: 0, rozl: 0 };
  poprawne.forEach(function (r) {
    razem.n += r.n; razem.obrot += r.obrot; razem.prow += r.prow; razem.rozl += r.rozl;
  });

  document.getElementById("stopkaProw").innerHTML =
    '<tr><td class="strong">Razem, ' + poprawne.length + ' instytucji</td><td></td><td></td>' +
    '<td class="num strong">' + razem.n + '</td>' +
    '<td class="num strong">' + DB.fmtPLN(razem.obrot) + '</td><td></td>' +
    '<td class="num strong">' + DB.fmtPLN(razem.prow) + '</td>' +
    '<td class="num strong">' + DB.fmtPLN(razem.rozl) + '</td>' +
    '<td class="num strong">' + DB.fmtPLN(razem.prow - razem.rozl) + '</td><td></td></tr>';

  document.querySelectorAll("#tabProw button[data-is]").forEach(function (b) {
    b.addEventListener("click", function () {
      STAN_08.wybranaIS = b.dataset.is;
      renderProwizje();
      renderProjekty();
    });
  });

  document.getElementById("kpiProw").innerHTML =
    kartaKpi('Obrót objęty prowizją' + znakPodpowiedzi("Suma podstawy prowizji projektów z decyzją pozytywną w wybranym okresie (koszt całkowity z dopłatą albo bez, wg znacznika na wniosku). Faktury korygujące nie zmieniają obrotu."),
        DB.fmtPLN(razem.obrot), "podstawa prowizji, " + nazwaOkresu(okres), true) +
    kartaKpi('Prowizja naliczona' + znakPodpowiedzi("Prowizja LDIT policzona silnikiem okresowym dla każdej instytucji wg warunków z daty faktury, z korektami i nadpisaniami per wniosek. To jedyne źródło tej liczby w systemie."),
        DB.fmtPLN(razem.prow), razem.n + " projektów w " + poprawne.length + " instytucjach", true) +
    kartaKpi('Prowizja rozliczona' + znakPodpowiedzi("Część prowizji dotycząca projektów ze statusem Rozliczone. Pasek pokazuje udział rozliczonej w naliczonej."),
        DB.fmtPLN(razem.rozl),
        '<div class="progress" style="flex:1"><i style="width:' +
        (razem.prow ? Math.round(razem.rozl / razem.prow * 100) : 0) + '%"></i></div>', true) +
    kartaKpi('Do zafakturowania' + znakPodpowiedzi("Prowizja naliczona pomniejszona o rozliczoną, czyli kwota czekająca na fakturę prowizyjną."),
        DB.fmtPLN(razem.prow - razem.rozl), "pozycje bez faktury prowizyjnej", true);
}

/* ---------- Rozwiniecie instytucji ---------- */
function tagRozl(w) {
  if (w && w.rozliczenie === "Rozliczone") return '<span class="tag set">Rozliczone</span>';
  if (w && w.rozliczenie === "Zafakturowany") return '<span class="tag info">Zafakturowany</span>';
  return '<span class="tag mute">Oczekuje</span>';
}

function nazwaKlienta(id) {
  var k = DB.KLIENCI.filter(function (x) { return x.id === id; })[0];
  return k ? k.nazwa : "-";
}

function stawkaHtml(p) {
  var rozb = p.rozbicie && p.rozbicie.length > 1
    ? '<div class="small muted">' + p.rozbicie.map(function (x) {
        return DB.fmtPLN(x.kwota) + " po " + x.st + "%";
      }).join(" + ") + '</div>' : "";
  return pct2(p.stawka) + rozb;
}

function opisNadpisania(w) {
  var wartosc = w.prowizjaTyp === "procent" ? DB.fmtPct(w.prowizjaProcent) : DB.fmtPLN(w.prowizjaKwota);
  return "reguła nadpisana, " + w.prowizjaTyp + ": " + wartosc;
}

function wierszPozycjiHtml(p) {
  if (p.korekta) {
    var f = p.faktura || {};
    var pierwotna = STAN_08.fakturyPoId[f.korygowana] || {};
    return '<tr class="row-danger"><td class="strong">' + esc(f.nr) + '</td>' +
      '<td class="strong nowrap">' + esc(nazwaKlienta(f.klient || pierwotna.klient)) + '<div class="small muted">korekta do ' + esc(pierwotna.nr || p.korygowana) + '</div></td>' +
      '<td class="nowrap muted">' + esc(f.szkolenia || pierwotna.szkolenia) + '</td>' +
      '<td class="mono">' + esc(p.data) + '</td>' +
      '<td class="num">' + DB.fmtPLN(p.kwota) + '</td>' +
      '<td class="num muted">bez zmiany obrotu</td>' +
      '<td class="num">' + pct2(p.stawka) + '<div class="small muted">stawka faktury pierwotnej</div></td>' +
      '<td class="num strong">' + DB.fmtPLN(p.prowizja) + '</td>' +
      '<td><span class="tag neg">korekta</span><div class="small muted">korekta rozliczona w okresie wystawienia <span class="ref">D-161</span></div></td>' +
      '<td></td></tr>';
  }
  var w = p.wniosek;
  return '<tr class="' + (w.rozliczenie === "Rozliczone" ? "row-set" : "") + '">' +
    '<td class="strong">' + esc(w.nr) + '</td>' +
    '<td class="strong nowrap">' + esc(w.klNazwa) + '<div class="small muted">' + esc(w.id) + '</div></td>' +
    '<td class="nowrap muted">' + esc(w.szkolenie) + '</td>' +
    '<td class="mono">' + esc(w.dataFaktury) + '</td>' +
    '<td class="num">' + DB.fmtPLN(p.kwota) +
      (w.doplata ? '<div class="small muted">w tym dopłata ' + DB.fmtPLN(w.doplata) + '</div>' : "") + '</td>' +
    '<td class="num muted">' + DB.fmtPLN(p.przed) + '</td>' +
    '<td class="num">' + stawkaHtml(p) + '</td>' +
    '<td class="num strong">' + DB.fmtPLN(p.prowizja) +
      (p.nadpisana ? '<div class="small" style="color:var(--warn-ink)">' + esc(opisNadpisania(w)) +
        '<br>wg reguły ' + DB.fmtPLN(p.wyliczona) + '</div>' : "") + '</td>' +
    '<td>' + tagRozl(w) + '</td>' +
    '<td class="right nowrap"><a class="btn xs" href="' + esc(Nawigacja.adresKarty(w.id)) + '" data-tip="' +
      (p.nadpisana ? "Przywrocenie reguly" : "Nadpisanie prowizji, procent albo kwota (D-136),") +
      ' robi sie na karcie wniosku (D-138). Administracja tylko pokazuje podstawe.">Karta wniosku</a></td></tr>';
}

function renderProjekty() {
  var inst = DB.INSTYTUCJE.filter(function (i) { return i.id === STAN_08.wybranaIS; })[0];
  var okres = STAN_08.selOkres.value;
  var wynik = STAN_08.wyniki[STAN_08.wybranaIS];
  var akt = warunkiNaDzien(wynik.wersje, STAN_08.dzis);
  var lista = pozycjeIS(STAN_08.wybranaIS, okres);

  document.getElementById("naglProjekty").innerHTML =
    "Rozwinięcie: " + esc(inst.nazwa) + " " + (akt ? pillModel(akt.model) : '<span class="tag warn">brak warunków</span>');
  document.getElementById("tagOkresProj").innerHTML =
    nazwaOkresu(okres) + (akt ? " &middot; kumulacja " + opisOkresu(akt.kumulacja) : "");

  if (wynik.blad) {
    document.getElementById("tabProjekty").innerHTML =
      brakDanych(10, "Nie można rozliczyć tej instytucji", esc(wynik.blad));
    return;
  }
  document.getElementById("tabProjekty").innerHTML = lista.length
    ? lista.map(wierszPozycjiHtml).join("")
    : brakDanych(10, "Brak projektów w wybranym okresie",
        "Zmień okres rozliczeniowy albo wybierz inną instytucję w tabeli powyżej.");
}
