/* Wysylka maili: dane adresata i podstawianie placeholderow w tresci szablonu */

/* Adres mailowy adresata (D-178): najpierw e-mail osoby kontaktowej z wniosku,
   a gdy wniosek go nie ma, e-mail klienta. Wniosek i klient sa laczeni po kluczu klient_id. */
function klientWniosku(w) {
  return DB.KLIENCI.filter(function (k) { return k.id === w.klient; })[0] || {};
}
function adresMaila(w) {
  var zWniosku = w.kontakty.filter(function (c) { return c.mail; })[0];
  return (zWniosku && zWniosku.mail) || klientWniosku(w).mail || "";
}

/* Termin szkolenia wniosku: ten na szkolenie glowne, a gdy go nie ma, najblizszy termin instytucji */
function terminWniosku(w) {
  var terminy = DB.TERMINY.filter(function (x) { return x.is === w.is; })
    .sort(function (a, b) { return a.od < b.od ? -1 : 1; });
  return terminy.filter(function (x) { return x.szk === w.szkId; })[0] || terminy[0] || null;
}
/* Nabor ogloszony urzedu wniosku: jeden na urzad, z widoku v_urzedy_nabory (D-272) */
function naborWniosku(w) {
  var p = DB.PUPY.filter(function (x) { return x.id === w.pup; })[0];
  return p ? p.nabor : null;
}

function mapaPlaceholderow(w) {
  var kl = klientWniosku(w);
  var inst = DB.INSTYTUCJE.filter(function (i) { return i.id === w.is; })[0] || {};
  var szk = DB.SZKOLENIA.filter(function (s) { return s.id === w.szkId; })[0] || {};
  var termin = terminWniosku(w), nabor = naborWniosku(w);
  return {
    "{klient.nazwa}": w.klNazwa,
    "{klient.nip}": w.nip,
    "{klient.mail}": adresMaila(w),
    "{klient.adres}": kl.miasto || undefined,
    "{projekt.nr}": w.id,
    "{projekt.pup}": w.pupNazwa,
    "{projekt.szkolenie}": w.szkolenie,
    "{projekt.osobZakwalifikowanych}": String(w.osobZakw),
    "{projekt.cenaJednostkowa}": DB.fmtPLN2(szk.cena || 0),
    "{projekt.cenaCalkowita}": DB.fmtPLN2(w.calkowita),
    "{projekt.odbiorcaFV}": kl.osoba || "",
    "{projekt.procentDofinansowania}": DB.fmtPct(w.procent),
    "{projekt.listaUczestnikow}": w.uczestnicy.filter(function (u) { return u.status === "zakwalifikowany"; })
                                    .map(function (u) { return u.imie; }).join(", "),
    "{instytucja.nazwa}": w.isNazwa,
    "{instytucja.mail}": inst.mail || "",
    "{instytucja.mailTerminy}": inst.mail || "",
    "{szkolenie.tryb}": szk.tryb || "",
    "{szkolenie.godziny}": String(szk.godz || ""),
    "{szkolenie.dni}": String(szk.dni || ""),
    "{termin.od}": termin ? DB.fmtDate(termin.od) : undefined,
    "{termin.do}": termin ? DB.fmtDate(termin.do) : undefined,
    "{termin.miejsce}": termin ? termin.miejsce : undefined,
    "{nabor.do}": nabor ? DB.fmtDate(nabor.do) : undefined,
    "{uczestnik.mail}": adresMaila(w),
    "{opiekun.imie}": w.opiekun
  };
}

function podstaw(txt, w) {
  if (!w) return txt;
  var mapa = mapaPlaceholderow(w);
  return txt.replace(/\{[a-zA-Z.]+\}/g, function (m) { return mapa[m] != null ? String(mapa[m]) : m; });
}
