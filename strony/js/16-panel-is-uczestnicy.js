/* Panel instytucji: zakladka Uczestnicy, czyli wszyscy uczestnicy wnioskow instytucji (D-319),
   oraz odnosnik do projektu w wierszach list. Dane z STAN_16.W (zakres konta: handlowiec tylko
   swoi klienci, PESEL i kwoty wedlug uprawnien). Same deklaracje. */

function komorkaProjektu16(w) {
  return '<td class="right"><a class="btn xs" href="22-projekt-is.html?id=' + encodeURIComponent(w.id) + '" aria-label="Szczegóły projektu ' +
    esc(w.nr || w.id) + '">Szczegóły</a></td>';
}

function uczestnicyInstytucji16() {
  var terminy = {};
  DB.TERMINY.forEach(function (t) { terminy[t.id] = t; });
  var lista = [];
  STAN_16.W.forEach(function (w) {
    w.uczestnicy.forEach(function (u) { lista.push({ u: u, w: w, t: terminy[u.termin] }); });
  });
  return lista;
}

/* Niezakwalifikowany uczestnik: wiersz w kolorze statusu negatywnego z plakietka i powodem w dymku, jak na karcie
   wniosku (D-370, feedback Martyny 19.10.2026: "moze jakis kolor jak uczestnik sie niezakwalifikowal?") */
function niezakwalifikowany16(u) { return u.status === "niezakwalifikowany"; }

function kwalifikacja16(u) {
  return niezakwalifikowany16(u) ? '<span class="tag neg dot"' + (u.powod ? ' title="' + esc(u.powod) + '"' : "") + '>niezakwalifikowany</span>' +
      (u.powod ? '<div class="small">' + esc(u.powod) + "</div>" : "")
    : '<span class="tag pos dot">zakwalifikowany</span>';
}

function wierszUczestnika16(r) {
  var termin = r.t ? esc(DB.fmtDate(r.t.od)) + " &rsaquo; " + esc(DB.fmtDate(r.t.do)) : '<span class="muted">termin nieustalony</span>';
  return '<tr' + (niezakwalifikowany16(r.u) ? ' class="row-neg"' : "") + '><td class="strong">' + esc(r.u.imie) + "</td><td>" + esc(r.w.klNazwa) +
    '</td><td class="mono small">' + esc(r.w.nr || r.w.id) + "</td>" +
    "<td>" + esc(r.u.szkNazwa || "") + '</td><td class="nowrap small">' + termin + "</td><td>" + kwalifikacja16(r.u) + "</td>" + komorkaProjektu16(r.w) + "</tr>";
}

function renderUczestnicy16() {
  var wszyscy = uczestnicyInstytucji16();
  var q = el16("szukaj").value.trim().toLowerCase();
  var lista = wszyscy.filter(function (r) {
    return !q || (r.u.imie + " " + r.w.klNazwa + " " + (r.u.szkNazwa || "") + " " + (r.w.nr || "")).toLowerCase().indexOf(q) >= 0;
  });
  el16("glowa16").innerHTML = "<tr><th>Uczestnik</th><th>Klient</th><th>Projekt</th><th>Szkolenie</th><th>Termin</th><th>Kwalifikacja</th>" +
    '<th><span class="sr-only">Projekt</span></th></tr>';
  el16("chipy16").hidden = true;
  el16("legenda16").hidden = false;
  el16("tytulListy16").textContent = "Uczestnicy wniosków";
  var niezakw = lista.filter(function (r) { return niezakwalifikowany16(r.u); }).length;
  el16("subTab").textContent = lista.length + " z " + wszyscy.length + " uczestników wniosków instytucji" + (niezakw ? ", niezakwalifikowanych: " + niezakw : "");
  el16("wiersze").innerHTML = lista.length ? lista.map(wierszUczestnika16).join("") :
    '<tr><td colspan="7"><div class="empty"><div class="et">Brak uczestników</div>Wyszukiwarka nie sięga poza dane tej instytucji.</div></td></tr>';
}
