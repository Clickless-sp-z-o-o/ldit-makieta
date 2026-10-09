/* Ekran 04, czesc 2: wiersze tabeli klientow i rozwiniete wnioski klienta.
   Korzysta ze STAN_04 z 04-baza-klientow-dane.js. Same deklaracje. */

function tagNaboru(r) {
  if (r.status === "trwa") return '<span class="tag pos dot">trwa</span>';
  if (r.status === "oczekuje") return '<span class="tag info dot">oczekuje</span>';
  if (r.status === "prognozowany") return '<span class="tag warn dot" title="Prognoza: ' + esc(r.nab.prognoza) + '">prognoza</span>';
  if (r.status === "zakończony") return '<span class="tag mute dot">zakończony</span>';
  return '<span class="tag mute dot">brak danych</span>';
}
function tagDni(r) {
  if (r.dni == null) return "";
  if (r.dni < 0) return ' <span class="small muted">zakończony</span>';
  var klasa = r.dni <= 3 ? "neg" : r.dni <= 10 ? "warn" : "info";
  return ' <span class="tag ' + klasa + '">' + r.dni + ' dni</span>';
}
function tagWielkosc(w) {
  return '<span class="pill ' + (w === "mikro" ? "k" : "w") + '">' + esc(w || "brak") + '</span>';
}
/* Kolejny na liscie tylko do odczytu, zmienia sie go polem wyboru w edycji klienta (D-265) */
function flagaKolejny(r) {
  var tak = r.kl.zainteresowany;
  var tekst = tak ? "Zainteresowany kolejnym naborem (D-130)." : "Nie zainteresowany kolejnym naborem (D-130).";
  return '<span class="tag ' + (tak ? "pos" : "mute") + '" data-tip="' + tekst + ' Zmiana tylko w edycji klienta (D-265).">' + (tak ? "tak" : "nie") + '</span>';
}
/* Znacznik czarnej listy (D-249): kl.czarnaLista jest wyzerowane dla kont bez dostepu do zgloszen */
function znacznikCzarnejListy(kl) {
  return kl.czarnaLista
    ? ' <span class="tag neg" data-tip="Klient na czarnej liście: dwa niezłożone wnioski w różnych terminach albo ręczne oznaczenie (D-249). Zmiana w karcie klienta.">czarna lista</span>'
    : "";
}

/* Wiersz wniosku klienta: klik otwiera karte wniosku z powrotem do tego klienta */
function wierszWniosku(w) {
  var brak = '<span class="muted">-</span>';
  return '<tr class="' + Statusy.klasaWiersza(w) + '" data-id="' + esc(w.id) + '" data-klient="' + esc(w.klient) + '">' +
    '<td class="strong mono nowrap">' + esc(w.id) + '</td>' +
    '<td class="nowrap">' + esc(w.rok || "bez roku") + '</td>' +
    '<td><div class="tnij w" title="' + esc(w.szkolenie) + '">' + esc(w.szkolenie) + '</div></td>' +
    '<td class="num">' + (w.przyznano != null ? DB.fmtPLN(w.przyznano) : brak) + '</td>' +
    '<td class="num">' + (w.kosztCalkowity != null ? DB.fmtPLN(w.kosztCalkowity) : brak) + '</td>' +
    '<td>' + Statusy.znacznik(w) + '</td>' +
    '<td>' + Statusy.znacznikRozliczenia(w) + '</td>' +
    '<td class="small muted">etap ' + esc(w.etap) + ': ' + esc(Statusy.ETAPY[w.etap] || "") + '</td>' +
    '</tr>';
}

