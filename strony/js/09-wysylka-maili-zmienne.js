/* Wysylka maili: katalog zmiennych szablonow (spotkanie 14.10.2026). Uzytkownik wybiera zmienne
   z listy wszystkich danych klienta i wniosku w bazie przyciskiem "Wstaw zmienna". Kazda zmienna
   ma klucz w nawiasach klamrowych, etykiete, grupe i funkcje wartosci liczona z kontekstu wniosku.
   Kwoty tylko dla konta z funkcja finanse.kwoty_wniosku. Do uczestnikow szkolen nic nie wysylamy,
   wiec nie ma zmiennych z adresem uczestnika. Tylko deklaracje. */

var GRUPY_ZMIENNYCH_09 = ["Klient (wnioskodawca)", "Wniosek i szkolenie", "Kwoty wniosku", "Instytucja szkoleniowa", "LDIT"];
var FUNKCJA_KWOT_09 = "finanse.kwoty_wniosku";
var LINK_OPINII_09 = "https://g.page/r/ldit-szkolenia/review";

function pierwszyKontakt09(w) {
  return (w.kontakty || []).filter(function (c) { return c.osoba || c.mail || c.tel; })[0] || {};
}
function urzadKlienta09(kl) {
  var p = DB.PUPY.filter(function (x) { return x.id === kl.pup; })[0];
  return p ? p.nazwa : undefined;
}
function data09(iso) { return iso ? DB.fmtDate(iso) : undefined; }
function kwota09(v) { return v == null ? undefined : DB.fmtPLN2(v); }
function imieLdit09(login) { return (DB.ZESPOL_LDIT || {})[login] || undefined; }

/* Kontekst jednego adresata: wniosek z klientem, instytucja, szkoleniem glownym, terminem i naborem */
function kontekstZmiennych09(w) {
  var kl = klientWniosku(w);
  return {
    w: w, kl: kl,
    inst: DB.INSTYTUCJE.filter(function (i) { return i.id === w.is; })[0] || {},
    szk: DB.SZKOLENIA.filter(function (s) { return s.id === w.szkId; })[0] || {},
    termin: terminWniosku(w), nabor: naborWniosku(w), kontakt: pierwszyKontakt09(w)
  };
}

