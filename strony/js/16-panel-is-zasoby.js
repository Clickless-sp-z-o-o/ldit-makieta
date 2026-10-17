/* Panel instytucji: zakladki Terminy szkolen i Katalog szkolen (tylko deklaracje) */

/* Terminy szkolen instytucji w zakladce panelu. Handlowiec (D-210) widzi tylko terminy wnioskow swoich
   klientow, bo nie ma modulu Terminy i nie powinien poznawac klientow innych handlowcow (spotkanie 14.10.2026). */
function terminyPanelu16() {
  if (!Auth.handlowiec()) return STAN_16.TR;
  var moje = {};
  STAN_16.W.forEach(function (w) {
    (w.szkoleniaWniosku || []).forEach(function (s) { if (s.termin) moje[s.termin] = true; });
    (w.uczestnicy || []).forEach(function (u) { if (u.termin) moje[u.termin] = true; });
  });
  return STAN_16.TR.filter(function (t) { return moje[t.id]; });
}

function wierszTerminu16(t) {
  var klasa = t.status === "Wolny" ? "pos" : t.status === "Zaplanowany" ? "info" : "mute";
  return '<tr><td class="strong">' + esc(t.nazwa) + '</td><td class="nowrap">' + esc(DB.fmtDate(t.od)) + '</td><td class="nowrap">' + esc(DB.fmtDate(t.do)) +
    '</td><td class="small">' + esc(t.miejsce || "-") + '</td><td><span class="tag ' + klasa + ' dot">' + esc(t.status || "-") + '</span></td>' +
    '<td class="num">' + esc(t.zapisani == null ? "-" : t.zapisani) + (t.limit ? '<span class="muted small"> / ' + esc(t.limit) + "</span>" : "") + "</td></tr>";
}

function renderTerminy16() {
  var TR = terminyPanelu16().slice().sort(function (a, b) { return String(a.od).localeCompare(String(b.od)); });
  var wolne = TR.filter(function (t) { return t.status === "Wolny"; }).length;
  var zaplanowane = TR.filter(function (t) { return t.status === "Zaplanowany"; }).length;
  el16("nTerminy16").textContent = TR.length;
  el16("linkTerminy16").hidden = !Auth.widziModul("terminy");
  el16("podsTerminy").textContent = TR.length ? TR.length + " terminów: " + zaplanowane + " zaplanowanych, " + wolne + " wolnych, " +
    (TR.length - zaplanowane - wolne) + " odbytych" : "";
  el16("terminy16").innerHTML = TR.length ? TR.map(wierszTerminu16).join("") :
    '<tr><td colspan="6"><div class="empty"><div class="et">Brak terminów</div>' +
    (Auth.handlowiec() ? "Twoi klienci nie mają jeszcze przypisanych terminów." : "Instytucja nie ma jeszcze wystawionych terminów.") + "</div></td></tr>";
}

/* Katalog szkolen; zmiany przez akceptacje LDIT w 16-panel-is-katalog.js (D-320) */
function wierszSzkolenia16(s) {
  var ile = STAN_16.W.filter(function (w) { return w.szkId === s.id; }).length;
  return '<tr>' +
    '<td class="strong">' + esc(s.nazwa) + '</td>' +
    '<td class="num">' + esc(s.godz) + '</td>' +
    '<td class="num">' + esc(s.dni) + '</td>' +
    '<td><span class="pill w">' + esc(s.tryb) + '</span></td>' +
    '<td class="num">' + (s.ceny.length ? s.ceny.map(DB.fmtPLN).join(", ") : "brak") + '</td>' +
    '<td class="num">' + ile + '</td><td class="right nowrap">' + akcjeSzkolenia16(s) + '</td></tr>';
}

function renderKatalog16() {
  el16("szkolenia").innerHTML = STAN_16.SZ.length ? wiersze16(STAN_16.SZ, wierszSzkolenia16) :
    '<tr><td colspan="7"><div class="empty"><div class="et">Katalog pusty</div>Instytucja nie ma jeszcze szkoleń w katalogu.</div></td></tr>';
}
