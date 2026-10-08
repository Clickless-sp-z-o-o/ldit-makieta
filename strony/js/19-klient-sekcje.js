/* Ekran 19, widok danych klienta w sekcjach: Firma, Osoba do kontaktu, Rachunek, Zatrudnienie, Podatki,
   Reprezentacja, Zobowiazania, Konto na praca.gov.pl (D-256, D-257) oraz status klienta i nabor.
   Brakujace pola sa szare ("brak"), a naglowek pokazuje licznik pol do uzupelnienia. Tylko deklaracje. */

var BRAK_19 = '<span class="muted" style="font-style:italic">brak</span>';

/* Urzad klienta z najblizszym naborem ogloszonym i prognoza (v_urzedy_nabory, D-272) */
function naborUrzedu(kl) {
  var pup = DB.PUPY.filter(function (p) { return p.id === kl.pup; })[0];
  return { pup: pup ? pup.nazwa : "-", nabor: pup ? pup.nabor : null, prognoza: pup ? pup.prognoza : null };
}

function opisNaboru19(urzad) {
  var n = urzad.nabor, p = urzad.prognoza;
  var czesci = [];
  if (n) czesci.push("nabór " + esc(n.status) + (n.do ? ", do " + esc(DB.fmtDate(n.do)) : ""));
  if (p) czesci.push("prognoza " + esc(p.opis || DB.fmtDate(p.od)));
  return czesci.join("; ") || "brak danych";
}

function liczbaTekst19(w) { return String(w).replace(".", ","); }

function zobowiazaniaTekst19(wiersz) {
  if (KlientPola.pusty(wiersz.zadluzenie)) return BRAK_19;
  if (!KlientPola.tak(wiersz.zadluzenie)) return "NIE";
  var ugoda = wiersz.zadluzenie_ugoda == null ? BRAK_19 : (wiersz.zadluzenie_ugoda === 1 ? "tak" : "nie");
  return "TAK, " + esc(KlientLogika.etykieta(KlientLogika.ZADLUZENIA, wiersz.zadluzenie)) + '<div class="small">Porozumienie lub ugoda: ' + ugoda + "</div>";
}

/* Wartosc pola do wyswietlenia, puste pole to szare "brak" */
function wartoscPola19(d, wiersz) {
  var w = wiersz[d.kol];
  if (d.typ === "zob") return zobowiazaniaTekst19(wiersz);
  if (d.typ === "kolejny") return w ? '<span class="tag pos">zainteresowany</span>' : '<span class="tag mute">nie</span>';
  if (KlientPola.pusty(w)) return BRAK_19;
  if (d.typ === "tn") return w === 1 ? "tak" : "nie";
  if (d.typ === "pup") return esc(nazwaUrzedu19(w));
  if (d.typ === "dziesietna") return esc(liczbaTekst19(w)) + (d.kol === "stawka_podatku" ? " %" : "");
  if (d.typ === "email" || d.typ === "tel") return esc(w);
  if (d.kol === "numer_konta" || d.kol === "nip") return '<span class="mono">' + esc(w) + "</span>";
  return esc(w);
}

function wierszeSekcji19(s, wiersz) {
  var pola = s.zob ? s.pola.slice(0, 1) : s.pola;
  return pola.filter(function (d) {
    /* Kolejne osoby kontaktowe i drugi reprezentant pokazujemy tylko, gdy sa wypelnieni */
    var opcjonalne = !d.wym && /_[23]$|^reprezentant_2/.test(d.kol);
    return !opcjonalne || !KlientPola.pusty(wiersz[d.kol]);
  }).map(function (d) {
    return "<dt" + (d.tip ? ' data-tip="' + esc(d.tip) + '"' : "") + ">" + esc(d.etyk) + "</dt><dd>" + wartoscPola19(d, wiersz) + "</dd>";
  }).join("");
}

function kartaSekcji19(s, wiersz) {
  return '<div class="card"><div class="card-head"><h3>' + esc(s.tytul) + '</h3>' +
    '<span class="tip-mark" data-tip="' + esc(s.tip) + '">i</span></div>' +
    '<div class="card-body"><dl class="dl">' + wierszeSekcji19(s, wiersz) + "</dl></div></div>";
}

/* Numer klienta, instytucje, urzad i nabor oraz czarna lista: stan klienta w systemie, nie dane z formularza */
function kartaStatusu19(kl) {
  var urzad = naborUrzedu(kl);
  var nabor = opisNaboru19(urzad);
  var wiersze = [
    ["Numer klienta", "<b>" + esc(kl.nr) + "</b>"],
    ["Instytucje", instytucjeKlienta(kl.id).map(esc).join(", ") || "brak"],
    ["Nabór w urzędzie", nabor],
    ["Czarna lista", czarnaListaHtml19(kl)]
  ];
  return '<div class="card"><div class="card-head"><h3>Status w systemie</h3></div><div class="card-body"><dl class="dl">' +
    wiersze.filter(function (r) { return r[1] !== null; })
      .map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl></div></div>";
}

function renderLicznikBrakow19(wiersz) {
  var braki = KlientPola.braki(wiersz);
  var el = el19("licznikBrakow");
  el.style.display = braki.length ? "" : "none";
  el.textContent = "uzupełnij " + braki.length + " " + (braki.length === 1 ? "pole" : braki.length < 5 ? "pola" : "pól");
  el.dataset.tip = "Brakuje: " + braki.join(", ") + ". Pola uzupełnisz przyciskiem Edytuj dane (D-256).";
}

function renderDane19() {
  var kl = STAN_19.kl;
  var wiersz = Store.find("klienci", kl.id);
  el19("sekcjeDanych").innerHTML = KlientPola.SEKCJE.map(function (s) { return kartaSekcji19(s, wiersz); }).join("") + kartaStatusu19(kl);
  el19("tytul").textContent = kl.nazwa;
  el19("znacznikCzarnej").innerHTML = kl.czarnaLista ? '<span class="tag neg">Widnieje na czarnej liście</span>' : "";
  renderLicznikBrakow19(wiersz);
  document.title = "Karta klienta · " + kl.nazwa;
}