/* [klucz, etykieta, grupa (indeks w GRUPY_ZMIENNYCH_09), wartosc(c)]. undefined = brak danych */
var ZMIENNE_09 = [
  ["klient.nazwaSkrocona", "Nazwa firmy skrócona", 0, function (c) { return c.kl.nazwaSkrocona || c.w.klNazwa; }],
  ["klient.nazwa", "Nazwa firmy pełna", 0, function (c) { return c.w.klNazwaPelna || c.kl.nazwa; }],
  ["klient.nip", "NIP", 0, function (c) { return c.w.nip || c.kl.nip; }],
  ["klient.osoba", "Osoba do kontaktu", 0, function (c) { return c.kontakt.osoba || c.kl.osoba; }],
  ["klient.telefon", "Telefon osoby do kontaktu", 0, function (c) { return c.kontakt.tel || c.kl.tel; }],
  ["klient.mail", "E-mail firmy (adresat)", 0, function (c) { return adresMaila(c.w); }],
  ["klient.telefonBiura", "Telefon do biura", 0, function (c) { return c.kl.telBiura; }],
  ["klient.adres", "Adres siedziby", 0, function (c) { return c.kl.adres || c.kl.miasto; }],
  ["klient.miasto", "Miejscowość", 0, function (c) { return c.kl.miasto; }],
  ["klient.reprezentant", "Osoba reprezentująca firmę", 0, function (c) {
    var r = (c.kl.reprezentanci || [])[0];
    return r && r.osoba ? r.osoba + (r.stanowisko ? ", " + r.stanowisko : "") : undefined;
  }],
  ["klient.wielkosc", "Wielkość przedsiębiorstwa", 0, function (c) { return c.w.wielkosc || c.kl.wielkosc; }],
  ["klient.urzad", "Urząd pracy klienta", 0, function (c) { return urzadKlienta09(c.kl) || c.w.pupNazwa; }],
  ["projekt.nr", "Numer wniosku", 1, function (c) { return c.w.nr != null ? String(c.w.nr) : c.w.id; }],
  ["projekt.pup", "Urząd pracy wniosku", 1, function (c) { return c.w.pupNazwa; }],
  ["projekt.szkolenie", "Szkolenie (główne)", 1, function (c) { return c.w.szkolenie !== "-" ? c.w.szkolenie : undefined; }],
  ["projekt.szkolenia", "Wszystkie szkolenia wniosku", 1, function (c) {
    var n = (c.w.szkoleniaWniosku || []).map(function (s) { return s.nazwa; });
    return n.length ? n.filter(function (x, i) { return n.indexOf(x) === i; }).join(", ") : undefined;
  }],
  /* Daty z pozycji wniosku, jak kolumna Termin szkolenia na liscie wnioskow (feedback makiety 19.10.2026) */
  ["termin.szkolenia", "Termin szkolenia (od - do)", 1, function (c) {
    return c.w.szkolenieOd ? DB.fmtZakresDat(c.w.szkolenieOd, c.w.szkolenieDo) : c.termin ? DB.fmtZakresDat(c.termin.od, c.termin.do) : undefined;
  }],
  ["termin.od", "Termin szkolenia od", 1, function (c) { return data09(c.w.szkolenieOd || (c.termin && c.termin.od)); }],
  ["termin.do", "Termin szkolenia do", 1, function (c) { return data09(c.w.szkolenieDo || (c.termin && c.termin.do)); }],
  ["termin.miejsce", "Miejsce szkolenia", 1, function (c) { return c.termin ? c.termin.miejsce : undefined; }],
  ["projekt.osobZakwalifikowanych", "Liczba osób z dofinansowaniem", 1, function (c) { return String(c.w.osobZakw); }],
  ["projekt.listaUczestnikow", "Uczestnicy zakwalifikowani (imiona i nazwiska)", 1, function (c) {
    var n = c.w.uczestnicy.filter(function (u) { return u.status === "zakwalifikowany"; }).map(function (u) { return u.imie; });
    return n.length ? n.join(", ") : undefined;
  }],
  ["projekt.dataZlozenia", "Data złożenia wniosku", 1, function (c) { return data09(c.w.dataWniosku); }],
  ["projekt.decyzja", "Decyzja urzędu", 1, function (c) { return c.w.statusDec || undefined; }],
  ["nabor.do", "Koniec naboru w urzędzie", 1, function (c) { return c.nabor ? data09(c.nabor.do) : undefined; }],
  ["szkolenie.tryb", "Tryb szkolenia", 1, function (c) { return c.szk.tryb; }],
  ["szkolenie.godziny", "Liczba godzin szkolenia", 1, function (c) { return c.szk.godz ? String(c.szk.godz) : undefined; }],
  ["szkolenie.dni", "Liczba dni szkolenia", 1, function (c) { return c.szk.dni ? String(c.szk.dni) : undefined; }],
  ["projekt.kwotaWnioskowana", "Wartość wnioskowana", 2, function (c) { return kwota09(c.w.kwotaWnioskowana); }],
  ["projekt.przyznano", "Kwota przyznana", 2, function (c) { return kwota09(c.w.przyznano); }],
  ["projekt.wkladWlasny", "Wkład własny", 2, function (c) { return kwota09(c.w.wklad); }],
  ["projekt.cenaCalkowita", "Cena całkowita szkolenia", 2, function (c) { return kwota09(c.w.calkowita); }],
  ["projekt.cenaJednostkowa", "Cena za osobę", 2, function (c) { return c.szk.cena ? kwota09(c.szk.cena) : undefined; }],
  ["projekt.procentDofinansowania", "Procent dofinansowania", 2, function (c) { return c.w.procent != null ? DB.fmtPct(c.w.procent) : undefined; }],
  ["instytucja.nazwa", "Nazwa instytucji", 3, function (c) { return c.w.isNazwa; }],
  ["instytucja.osoba", "Osoba kontaktowa instytucji", 3, function (c) { return c.inst.kontakt; }],
  ["instytucja.mail", "E-mail instytucji", 3, function (c) { return c.inst.mail; }],
  ["instytucja.telefon", "Telefon instytucji", 3, function (c) { return c.inst.tel; }],
  ["ldit.podpis", "Osoba podpisująca z LDIT (wysyłający)", 4, function () { return Auth.sesja().imie; }],
  ["ldit.opiekunWniosku", "Opiekun wniosku w LDIT", 4, function (c) {
    var n = (c.w.opiekunowie || []).map(imieLdit09).filter(Boolean);
    return n.length ? n.join(", ") : undefined;
  }],
  ["opiekun.imie", "Opiekun instytucji w LDIT", 4, function (c) { return c.w.opiekun !== "-" ? c.w.opiekun : undefined; }],
  ["link.opinieGoogle", "Link do opinii Google", 4, function () { return LINK_OPINII_09; }]
];

/* Zgodnosc ze starymi szablonami: klucze, ktore wskazuja na te same dane */
var ALIASY_ZMIENNYCH_09 = { "instytucja.mailTerminy": "instytucja.mail", "projekt.odbiorcaFV": "klient.osoba" };

function kwotyDostepne09() { return Auth.moze(FUNKCJA_KWOT_09); }

/* Zmienne widoczne dla konta: grupa kwot tylko z prawem do kwot wniosku */
function zmienneKonta09() {
  return ZMIENNE_09.filter(function (z) { return z[2] !== 2 || kwotyDostepne09(); }).map(function (z) {
    return { klucz: "{" + z[0] + "}", etykieta: z[1], grupa: GRUPY_ZMIENNYCH_09[z[2]] };
  });
}

/* Mapa {klucz} -> wartosc dla wniosku. Kwoty bez uprawnienia zostaja niepodstawione. */
function mapaPlaceholderow(w) {
  var c = kontekstZmiennych09(w), mapa = {}, kwoty = kwotyDostepne09();
  ZMIENNE_09.forEach(function (z) {
    if (z[2] === 2 && !kwoty) return;
    var v = z[3](c);
    mapa["{" + z[0] + "}"] = v == null || v === "" ? undefined : String(v);
  });
  Object.keys(ALIASY_ZMIENNYCH_09).forEach(function (a) { mapa["{" + a + "}"] = mapa["{" + ALIASY_ZMIENNYCH_09[a] + "}"]; });
  return mapa;
}

var WZOR_ZMIENNEJ_09 = /\{[a-zA-Z.]+\}/g;

function podstaw(txt, w) {
  if (!w) return txt;
  var mapa = mapaPlaceholderow(w);
  return String(txt || "").replace(WZOR_ZMIENNEJ_09, function (m) { return mapa[m] != null ? mapa[m] : m; });
}

/* Zmienne, ktorych nie dalo sie uzupelnic (brak danych albo uprawnien): do poprawki recznej */
function brakujaceZmienne09(txt) {
  var znalezione = String(txt || "").match(WZOR_ZMIENNEJ_09) || [];
  return znalezione.filter(function (x, i) { return znalezione.indexOf(x) === i; });
}
