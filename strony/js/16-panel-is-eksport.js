/* Panel instytucji: eksport klientow instytucji do CSV, do importu w jej systemach (D-251).
   Separator ; i BOM UTF-8, zeby Excel poprawnie czytal polskie znaki. Zakres: tylko klienci
   tej instytucji, widoczni dla konta (filtr w warstwie danych). */

var NAGLOWKI_EKSPORTU_16 = ["numer", "nazwa", "NIP", "miasto", "adres", "osoba", "telefon", "e-mail", "urząd", "wielkość", "liczba zatrudnionych"];
var TELEFON_16 = /^[+\-]?[\d\s()\-]+$/;

/* Komorka CSV: cudzyslowy i separator, ochrona przed formulami arkusza (=, @, +, - poza numerami telefonu) */
function komorkaCsv16(wartosc) {
  var t = wartosc == null ? "" : String(wartosc);
  if (/^[=+\-@\t\r]/.test(t) && !TELEFON_16.test(t)) t = "'" + t;
  return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

function nazwyUrzedow16(klient) {
  var glowny = DB.PUPY.filter(function (p) { return p.id === klient.pup; })[0];
  var nazwy = glowny ? [glowny.nazwa] : [];
  (klient.urzedy || []).forEach(function (u) {
    var p = DB.PUPY.filter(function (x) { return x.id === u.pup; })[0];
    if (p && nazwy.indexOf(p.nazwa) < 0) nazwy.push(p.nazwa);
  });
  return nazwy.join(", ");
}

/* Zwraca tekst CSV z BOM UTF-8, jeden wiersz na klienta */
function csvKlientow16(klienci) {
  var wiersze = klienci.map(function (k) {
    return [k.nr, k.nazwa, k.nip, k.miasto, k.adres, k.osoba, k.tel, k.mail, nazwyUrzedow16(k), k.wielkosc, k.zatrudnienie].map(komorkaCsv16).join(";");
  });
  return "\uFEFF" + [NAGLOWKI_EKSPORTU_16.map(komorkaCsv16).join(";")].concat(wiersze).join("\r\n") + "\r\n";
}

function eksportujKlientow16() {
  var blob = new Blob([csvKlientow16(STAN_16.KL)], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "klienci-" + STAN_16.inst.id + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function podepnijEksport16() {
  el16("btnEksportKlientow").hidden = !Auth.moze("klienci.eksport");
}
