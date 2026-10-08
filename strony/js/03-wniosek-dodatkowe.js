/* Ekran Wniosek: urzad pracy wniosku (D-238), wykonawca (D-258), wartosc wnioskowana (D-259), kto przygotowal
   (D-233) i opiekunowie (D-260), dokumenty (D-263), podpowiedz liczby zatrudnionych z klienta (D-169, D-235).
   Wartosci zapisuje przycisk Zapisz razem z reszta.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

/* Kolejnosc chronologiczna: umowa, faktura, certyfikat (D-263). Recznie zaznacza sie tylko umowe;
   faktura i certyfikat wynikaja z tabel faktur i certyfikatow (D-290, 03-wniosek-certyfikaty.js). */
var FLAGI_DOKUMENTOW = [
  ["umowa_wystawiona", "chUmowa", "Umowa z urzędem pracy podpisana przez klienta", "umowa"]
];

function klientWniosku() {
  return DB.KLIENCI.filter(function (k) { return k.id === STAN_03.w.klient; })[0] || null;
}
function nazwaUrzedu(id) {
  var p = DB.PUPY.filter(function (x) { return x.id === id; })[0];
  return p ? p.nazwa : id;
}
function opcjaUrzedu(id, opis, wybrany) {
  return '<option value="' + esc(id) + '"' + (id === wybrany ? " selected" : "") + '>' + esc(opis) + '</option>';
}

/* Urzedy klienta: glowny i dodatkowe z oddzialami, potem rubryka "inny PUP" ze wszystkimi pozostalymi */
function renderUrzadWniosku() {
  var kl = klientWniosku();
  var wybrany = STAN_03.raw.pup_id;
  var urzedyKlienta = [];
  if (kl && kl.pup) urzedyKlienta.push({ pup: kl.pup, opis: nazwaUrzedu(kl.pup) + " (główny)" });
  (kl ? kl.urzedy : []).forEach(function (u) {
    urzedyKlienta.push({ pup: u.pup, opis: nazwaUrzedu(u.pup) + (u.oddzial ? ", oddział " + u.oddzial : "") });
  });
  var znane = urzedyKlienta.map(function (u) { return u.pup; });
  var inne = DB.PUPY.filter(function (p) { return znane.indexOf(p.id) < 0; });
  el("selPupWniosku").innerHTML =
    '<optgroup label="Urzędy klienta">' + urzedyKlienta.map(function (u) { return opcjaUrzedu(u.pup, u.opis, wybrany); }).join("") + '</optgroup>' +
    '<optgroup label="Inny PUP">' + inne.map(function (p) { return opcjaUrzedu(p.id, p.nazwa, wybrany); }).join("") + '</optgroup>';
  el("selPupWniosku").value = wybrany || "";
}

function renderPrzygotowal() {
  var konta = SzkoleniaWniosku.kontaLdit();
  var aktualny = STAN_03.raw.przygotowal_id;
  if (aktualny && !konta.some(function (k) { return k.id === aktualny; })) konta.push({ id: aktualny, imie: aktualny });
  el("selPrzygotowal").innerHTML = '<option value="">nie wskazano</option>' + konta.map(function (k) {
    return opcjaUrzedu(k.id, k.imie, aktualny);
  }).join("");
  el("selPrzygotowal").value = aktualny || "";
}

/* Pola wyboru dokumentow rysuje start ekranu raz, tu tylko ustawiamy stan */
function narysujDokumenty() {
  el("dokumentyWniosku").innerHTML = FLAGI_DOKUMENTOW.map(function (f) {
    return '<label class="small" style="display:flex;gap:8px;align-items:center;font-weight:400;margin-bottom:6px">' +
      '<input type="checkbox" id="' + f[1] + '"> ' + esc(f[2]) + '</label>';
  }).join("") + '<div id="dokumentyWyliczane"></div>';
}

function renderDokumenty() {
  FLAGI_DOKUMENTOW.forEach(function (f) { el(f[1]).checked = STAN_03.raw[f[0]] === 1; });
  el("dokumentyWyliczane").innerHTML = opisDokumentow03(STAN_03.w);
}

