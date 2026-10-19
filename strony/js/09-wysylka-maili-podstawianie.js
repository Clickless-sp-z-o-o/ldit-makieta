/* Wysylka maili: dane adresata wniosku (adres, klient, termin, nabor). Katalog zmiennych
   i podstawianie sa w 09-wysylka-maili-zmienne.js (spotkanie 14.10.2026). Tylko deklaracje. */

/* Adres mailowy adresata (D-178): najpierw e-mail osoby kontaktowej z wniosku,
   a gdy wniosek go nie ma, e-mail klienta. Wniosek i klient sa laczeni po kluczu klient_id.
   Zawsze firma (wnioskodawca): do uczestnikow szkolen nic nie wysylamy (spotkanie 14.10.2026). */
function klientWniosku(w) {
  return DB.KLIENCI.filter(function (k) { return k.id === w.klient; })[0] || {};
}
function adresMaila(w) {
  var zWniosku = w.kontakty.filter(function (c) { return c.mail; })[0];
  return (zWniosku && zWniosku.mail) || klientWniosku(w).mail || "";
}

/* Termin z kalendarza dla wniosku: termin przypisany uczestnikom wniosku, a gdy go nie ma, najblizszy termin
   szkolenia glownego w tej instytucji. Nigdy termin innego szkolenia: w mailu "dane do faktury" trafilby
   na fakture (feedback makiety 19.10.2026). Daty samego wniosku (pozycje) ma zmienna termin.szkolenia. */
function terminWniosku(w) {
  var terminy = DB.TERMINY.filter(function (x) { return x.is === w.is; })
    .sort(function (a, b) { return a.od < b.od ? -1 : 1; });
  var uczestnikow = (w.uczestnicy || []).map(function (u) { return u.termin; }).filter(Boolean);
  return terminy.filter(function (x) { return uczestnikow.indexOf(x.id) >= 0; })[0] ||
    terminy.filter(function (x) { return x.szk === w.szkId; })[0] || null;
}
/* Nabor ogloszony urzedu wniosku: jeden na urzad, z widoku v_urzedy_nabory (D-272) */
function naborWniosku(w) {
  var p = DB.PUPY.filter(function (x) { return x.id === w.pup; })[0];
  return p ? p.nabor : null;
}

/* Adres "Do" maila: wzorzec szablonu ({klient.mail}, {instytucja.mail} albo stały adres) po podstawieniu */
function adresDoMaila09(wzor, w) {
  var adres = podstaw(wzor, w);
  return brakujaceZmienne09(adres).length ? "" : adres;
}
