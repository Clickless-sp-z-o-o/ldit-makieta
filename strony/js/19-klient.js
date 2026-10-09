/* Ekran 19: karta klienta. Dane firmy, wszystkie jej wnioski i korespondencja.
   Klient spoza zakresu konta nie trafia do DB.KLIENCI (assets/zakres.js), wiec
   karta cudzego klienta konczy sie komunikatem "nie znaleziono". Same deklaracje. */

var STAN_19 = { kl: null };

function el19(id) { return document.getElementById(id); }

function nazwaInstytucji19(id) {
  var i = DB.INSTYTUCJE.filter(function (x) { return x.id === id; })[0];
  return i ? i.nazwa : null;
}

/* Klient nalezy do jednej instytucji (D-282) */
function instytucjeKlienta(idKlienta) {
  var k = Store.find("klienci", idKlienta);
  var nazwa = k ? nazwaInstytucji19(k.instytucja_id) : null;
  return nazwa ? [nazwa] : [];
}

function wierszWniosku19(w) {
  var brak = '<span class="muted">-</span>';
  return '<tr class="' + Statusy.klasaWiersza(w) + '" data-id="' + esc(w.id) + '">' +
    '<td class="strong mono nowrap">' + esc(w.id) + '</td>' +
    '<td class="nowrap">' + esc(w.rok || "bez roku") + '</td>' +
    '<td><div class="tnij" title="' + esc(w.isNazwa) + '">' + esc(w.isNazwa) + '</div></td>' +
    '<td><div class="tnij" title="' + esc(w.szkolenie) + '">' + esc(w.szkolenie) + '</div></td>' +
    '<td class="num">' + (w.przyznano != null ? DB.fmtPLN(w.przyznano) : brak) + '</td>' +
    '<td>' + Statusy.znacznik(w) + '</td>' +
    '<td>' + Statusy.znacznikRozliczenia(w) + '</td>' +
    '<td class="small muted nowrap">' + esc(w.etap) + '. ' + esc(Statusy.ETAPY[w.etap] || "") + '</td></tr>';
}

function renderWnioski19() {
  var lista = DB.WNIOSKI_WSZYSTKIE
    .filter(function (w) { return w.klient === STAN_19.kl.id; })
    .sort(function (a, b) { return (b.rok || "") < (a.rok || "") ? -1 : 1; });
  el19("subWnioski").textContent = lista.length + " ze wszystkich lat";
  el19("wnioski").innerHTML = lista.length ? lista.map(wierszWniosku19).join("")
    : '<tr><td colspan="8" class="muted">Klient nie ma jeszcze wniosków.</td></tr>';
}

function renderMaile19() {
  var maile = DB.MAILE.filter(function (m) { return m.klient === STAN_19.kl.id; });
  el19("maile").innerHTML = maile.length ? maile.map(function (m) {
    return '<tr><td>' + (m.kier === "in" ? '<span class="tag info">&#8600;</span>' : '<span class="tag mute">&#8599;</span>') + '</td>' +
      '<td class="strong">' + esc(m.temat) + '</td><td class="small muted">' + esc(m.skrz) + '</td>' +
      '<td class="small nowrap">' + esc(DB.fmtDate(m.data)) + '</td>' +
      '<td class="c">' + (m.zal ? '<span class="pill">' + esc(m.zal) + '</span>' : '<span class="muted">-</span>') + '</td></tr>';
  }).join("") : '<tr><td colspan="5" class="muted">Brak korespondencji tego klienta.</td></tr>';
}

/* Notatki klienta (tabela notatki). Czytane wprost z bazy, wiec zawezamy je sami: notatka
   bez instytucji (wewnetrzna LDIT) albo instytucji z zakresu konta. */
function renderNotatki19() {
  var notatki = Store.query("SELECT * FROM notatki_klienta WHERE klient_id = ? ORDER BY czas DESC", [STAN_19.kl.id])
    .filter(function (n) { return !n.instytucja_id ? Auth.instytucje() === null : Auth.wZakresie(n.instytucja_id); });
  el19("notatkaForm").style.display = mozeEdytowac19() ? "flex" : "none";
  el19("notatki").innerHTML = notatki.length ? notatki.map(function (n) {
    return '<div style="border-bottom:1px solid var(--line);padding:8px 0"><div class="small muted">' + esc(DB.fmtDate(n.czas)) + " · " +
      esc(imieKonta19(n.autor_id)) + '</div><div style="white-space:pre-line">' + esc(n.tresc) + '</div></div>';
  }).join("") : '<div class="small muted">Brak notatek.</div>';
}
function imieKonta19(id) {
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === id; })[0];
  return u ? u.imie : (id || "-");
}
function dodajNotatke19() {
  var tresc = el19("nowaNotatka").value.trim();
  if (!tresc) { el19("nowaNotatka").focus(); return; }
  var kto = Akceptacje.ktoTeraz();
  /* Notatka nalezy do instytucji klienta w zakresie konta (kl.is po separacji danych) */
  Store.insert("notatki_klienta", { klient_id: STAN_19.kl.id, instytucja_id: STAN_19.kl.is, czas: kto.czas,
                            autor_id: kto.uzytkownik, tresc: tresc }, "NOT-");
  el19("nowaNotatka").value = "";
}

/* Klik w wniosek: karta wniosku, a jej okruszek wraca na te karte klienta */
function klikWniosku19(e) {
  var tr = e.target.closest("tr[data-id]");
  if (tr) location.href = Nawigacja.adresKarty(tr.dataset.id, "19-klient.html" + Nawigacja.zbudujZapytanie({ id: STAN_19.kl.id }));
}

function inicjuj19() {
  var id = Nawigacja.odczytajZapytanie(location.search, ["id"]).id;
  el19("btnWstecz").addEventListener("click", function () { Nawigacja.wstecz("04-baza-klientow.html"); });
  STAN_19.kl = DB.KLIENCI.filter(function (k) { return k.id === id; })[0] || null;
  if (!STAN_19.kl) {
    el19("tytul").textContent = "Nie znaleziono klienta";
    document.querySelectorAll("#stronaKlienta .grid, #stronaKlienta > .card, #btnEdytuj, #btnEksportKlienta, #btnZlozWniosek, #licznikBrakow, #znacznikCzarnej").forEach(function (x) { x.remove(); });
    return;
  }
  podepnijEdycje19();
  podepnijUczestnikow19();
  el19("btnEksportKlienta").addEventListener("click", function () { KlientEksport.pobierz(STAN_19.kl.id); });
  el19("wnioski").addEventListener("click", klikWniosku19);
  window.addEventListener("db:changed", function () {
    STAN_19.kl = DB.KLIENCI.filter(function (k) { return k.id === id; })[0] || STAN_19.kl;
    renderDane19(); renderWnioski19(); renderMaile19(); renderNotatki19(); renderUczestnicy19(); renderUrzedy19();
  });
  el19("btnNotatka").addEventListener("click", dodajNotatke19);
  renderDane19();
  renderWnioski19();
  renderMaile19();
  renderNotatki19();
  renderUczestnicy19();
  renderUrzedy19();
}
