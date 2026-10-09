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

function wierszUczestnika16(r) {
  var termin = r.t ? esc(DB.fmtDate(r.t.od)) + " &rsaquo; " + esc(DB.fmtDate(r.t.do)) : '<span class="muted">termin nieustalony</span>';
  return '<tr><td class="strong">' + esc(r.u.imie) + "</td><td>" + esc(r.w.klNazwa) + '</td><td class="mono small">' + esc(r.w.nr || r.w.id) + "</td>" +
    "<td>" + esc(r.u.szkNazwa || "") + '</td><td class="nowrap small">' + termin + "</td><td>" + esc(r.u.status || "") + "</td>" + komorkaProjektu16(r.w) + "</tr>";
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
  el16("subTab").textContent = lista.length + " z " + wszyscy.length + " uczestników wniosków instytucji";
  el16("wiersze").innerHTML = lista.length ? lista.map(wierszUczestnika16).join("") :
    '<tr><td colspan="7"><div class="empty"><div class="et">Brak uczestników</div>Wyszukiwarka nie sięga poza dane tej instytucji.</div></td></tr>';
}
