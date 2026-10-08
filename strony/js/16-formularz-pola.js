/* Pola formularza zgloszeniowego klienta (D-256, D-257) w sekcjach jak w formularzu klienta.
   Wspolne dla panelu instytucji (16), Nowy formularz (21) i ekranu Do akceptacji (20).
   Nazwy kolumn sa takie same jak w tabelach klienci i formularze_oczekujace. Helpery
   zfPole, zfWybor, zfSiatka, zfEl lezą w 16-formularz-zgloszenia.js (wywolywane w czasie dzialania). */

var ZADLUZENIA_ZF = [["brak", "NIE"], ["zus", "TAK: ZUS"], ["us", "TAK: US"], ["zus_us", "TAK: ZUS i US"],
                     ["inne", "TAK: inne (np. wynagrodzenia pracowników)"]];
var TAK_NIE_ZF = [["1", "TAK"], ["0", "NIE"]];

/* [kolumna, etykieta, typ]. Typ: tekst (domyslnie), calk, dzies, textarea, wielkosc, pup, szkolenie, zadluzenie, ugoda, takNie */
var SEKCJE_ZF = [
  { tytul: "Dane firmy", pola: [["firma", "Nazwa firmy"], ["nip", "NIP firmy"], ["adres_siedziby", "Adres siedziby"], ["miasto", "Miasto"],
    ["telefon_biura", "Numer telefonu do biura firmy"], ["email_firmy", "Adres e-mail firmy"],
    ["wielkosc", "Wielkość", "wielkosc"], ["pup_id", "Urząd pracy", "pup"]] },
  { tytul: "Osoba do kontaktu", pola: [["kontakt", "Imię i nazwisko osoby do kontaktu"], ["stanowisko_kontaktowej", "Stanowisko osoby do kontaktu"],
    ["telefon", "Numer telefonu osoby do kontaktu"], ["email", "Adres e-mail osoby do kontaktu"]] },
  { tytul: "Rachunek bankowy", pola: [["nazwa_banku", "Nazwa banku"], ["numer_konta", "Numer firmowego rachunku bankowego"]] },
  { tytul: "Zatrudnienie i opodatkowanie", pola: [
    ["liczba_zatrudnionych", "Liczba zatrudnionych pracowników w ramach umowy o pracę", "calk"],
    ["etaty", "Liczba zatrudnionych na umowę o pracę w przeliczeniu na etaty", "dzies"],
    ["liczba_innych_umow", "Liczba zatrudnionych pracowników wykonujących pracę w oparciu o inne umowy", "calk"],
    ["forma_opodatkowania", "Forma opodatkowania prowadzonej działalności"], ["stawka_podatku", "Odpowiedni % podatku", "dzies"]] },
  { tytul: "Osoby uprawnione do reprezentacji i podpisania dokumentacji", pola: [
    ["reprezentant_1", "Imię i nazwisko osoby uprawnionej"], ["reprezentant_1_stanowisko", "Stanowisko tej osoby"],
    ["reprezentant_2", "Imię i nazwisko drugiej osoby uprawnionej"], ["reprezentant_2_stanowisko", "Stanowisko drugiej osoby"]] },
  { tytul: "Zobowiązania i konto na praca.gov.pl", pola: [
    ["zadluzenie", "Czy firma posiada nieuregulowane zobowiązania? (np. ZUS, US, wynagrodzenia pracowników)", "zadluzenie"],
    ["zadluzenie_ugoda", "Czy zostało zawarte porozumienie bądź ugoda?", "ugoda"],
    ["konto_praca_gov", "Czy posiada konto organizacji na praca.gov.pl? Konto musi być zweryfikowane.", "takNie"]] },
  { tytul: "Szkolenie i uwagi", pola: [["szkolenie", "Szkolenie", "szkolenie"], ["uwagi", "Uwagi dla LDIT", "textarea"]] }
];

function zfDefinicjePol() {
  var lista = [];
  SEKCJE_ZF.forEach(function (s) { s.pola.forEach(function (p) { lista.push({ k: p[0], e: p[1], typ: p[2] || "tekst" }); }); });
  return lista;
}