/* Liczba zatrudnionych: wniosek trzyma wartosc na swoj dzien, a gdy jest pusta, podpowiadamy ja z klienta */
function podpowiedzZatrudnienia() {
  var kl = klientWniosku();
  var zKlienta = kl ? kl.zatrudnienie : null;
  el("hintZatrudnieni").innerHTML =
    (zKlienta != null ? 'W karcie klienta: <b>' + esc(zKlienta) + '</b>. ' : 'W karcie klienta brak liczby zatrudnionych. ') +
    'Dane klienta edytuje się w <a href="04-baza-klientow.html' +
    esc(Nawigacja.zbudujZapytanie({ q: STAN_03.w.klNazwa, wnioski: "wszystkie", edytuj: STAN_03.w.klient })) +
    '">Bazie klientów</a>, tu zapisuje się wartość na dzień wniosku (D-169).';
  if (STAN_03.raw.liczba_zatrudnionych == null && zKlienta != null) el("fZatrudnieni").value = zKlienta;
}

function formatKwoty(v) { return v == null ? "" : String(v).replace(".", ","); }

function renderWykonawcaIWartosc() {
  el("fWykonawca").value = STAN_03.w.wykonawca || "";
  el("fWartoscWnioskowana").value = formatKwoty(STAN_03.w.kwotaWnioskowana);
  renderHintWartosci03();
}

/* Opiekunowie: wybor wielokrotny z kont LDIT (D-260), zapis do wniosek_opiekunowie przy Zapisz */
function renderOpiekunowie() {
  var wybor = el("selOpiekunowie");
  var wybrani = SzkoleniaWniosku.opiekunowieWniosku(STAN_03.w.id);
  var konta = SzkoleniaWniosku.kontaLdit();
  wybrani.forEach(function (id) { if (!konta.some(function (k) { return k.id === id; })) konta.push({ id: id, imie: id }); });
  wybor.innerHTML = konta.map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.imie) + '</option>'; }).join("");
  Wielowybor.ustaw(wybor, wybrani);
}

function renderDodatkowe() {
  renderUrzadWniosku();
  renderWykonawcaIWartosc();
  renderOpiekunowie();
  renderPrzygotowal();
  renderDokumenty();
  podpowiedzZatrudnienia();
}

/* Zmiany z pol tej czesci karty: tylko to, co sie zmienilo, z wpisami do rejestru */
function zbierzDodatkowe() {
  var patch = {}, wpisy = [], bledy = [];
  function zmien(kolumna, etykieta, przed, po, poTekst) {
    patch[kolumna] = po;
    wpisy.push({ pole: etykieta, przed: przed, po: poTekst == null ? po : poTekst });
  }
  var pup = el("selPupWniosku").value;
  if (pup && pup !== STAN_03.raw.pup_id) zmien("pup_id", "Urząd pracy", nazwaUrzedu(STAN_03.raw.pup_id), pup, nazwaUrzedu(pup));
  var wykonawca = el("fWykonawca").value.trim() || null;
  if (wykonawca !== (STAN_03.raw.wykonawca || null)) zmien("wykonawca", "Wykonawca", STAN_03.raw.wykonawca, wykonawca);
  var wartosc = el("fWartoscWnioskowana").value.trim() === "" ? null : SzkoleniaWniosku.parsujKwote(el("fWartoscWnioskowana").value);
  if (el("fWartoscWnioskowana").value.trim() !== "" && wartosc === null) bledy.push("Wartość wnioskowana to kwota nie mniejsza niż 0.");
  else if (wartosc !== (STAN_03.w.kwotaWnioskowana == null ? null : STAN_03.w.kwotaWnioskowana)) {
    /* Reczna Wartosc wylacza regule sumy szkolen (D-281, D-19) */
    zmien("kwota_wnioskowana", "Wartość wnioskowana", STAN_03.w.kwotaWnioskowana, wartosc);
    patch.kwota_regula_aktywna = 0;
  }
  var przyg = el("selPrzygotowal").value || null;
  if (przyg !== (STAN_03.raw.przygotowal_id || null)) zmien("przygotowal_id", "Przygotował", STAN_03.raw.przygotowal_id, przyg);
  FLAGI_DOKUMENTOW.forEach(function (f) {
    var nowa = el(f[1]).checked ? 1 : 0;
    if (nowa !== (STAN_03.raw[f[0]] || 0)) zmien(f[0], f[2], STAN_03.raw[f[0]] ? "tak" : "nie", nowa, nowa ? "tak" : "nie");
  });
  return { patch: patch, wpisy: wpisy, bledy: bledy };
}
