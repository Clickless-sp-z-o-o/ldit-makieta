/* Nabory: rejestr urzedow pracy, jeden wiersz na urzad (D-272). Kolumny naboru ogloszonego
   i prognozy pochodza z widoku v_urzedy_nabory (DB.PUPY), wiec slownik urzedow sie nie dubluje.
   Klik w urzad z klientami otwiera tych klientow w Bazie danych. Tylko deklaracje. */

function wypelnijWojewodztwa05() {
  var sel = el05("fWoj");
  var woj = {};
  DB.PUPY.forEach(function (p) { woj[p.woj] = true; });
  sel.innerHTML = Object.keys(woj).sort().map(function (w) { return '<option value="' + esc(w) + '">' + esc(w) + '</option>'; }).join("");
}

function komorkaOgloszonego05(p) {
  if (!p.nabor) return '<span class="muted">&mdash;</span>';
  var n = p.nabor;
  return tagStat(n) + ' <span class="small mono">' + esc(DB.fmtDate(n.od)) + " &ndash; " + esc(DB.fmtDate(n.do)) +
    (n.dni ? " (" + n.dni + " dni)" : "") + "</span>" + (n.srodki ? '<div class="small muted">' + esc(n.srodki) + "</div>" : "");
}

function komorkaPrognozy05(p) {
  if (!p.prognoza) return '<span class="muted">&mdash;</span>';
  return '<span class="small">' + esc(p.prognoza.opis || DB.fmtDate(p.prognoza.od)) + "</span>";
}

function renderUrzedy05() {
  var q = el05("qUrzad").value.toLowerCase().trim();
  var woj = Wielowybor.wartosci(el05("fWoj"));
  var lista = DB.PUPY.filter(function (p) {
    if (!Wielowybor.pasuje(woj, p.woj)) return false;
    return !q || (p.nazwa + " " + p.powiat + " " + p.woj + " " + p.aliasy.join(" ")).toLowerCase().indexOf(q) >= 0;
  });
  var mozeBaze = Auth.widziModul("dofin");
  el05("liczUrzedy").innerHTML = "<b>" + lista.length + "</b> z " + DB.PUPY.length + " urzędów";
  el05("urzedy").innerHTML = lista.map(function (p) {
    var n = STAN_05.klienciPoPup[p.id] || 0;
    var link = mozeBaze && n ? ' data-href="' + esc("04-baza-klientow.html" + Nawigacja.zbudujZapytanie({ pup: p.id, wnioski: "wszystkie" })) + '"' : "";
    return '<tr' + link + '><td class="strong">' + esc(p.nazwa) + '</td><td class="muted">' + esc(p.powiat) + '</td>' +
      '<td class="muted">' + esc(p.woj) + '</td><td>' + komorkaOgloszonego05(p) + '</td><td>' + komorkaPrognozy05(p) + '</td>' +
      '<td class="num strong">' + n + '</td></tr>';
  }).join("") || '<tr><td colspan="6" class="small muted">Brak urzędów dla tych filtrów.</td></tr>';
}

function podepnijUrzedy05() {
  wypelnijWojewodztwa05();
  ["qUrzad", "fWoj"].forEach(function (id) {
    el05(id).addEventListener("input", renderUrzedy05);
    el05(id).addEventListener("change", renderUrzedy05);
  });
  Nawigacja.podlaczLinki(el05("urzedy"));
  renderUrzedy05();
}