function zfPoleZDefinicji(p, o) {
  var id = "zf_" + p.k;
  if (p.typ === "wielkosc") return zfWybor(id, p.e, WIELKOSCI_ZF.map(function (w) { return [w, w]; }), "");
  if (p.typ === "pup") return zfWybor(id, p.e, DB.PUPY.map(function (u) { return [u.id, u.nazwa]; }), "");
  if (p.typ === "szkolenie") return zfWybor(id, p.e, o.szkolenia || [], "");
  if (p.typ === "zadluzenie") return zfWybor(id, p.e, ZADLUZENIA_ZF, "");
  if (p.typ === "ugoda") return '<div id="zfUgodaBlok" hidden>' + zfWybor(id, p.e, TAK_NIE_ZF, "") + '</div>';
  if (p.typ === "takNie") return zfWybor(id, p.e, TAK_NIE_ZF, "");
  if (p.typ === "textarea") return zfPole(id, p.e, "", "textarea");
  return zfPole(id, p.e, "", p.typ === "calk" ? "number" : "");
}

function zfSekcjeHtml(o) {
  return SEKCJE_ZF.map(function (s) {
    return '<div class="small strong" style="margin-top:12px;margin-bottom:6px">' + esc(s.tytul) + '</div>' +
      zfSiatka(s.pola.map(function (p) { return zfPoleZDefinicji({ k: p[0], e: p[1], typ: p[2] || "tekst" }, o); }));
  }).join("");
}

/* Pytanie o ugode ma sens tylko przy odpowiedzi TAK na zobowiazania (D-256) */
function zfPrzelaczUgode() {
  var zadluzenie = zfEl("zf_zadluzenie").value;
  zfEl("zfUgodaBlok").hidden = !zadluzenie || zadluzenie === "brak";
}

function zfWartoscPola(p) {
  var v = zfEl("zf_" + p.k).value.trim();
  if (v === "") return null;
  if (p.typ === "calk") return parseInt(v, 10);
  if (p.typ === "dzies") return parseFloat(v.replace("%", "").replace(",", "."));
  if (p.typ === "ugoda" || p.typ === "takNie") return parseInt(v, 10);
  return v;
}

/* Kolumny formularza gotowe do Akceptacje.zglosFormularz (bez uczestnikow i zrodla) */
function zfOdczytajPola() {
  var dane = {};
  zfDefinicjePol().forEach(function (p) { dane[p.k] = zfWartoscPola(p); });
  var zadluzenie = dane.zadluzenie;
  if (!zadluzenie || zadluzenie === "brak") dane.zadluzenie_ugoda = null;
  return dane;
}

function zfZnajdzOpcje(pole, tekst) {
  var szukany = normalizujCsv(tekst);
  var opcje = Array.prototype.slice.call(zfEl(pole).options);
  return opcje.filter(function (o) { return o.value && (normalizujCsv(o.text) === szukany || normalizujCsv(o.value) === szukany); })[0] || null;
}

function zfUstawPole(kolumna, wartosc) {
  var polaWybor = { wielkosc: "wielkosc", pup_nazwa: "pup_id", szkolenie: "szkolenie" };
  if (polaWybor[kolumna]) {
    var opcja = zfZnajdzOpcje("zf_" + polaWybor[kolumna], wartosc);
    if (opcja) zfEl("zf_" + polaWybor[kolumna]).value = opcja.value;
    return;
  }
  var pole = zfEl("zf_" + kolumna);
  if (pole) pole.value = typeof wartosc === "number" && pole.tagName === "SELECT" ? String(wartosc) : wartosc;
}

/* Wynik parsera CSV (16-formularz-csv.js) do pol formularza; zwraca liczbe wypelnionych pol */
function zfWypelnijPola(firma) {
  var kolumny = Object.keys(firma);
  kolumny.forEach(function (k) { zfUstawPole(k, firma[k]); });
  zfPrzelaczUgode();
  return kolumny.length;
}