/* Zagniezdzona tabela wnioskow klienta (D-128), kolorowana statusem */
function detalWnioskow(r) {
  var lista = wnioskiWFiltrze(r.wnioski.slice().sort(function (a, b) { return (b.rok || "") < (a.rok || "") ? -1 : 1; }));
  var body = lista.length ? lista.map(wierszWniosku).join("") :
    '<tr><td colspan="8" class="small muted" style="padding:10px">Brak wniosków w tym filtrze. ' +
    'Zmień filtr na „Wszyscy klienci”, żeby zobaczyć wszystkie.</td></tr>';
  var ukryte = r.wnioski.length - lista.length;
  var stopka = ukryte > 0
    ? '<div class="small muted" style="margin:0 24px 8px 0">Ukryte przez filtr: ' + ukryte + '. ' +
      '<a class="link-rekordu" href="' + esc(Nawigacja.adresKlienta(r.kl.id)) + '">Wszystkie wnioski na karcie klienta</a></div>'
    : '';
  return '<tr class="wn-detail"><td colspan="12">' +
    '<table class="tbl"><thead><tr>' +
      '<th>Wniosek</th><th>Rok</th><th>Szkolenie</th><th class="num">Przyznano</th>' +
      '<th class="num">Koszt całk.</th><th>Status</th><th>Rozliczenie</th><th>Etap</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table>' + stopka + '</td></tr>';
}

function przyciskRozwijania(r) {
  if (!r.wnioski.length) return '<span class="muted">&middot;</span>';
  var otw = !!STAN_04.expanded[r.kl.id];
  return '<button type="button" class="btn xs exp-btn" onclick="przelaczWnioski(\'' + escJs(r.kl.id) + '\')" aria-expanded="' + otw + '"' +
    ' aria-label="' + (otw ? "Zwiń" : "Rozwiń") + ' wnioski klienta ' + esc(r.kl.nazwa) + '" title="Wnioski klienta">' + (otw ? "&minus;" : "+") + '</button>';
}

/* Akcje wiersza jak na liscie wnioskow: tekstowe przyciski xs, do karty klienta prowadzi tylko "Szczegoly" */
function przyciskiAkcji04(kl) {
  var nazwa = esc(kl.nazwa);
  return '<td class="right nowrap"><button type="button" class="btn xs" aria-label="Edytuj dane klienta ' + nazwa + '" title="Edytuj dane klienta"' +
    ' onclick="edytujKlient(\'' + escJs(kl.id) + '\')">Edytuj</button> ' +
    '<a class="btn xs" aria-label="Szczegóły klienta ' + nazwa + '" title="Karta klienta" href="' + esc(Nawigacja.adresKlienta(kl.id)) + '">&#9998; Szczegóły</a></td>';
}

function wierszKlienta(r) {
  var cls = r.status === "trwa" ? "row-pos row-nabor"
          : (r.status === "zakończony" || r.status === "Bez informacji") ? "dim" : "";
  var row = '<tr class="' + cls + '" data-kl="' + esc(r.kl.id) + '">' +
    '<td class="exp-cell">' + przyciskRozwijania(r) + '</td>' +
    '<td class="strong">' + esc(r.kl.nr) + '</td>' +
    '<td class="strong"><div class="tnij" title="' + esc(r.kl.nazwa) + '">' + esc(r.kl.nazwa) + '</div>' +
      '<span class="pod">' + znacznikCzarnejListy(r.kl) + '<span class="mono">' + esc(r.kl.nip) + '</span> &middot; ' + esc(r.kl.miasto) + '</span></td>' +
    '<td class="nowrap">' + tagWielkosc(r.kl.wielkosc) + '</td>' +
    '<td><div class="tnij" title="' + esc(r.isNazwa) + '">' + esc(r.isNazwa) + '</div></td>' +
    '<td class="nowrap muted">' + esc(String(r.pupNazwa).replace(/^PUP\s+/, "")) + '</td>' +
    '<td class="nowrap">' + tagNaboru(r) + '</td>' +
    '<td class="mono nowrap">' + (esc(DB.fmtDate(r.koniec)) || '<span class="muted">-</span>') + tagDni(r) + '</td>' +
    '<td class="c">' + flagaKolejny(r) + '</td>' +
    '<td class="c">' + (r.wnioski.length ? '<b>' + r.wnioski.length + '</b>' : '<span class="muted">0</span>') + '</td>' +
    '<td class="small"><div class="tnij" title="' + esc(r.kl.osoba) + '">' + esc(r.kl.osoba) + '</div>' +
      '<span class="pod">' + esc(r.kl.tel) + '</span></td>' +
    przyciskiAkcji04(r.kl) +
    '</tr>';
  return row + (STAN_04.expanded[r.kl.id] ? detalWnioskow(r) : "");
}
