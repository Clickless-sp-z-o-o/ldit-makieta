/* Konfigurator instytucji: zakladka danych do faktury. Tylko deklaracje. */
function tekstMailaFaktury(dane) {
  return "Dzień dobry, proszę o wystawienie faktur dla Klientów:\n\n" +
    "Nazwa Klienta: " + dane.klient + "\n" +
    "Adres siedziby: " + dane.adres + "\n" +
    "NIP: " + dane.nip + "\n\n" +
    "Imię i nazwisko odbiorcy FV: " + dane.odbiorca + "\n\n" +
    "Szkolenie: " + dane.szkolenie + "\n" +
    "Ilość osób: " + dane.osob + "\n" +
    "Cena jedn.: " + DB.fmtPLN2(dane.cenaJedn) + "\n" +
    "Cena całk.: " + DB.fmtPLN2(dane.cenaJedn * dane.osob) + "\n" +
    "VAT: ZW\n" +
    "Termin płatności: 14 dni od wystawienia\n\n" +
    "Uwagi:\n" +
    "- Usługa zwolniona z podatku VAT na podstawie § 3 ust. 1 pkt 14 Rozporządzenia Ministra Finansów " +
    "z dnia 20 grudnia 2013 r. w sprawie zwolnień od podatku od towarów i usług oraz warunków stosowania " +
    "tych zwolnień (Dz. U. z 2020 r. poz. 1983). Szkolenie finansowane w " + dane.procent + " z Krajowego Funduszu Szkoleniowego.\n" +
    "- Uczestnicy: " + dane.uczestnicy + "\n" +
    "- Termin: " + dane.termin;
}

function daneDoFakturyRender(i, wn, ctx) {
  var wzor = wn.filter(function (w) { return w.statusDec === "Pozytywna"; })[0] || wn[0];
  var kl = wzor ? DB.KLIENCI.filter(function (k) { return k.id === wzor.klient; })[0] : null;
  var klRow = wzor ? Store.find("klienci", wzor.klient) : null;
  var procent = wzor && wzor.procent != null ? DB.fmtPct(wzor.procent) : "-";
  var osob = wzor ? wzor.osobZakw : 0;

  var dane = {
    klient: kl ? kl.nazwa : "", nip: kl ? kl.nip : "", odbiorca: kl ? kl.osoba : "",
    adres: klRow ? [klRow.adres_siedziby, klRow.miasto].filter(Boolean).join(", ") : "",
    szkolenie: wzor ? wzor.szkolenie : ctx.szk.nazwa, osob: osob, procent: procent,
    cenaJedn: wzor && wzor.uczestnicy.length ? wzor.uczestnicy[0].kwota : ctx.szk.cena,
    uczestnicy: wzor ? wzor.uczestnicy.filter(function (u) { return u.status === "zakwalifikowany"; })
      .map(function (u) { return u.imie; }).join(", ") : "",
    termin: ctx.terminTxt
  };

  document.getElementById("mailFakt").innerHTML =
    '<div class="mh"><div class="r"><b>Do</b><span>' + esc(i.mail) + "</span></div>" +
      '<div class="r"><b>Od</b><span>powiadomienia@ldit.pl</span></div>' +
      '<div class="r"><b>Temat</b><span>Dane do faktury, klient nr ' + esc(wzor ? wzor.nr : "-") + ", " + esc(dane.klient || "-") + "</span></div></div>" +
    '<div class="mb">' + esc(tekstMailaFaktury(dane)) + "</div>";

  document.getElementById("uwagaProc").innerHTML = wzor
    ? '<div class="note" style="margin-top:14px;margin-bottom:0">Klient wzorcowy: <b>' + esc(wzor.wielkosc) +
      "</b>, procent finansowania <b>" + esc(procent) + "</b> pochodzi z progu dofinansowania wniosku.</div>" : "";

  var konta = DB.UZYTKOWNICY.filter(function (u) { return u.inst === i.nazwa; });
  document.getElementById("odbiorcaFakt").innerHTML =
    ["<option>" + esc(i.kontakt) + " (" + esc(i.mail) + ")</option>"]
      .concat(konta.map(function (u) { return "<option>" + esc(u.imie) + " (" + esc(u.login) + ")</option>"; })).join("");
}
