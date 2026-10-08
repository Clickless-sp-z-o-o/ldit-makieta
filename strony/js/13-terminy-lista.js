/* Ekran Terminy: lista terminow z uczestnikami i zakladki.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- Lista terminow ---------- */
function tagSt(s, t) {
  if (t && obsada13(t).stan === "przekroczony" && s === "Wolny") return '<span class="tag neg dot">Przekroczony limit</span>';
  if (s === "Zaplanowany") return '<span class="tag info dot">Zaplanowany</span>';
  if (s === "Wolny") return '<span class="tag pos dot">Wolny</span>';
  return '<span class="tag set dot">Odbyty</span>';
}
function przyciskiTerminu(t, idx) {
  var akcje = '<button class="btn xs" onclick="rozwin(' + idx + ')">Uczestnicy</button>';
  if (moznaEdytowac()) {
    akcje += '<button class="btn xs" onclick="edytujTermin(\'' + escJs(t.id) + '\')">Edytuj</button>' +
      '<button class="btn xs" onclick="usunTermin(\'' + escJs(t.id) + '\')">Usuń</button>';
  }
  return '<div class="btn-row" style="justify-content:flex-end">' + akcje + '</div>';
}
function listaOsob(t) {
  var osoby = STAN_13.uczestnicyPoTerminie[t.id] || [];
  if (!osoby.length) return '<div class="muted small">Nikt nie jest przypisany do tego terminu.</div>';
  return '<div class="btn-row">' + osoby.map(function (o) {
    return '<span class="pill" title="' + esc(o.klient + ", " + o.wniosek_id) + '">' + esc(o.imie_nazwisko) +
      ' <span class="muted">(' + esc(o.klient) + ')</span></span>';
  }).join("") + '</div>';
}
function wierszTerminu(t, idx) {
  var o = obsada13(t);
  var pct = t.limit ? Math.min(100, Math.round(o.n / t.limit * 100)) : 0;
  var klasaPaska = o.stan === "przekroczony" ? " neg" : o.stan === "komplet" ? " pos" : "";
  return '<tr>' +
      '<td class="mono strong">' + esc(t.id) + '</td>' +
      '<td class="strong nowrap">' + esc(t.nazwa) + '<div class="small muted">' + esc(t.szk) + '</div></td>' +
      '<td class="nowrap">' + esc(nazwaIS(t.is)) + '</td>' +
      '<td class="mono nowrap">' + esc(DB.fmtDate(t.od)) + '</td>' +
      '<td class="mono nowrap">' + esc(DB.fmtDate(t.do)) + '</td>' +
      '<td class="nowrap muted">' + esc(t.miejsce) + '</td>' +
      '<td class="nowrap">' + tagSt(t.status, t) + '</td>' +
      '<td><div class="progress' + klasaPaska + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="small ' + (o.stan === "przekroczony" ? "przekroczenie" : "muted") + '" style="margin-top:4px">' +
        esc(tekstObsady13(t)) + '</div></td>' +
      '<td class="right nowrap">' + przyciskiTerminu(t, idx) + '</td>' +
    '</tr>' +
    '<tr class="osoby" id="os' + idx + '" style="display:none"><td colspan="9">' +
      '<div class="small strong" style="margin-bottom:2px">' + esc(t.nazwa) + '</div>' +
      '<div class="small muted" style="margin-bottom:6px">Uczestnicy przypisani do terminu ' + esc(t.id) +
      ' &middot; ' + esc(t.miejsce) + '</div>' + listaOsob(t) +
      '<div class="small muted mt16">Każdy uczestnik pochodzi z konkretnego projektu. ' +
      'Zmiana terminu wymaga pisma do urzędu pracy i powiadomienia uczestników.</div>' +
    '</td></tr>';
}
function renderLista() {
  var q = el("q").value.toLowerCase().trim();
  var fis = Wielowybor.wartosci(el("fIS2")), fst = Wielowybor.wartosci(el("fSt"));
  var lista = STAN_13.T.filter(function (t) {
    if (!Wielowybor.pasuje(fis, t.is)) return false;
    if (!Wielowybor.pasuje(fst, t.status)) return false;
    if (q && (t.nazwa + " " + t.miejsce + " " + t.id + " " + tekstFirmTerminu(t)).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }).sort(function (a, b) { return (a.od || "") < (b.od || "") ? -1 : 1; });

  el("licz").innerHTML = "<b>" + lista.length + "</b> z " + STAN_13.T.length + " terminów &middot; przypisanych uczestników: <b>" +
    lista.reduce(function (s, t) { return s + zapisani(t); }, 0) + "</b>";

  el("body").innerHTML = lista.length ? lista.map(function (t) {
    return t.id === STAN_13.edytowany ? wierszEdycji(t) : wierszTerminu(t, STAN_13.T.indexOf(t));
  }).join("") : '<tr><td colspan="9"><div class="empty"><div class="et">Brak terminów</div>Żaden termin nie spełnia filtrów.</div></td></tr>';
}
function rozwin(idx) {
  var tr = el("os" + idx);
  tr.style.display = tr.style.display === "none" ? "table-row" : "none";
}

function przelaczZakladke13(zakladka) {
  document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
  document.querySelectorAll(".tab-pane").forEach(function (x) { x.classList.remove("on"); });
  zakladka.classList.add("on");
  el(zakladka.dataset.t).classList.add("on");
}
