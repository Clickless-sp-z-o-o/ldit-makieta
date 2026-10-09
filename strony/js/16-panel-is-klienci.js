/* Panel instytucji: tabele wlasnych klientow i projektow oraz zlozonych wnioskow (D-251) */

/* Termin wniosku wynika z przypisania szkolen uczestnikow do terminu (uczestnik_szkolenia.termin_id, D-279) */
function wczytajTerminyWnioskow16() {
  STAN_16.terminWniosku = {};
  Store.query(
    "SELECT s.wniosek_id, MIN(t.data_od) AS od, MAX(t.data_do) AS do FROM uczestnik_szkolenia s " +
    "JOIN terminy t ON t.id = s.termin_id GROUP BY s.wniosek_id"
  ).forEach(function (r) { STAN_16.terminWniosku[r.wniosek_id] = r; });
}

function pasuje16(w, f) {
  if (f === "poz") return w.statusDec === "Pozytywna";
  if (f === "neg") return w.statusDec === "Negatywna";
  if (f === "ocz") return w.statusSkl === "Złożony" && !w.statusDec;
  if (f === "rozl") return w.rozliczenie === "Rozliczone";
  return true;
}

function tagStatusWniosku16(w) {
  if (w.statusDec === "Pozytywna") return '<span class="tag pos dot">decyzja pozytywna</span>';
  if (w.statusDec === "Negatywna") return '<span class="tag neg dot">decyzja negatywna</span>';
  if (w.statusSkl === "Złożony") return '<span class="tag info dot">oczekuje na decyzję</span>';
  if (w.statusSkl === "NW") return '<span class="tag warn dot">NW</span>';
  if (w.statusSkl === "Rezygnacja") return '<span class="tag mute dot">rezygnacja</span>';
  return '<span class="tag mute dot">niezłożony</span>';
}

function tagRealizacji16(w) {
  if (w.rozliczenie === "Rozliczone") return '<span class="tag set dot">rozliczone</span>';
  if (w.rozliczenie === "Zafakturowany") return '<span class="tag info dot">szkolenie odbyte</span>';
  if (w.rozliczenie === "Oczekuje") return '<span class="tag warn dot">czeka na realizację</span>';
  return '<span class="muted">-</span>';
}

var NAGLOWKI_16 = {
  klienci: "<tr><th>Klient</th><th>Urząd</th><th>Szkolenie</th><th class=\"num\">Osób</th><th>Status wniosku</th><th>Termin szkolenia</th><th>Realizacja</th><th><span class=\"sr-only\">Projekt</span></th></tr>",
  zlozone: "<tr><th>Klient</th><th>Urząd</th><th>Szkolenie</th><th class=\"num\">Osób</th><th>Data złożenia</th><th>Decyzja</th><th><span class=\"sr-only\">Projekt</span></th></tr>"
};

function klasaWiersza16(w) {
  return w.rozliczenie === "Rozliczone" ? "row-set" : w.statusDec === "Pozytywna" ? "row-pos" : w.statusDec === "Negatywna" ? "row-neg" : "";
}

function komorkiWspolne16(w) {
  return '<td class="strong"><a href="22-projekt-is.html?klient=' + encodeURIComponent(w.klient) + '">' + esc(w.klNazwa) + '</a></td><td class="small">' + esc(w.pupNazwa || "-") + '</td><td>' + esc(w.szkolenie) + '</td>' +
    '<td class="num">' + esc(w.osobZakw) + (w.osobZakw < w.osob ? ' <span class="muted small">z ' + esc(w.osob) + '</span>' : '') + '</td>';
}

function wierszWniosku16(w) {
  var t = STAN_16.terminWniosku[w.id];
  return '<tr class="' + klasaWiersza16(w) + '">' + komorkiWspolne16(w) +
    '<td>' + tagStatusWniosku16(w) + '</td>' +
    '<td class="nowrap small">' + (t ? esc(DB.fmtDate(t.od)) + " &rsaquo; " + esc(DB.fmtDate(t.do)) : '<span class="muted">termin nieustalony</span>') + '</td>' +
    '<td>' + tagRealizacji16(w) + '</td>' + komorkaProjektu16(w) + '</tr>';
}

function wierszZlozonego16(w) {
  return '<tr class="' + klasaWiersza16(w) + '">' + komorkiWspolne16(w) +
    '<td class="nowrap small">' + esc(w.dataWniosku ? DB.fmtDate(w.dataWniosku) : "-") + '</td>' +
    '<td>' + tagStatusWniosku16(w) + '</td>' + komorkaProjektu16(w) + '</tr>';
}

function zlozone16() { return STAN_16.W.filter(function (w) { return w.statusSkl === "Złożony"; }); }

function renderKlienci16() {
  if (STAN_16.widok === "uczestnicy") { renderUczestnicy16(); return; }
  var zlozoneWidok = STAN_16.widok === "zlozone";
  var W = zlozoneWidok ? zlozone16() : STAN_16.W;
  var q = el16("szukaj").value.trim().toLowerCase();
  var lista = W.filter(function (w) {
    if (!zlozoneWidok && !pasuje16(w, STAN_16.filtr)) return false;
    return !q || (w.klNazwa + " " + w.szkolenie + " " + (w.pupNazwa || "")).toLowerCase().indexOf(q) >= 0;
  });
  el16("glowa16").innerHTML = NAGLOWKI_16[STAN_16.widok];
  el16("nZlozone").textContent = zlozone16().length;
  el16("chipy16").hidden = zlozoneWidok;
  el16("subTab").textContent = lista.length + " z " + W.length + (zlozoneWidok ? " złożonych wniosków" : " projektów instytucji");
  el16("wiersze").innerHTML = lista.length ? wiersze16(lista, zlozoneWidok ? wierszZlozonego16 : wierszWniosku16) :
    '<tr><td colspan="8"><div class="empty"><div class="ei">&#9788;</div>' +
    '<div class="et">Brak wyników w Twoim katalogu</div>Wyszukiwarka nie sięga poza dane tej instytucji.</div></td></tr>';
}

function przelaczWidok16(widok) {
  STAN_16.widok = widok;
  Array.prototype.forEach.call(document.querySelectorAll("#zakladki16 a"), function (a) {
    a.classList.toggle("on", a.getAttribute("data-widok") === widok);
  });
  renderKlienci16();
}

function podepnijFiltry16() {
  el16("szukaj").addEventListener("input", renderKlienci16);
  Array.prototype.forEach.call(document.querySelectorAll(".chip[data-f]"), function (c) {
    c.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".chip[data-f]"), function (x) { x.classList.remove("on"); });
      c.classList.add("on");
      STAN_16.filtr = c.getAttribute("data-f");
      renderKlienci16();
    });
  });
}
