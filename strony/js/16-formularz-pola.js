/* Pola formularza zgloszeniowego klienta (D-256, D-257) w sekcjach jak w formularzu LDIT w Excelu:
   jedno pole w wierszu, etykieta po lewej, wartosc po prawej (spotkanie 14.10.2026).
   Wspolne dla panelu instytucji (16), Nowy formularz (21) i ekranu Do akceptacji (20, podglad).
   Nazwy kolumn sa takie same jak w tabelach klienci i formularze_oczekujace. Helpery
   zfPole, zfWybor, zfWiersz, zfArkusz, zfEl leza w 16-formularz-zgloszenia.js (wywolywane w czasie dzialania).
   Tu tez nazwa skrocona i atrapa pobierania danych z GUS po NIP (gusPobierz, uzywa jej tez karta klienta 19)
   oraz podglad formularza w tych samych wierszach (Do akceptacji). Same deklaracje. */

/* Zobowiazania (spotkanie 14.10): tylko TAK/NIE, rodzaj (ZUS, US) LDIT nie interesuje.
   Stare wartosci 'zus', 'us', 'zus_us', 'inne' to TAK (zfZadluzenieTak). */
var ZADLUZENIA_ZF = [["tak", "TAK"], ["brak", "NIE"]];
var TAK_NIE_ZF = [["1", "TAK"], ["0", "NIE"]];

/* [kolumna, etykieta, typ]. Typ: tekst (domyslnie), calk, dzies, textarea, wielkosc, pup, szkolenie, zadluzenie, ugoda, takNie,
   nip (z przyciskiem GUS), skrocona (kopia pelnej nazwy) */
var SEKCJE_ZF = [
  { tytul: "Dane firmy", pola: [["firma", "Nazwa firmy", "wym"], ["nazwa_skrocona", "Nazwa skrócona (na listach)", "skrocona"],
    ["nip", "NIP firmy", "nip"], ["adres_siedziby", "Adres siedziby"], ["miasto", "Miasto"],
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
    ["zadluzenie", "Czy firma posiada nieuregulowane zobowiązania?", "zadluzenie"],
    ["zadluzenie_ugoda", "Czy zostało zawarte porozumienie bądź ugoda?", "ugoda"],
    ["konto_praca_gov", "Czy posiada konto organizacji na praca.gov.pl? Konto musi być zweryfikowane.", "takNie"]] },
  { tytul: "Szkolenie i uwagi", pola: [["szkolenie", "Szkolenie", "szkolenie"], ["uwagi", "Uwagi dla LDIT", "textarea"]] }
];

function zfDefinicjePol() {
  var lista = [];
  SEKCJE_ZF.forEach(function (s) { s.pola.forEach(function (p) { lista.push({ k: p[0], e: p[1], typ: p[2] || "tekst" }); }); });
  return lista;
}

/* 'tak' i stare rodzaje (zus, us, zus_us, inne) to odpowiedz TAK; 'brak' to NIE; puste to brak odpowiedzi */
function zfZadluzenieTak(v) { return v != null && v !== "" && v !== "brak"; }

function zfPoleZDefinicji(p, o) {
  var id = "zf_" + p.k;
  if (p.typ === "wielkosc") return zfWybor(id, p.e, WIELKOSCI_ZF.map(function (w) { return [w, w]; }), "");
  if (p.typ === "pup") return zfWybor(id, p.e, DB.PUPY.map(function (u) { return [u.id, u.nazwa]; }), "");
  if (p.typ === "szkolenie") return zfWybor(id, p.e, o.szkolenia || [], "");
  if (p.typ === "zadluzenie") return zfWybor(id, p.e, ZADLUZENIA_ZF, "");
  if (p.typ === "ugoda") return zfWybor(id, p.e, TAK_NIE_ZF, "", false, { idWiersza: "zfUgodaBlok", ukryty: true });
  if (p.typ === "takNie") return zfWybor(id, p.e, TAK_NIE_ZF, "");
  if (p.typ === "textarea") return zfPole(id, p.e, "", "textarea");
  if (p.typ === "wym") return zfPole(id, p.e, "", "", { wymagane: true });
  if (p.typ === "nip") return zfPole(id, p.e, "", "", { wymagane: true, dodatek: zfPrzyciskGus() });
  if (p.typ === "skrocona") return zfPole(id, p.e, "", "", { podpowiedz: "kopiuje się z nazwy firmy, możesz ją skrócić" });
  return zfPole(id, p.e, "", p.typ === "calk" ? "number" : "");
}

function zfSekcjeHtml(o) {
  return SEKCJE_ZF.map(function (s) {
    return zfArkusz(s.tytul, s.pola.map(function (p) { return zfPoleZDefinicji({ k: p[0], e: p[1], typ: p[2] || "tekst" }, o); }));
  }).join("");
}

/* Pytanie o ugode ma sens tylko przy odpowiedzi TAK na zobowiazania (D-256) */
function zfPrzelaczUgode() {
  zfEl("zfUgodaBlok").hidden = !zfZadluzenieTak(zfEl("zf_zadluzenie").value);
}

function zfWartoscPola(p) {
  var v = zfEl("zf_" + p.k).value.trim();
  if (v === "") return null;
  if (p.typ === "calk") return parseInt(v, 10);
  if (p.typ === "dzies") return parseFloat(v.replace("%", "").replace(",", "."));
  if (p.typ === "ugoda" || p.typ === "takNie") return parseInt(v, 10);
  return v;
}

/* Kolumny formularza gotowe do Akceptacje.zglosFormularz (bez uczestnikow i zrodla).
   Pusta nazwa skrocona to kopia pelnej nazwy (spotkanie 14.10). */
function zfOdczytajPola() {
  var dane = {};
  zfDefinicjePol().forEach(function (p) { dane[p.k] = zfWartoscPola(p); });
  if (!zfZadluzenieTak(dane.zadluzenie)) dane.zadluzenie_ugoda = null;
  dane.nazwa_skrocona = dane.nazwa_skrocona || dane.firma;
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
  if (kolumna === "firma") { zfUstawNazwe(wartosc); return; }
  if (kolumna === "zadluzenie") wartosc = zfZadluzenieTak(wartosc) ? "tak" : wartosc;
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

/* ------------------------------ nazwa skrocona (spotkanie 14.10) ------------------------------ */

/* Pole nazwy skroconej pamieta w data-zrodlo pelna nazwe, z ktorej jest kopia: dopoki uzytkownik
   jej nie zmienil (albo jest pusta), idzie za pelna nazwa; skrocona recznie zostaje. */
function zfNadazSkrocona(skrocona, pelna) {
  if (!skrocona) return;
  if (!skrocona.value.trim() || skrocona.value === skrocona.getAttribute("data-zrodlo")) skrocona.value = pelna;
  skrocona.setAttribute("data-zrodlo", pelna);
}

function zfUstawNazwe(nazwa) {
  zfEl("zf_firma").value = nazwa;
  zfNadazSkrocona(zfEl("zf_nazwa_skrocona"), nazwa);
}

/* ------------------------------ dane z GUS (atrapa) ------------------------------ */

function zfPrzyciskGus() {
  return '<button type="button" class="btn xs" onclick="zfPobierzZGus()" data-tip="W aplikacji dane przyjdą z rejestru REGON GUS. W makiecie to atrapa.">Pobierz dane z GUS</button>' +
    '<div class="zf-info" id="zfGusInfo" role="status"></div>';
}

/* Nazwa, adres i miasto z GUS nadpisuja pola, nazwa skrocona idzie za nazwa, wszystko mozna dalej edytowac */
function zfPobierzZGus() {
  var wynik = gusPobierz(zfEl("zf_nip").value);
  var info = zfEl("zfGusInfo");
  info.textContent = wynik.komunikat;
  info.style.color = wynik.ok ? "var(--pos-ink)" : "var(--neg-ink)";
  if (!wynik.ok) return;
  zfUstawNazwe(wynik.dane.nazwa);
  if (wynik.dane.adres_siedziby) zfEl("zf_adres_siedziby").value = wynik.dane.adres_siedziby;
  if (wynik.dane.miasto) zfEl("zf_miasto").value = wynik.dane.miasto;
}

var GUS_NAZWY = ["Bałtyk", "Kaszuby", "Wektor", "Orlik", "Amber", "Mewa", "Granit", "Lazur", "Sokół", "Polana"];
var GUS_BRANZE = ["Logistyka", "Serwis", "Technika", "Produkcja", "Handel", "Instal", "Druk", "Transport", "Medica", "Budownictwo"];
var GUS_FORMY = ["sp. z o.o.", "sp.j.", "S.A.", "sp. z o.o. sp.k.", "s.c."];
var GUS_ULICE = ["Długa", "Grunwaldzka", "Kościuszki", "Morska", "Polna", "Słowackiego", "Lipowa", "Portowa", "Szkolna", "Leśna"];
var GUS_MIASTA = [["Gdańsk", "80"], ["Gdynia", "81"], ["Kościerzyna", "83"], ["Warszawa", "00"], ["Kraków", "30"],
                  ["Poznań", "60"], ["Wrocław", "50"], ["Łódź", "90"], ["Szczecin", "70"], ["Słupsk", "76"]];
var GUS_DOPISEK = " W aplikacji dane przyjdą z rejestru REGON GUS.";

/* Dane demonstracyjne wyliczone z cyfr NIP: ten sam NIP daje zawsze te same dane */
function gusDaneDemo(cyfry) {
  var d = cyfry.split("").map(Number);
  var miasto = GUS_MIASTA[d[5]];
  return {
    nazwa: GUS_NAZWY[d[3]] + " " + GUS_BRANZE[d[4]] + " " + GUS_FORMY[(d[6] + d[7]) % GUS_FORMY.length],
    adres_siedziby: "ul. " + GUS_ULICE[d[8]] + " " + (d[7] * 10 + d[9] + 1) + ", " + miasto[1] + "-" + d[6] + d[8] + d[9],
    miasto: miasto[0]
  };
}

/* Atrapa API REGON GUS: poprawny NIP, firma o tym NIP wsrod klientow widocznych dla konta (DB.KLIENCI,
   po separacji danych), a gdy jej nie ma, dane demonstracyjne. Zwraca { ok, komunikat, dane, zrodlo }. */
function gusPobierz(nip) {
  var cyfry = String(nip || "").replace(/\D/g, "");
  if (!String(nip || "").trim()) return { ok: false, komunikat: "Wpisz NIP firmy, żeby pobrać dane z GUS." };
  var bledy = Walidacja.bledy("klienci", { nip: nip });
  if (bledy.length) return { ok: false, komunikat: "Nie pobrano danych: " + bledy[0].komunikat + ". Sprawdź NIP." };
  var klient = DB.KLIENCI.filter(function (k) { return String(k.nip || "").replace(/\D/g, "") === cyfry; })[0];
  if (klient) {
    return { ok: true, zrodlo: "baza", dane: { nazwa: klient.nazwa, adres_siedziby: klient.adres || "", miasto: klient.miasto || "" },
      komunikat: "Makieta: dane z Bazy klientów (firma o tym NIP jest już klientem)." + GUS_DOPISEK + " Pola możesz poprawić." };
  }
  return { ok: true, zrodlo: "demo", dane: gusDaneDemo(cyfry),
    komunikat: "Makieta: dane demonstracyjne wyliczone z NIP." + GUS_DOPISEK + " Pola możesz poprawić." };
}

/* ------------------------------ podglad formularza (Do akceptacji) ------------------------------ */

function zfTekstPodgladu(p, w) {
  var v = w[p.k];
  if (p.typ === "ugoda" && !zfZadluzenieTak(w.zadluzenie)) return '<span class="muted">nie dotyczy</span>';
  if (v == null || v === "") return "";
  if (p.typ === "zadluzenie") return zfZadluzenieTak(v) ? "TAK" : "NIE";
  if (p.typ === "ugoda" || p.typ === "takNie") return v === 1 || v === "1" ? "TAK" : "NIE";
  if (p.typ === "pup") return esc((DB.PUPY.filter(function (u) { return u.id === v; })[0] || { nazwa: v }).nazwa);
  if (p.typ === "dzies") return esc(String(v).replace(".", ",")) + (p.k === "stawka_podatku" ? "%" : "");
  if (p.k === "numer_konta" || p.k === "nip") return '<span class="mono">' + esc(v) + "</span>";
  return esc(v);
}

/* Formularz w tych samych sekcjach i wierszach co przy wpisywaniu. w = wiersz formularze_oczekujace,
   opcje.wartosci: { kolumna: html } zamiast domyslnego tekstu (np. NIP do poprawy), opcje.pomin: [tytul sekcji] */
function zfPodgladHtml(w, opcje) {
  var o = opcje || {};
  zfWczytajStyl();
  return SEKCJE_ZF.filter(function (s) { return (o.pomin || []).indexOf(s.tytul) < 0; }).map(function (s) {
    return zfArkusz(s.tytul, s.pola.map(function (d) {
      var p = { k: d[0], e: d[1], typ: d[2] || "tekst" };
      var html = o.wartosci && p.k in o.wartosci ? o.wartosci[p.k] : zfTekstPodgladu(p, w);
      return zfWiersz("", p.e, html || '<span class="muted">brak</span>');
    }));
  }).join("");
}
