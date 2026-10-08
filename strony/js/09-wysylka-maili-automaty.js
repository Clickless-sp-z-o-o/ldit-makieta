/* Wysylka maili, zakladka 3: katalog automatyzacji, odbiorcy alertu faktur i alert 8 dni przed szkoleniem */
var AUTOMATY = [
  { wyz: "Status projektu = decyzja pozytywna", pow: "Prośba o ustalenie terminu", odb: "Instytucja, osoba od terminów", kiedy: "natychmiast", tryb: "Auto", on: true },
  { wyz: "Instytucja wpisała termin", pow: "Termin ustalony, zgłoś do urzędu", odb: "LDIT", kiedy: "natychmiast", tryb: "Auto", on: true },
  { wyz: "Przycisk przy projekcie", pow: "Dane do faktury", odb: "Instytucja szkoleniowa", kiedy: "na żądanie", tryb: "Ręczny", on: true },
  { wyz: "Instytucja oznaczyła fakturę", pow: "Alert o wystawieniu faktury", odb: "Osoba odpowiedzialna za faktury", kiedy: "natychmiast", tryb: "Auto", on: true },
  { wyz: "Zbliża się termin szkolenia", pow: "Sprawdzenie kompletu dokumentów", odb: "LDIT", kiedy: "8 dni przed", tryb: "Auto", on: true },
  { wyz: "Przycisk na karcie klienta", pow: "Instrukcja zakładania konta praca.gov.pl", odb: "Klient końcowy", kiedy: "na żądanie", tryb: "Ręczny", on: true },
  { wyz: "Przycisk na karcie klienta", pow: "Instrukcja składania pisma", odb: "Klient końcowy", kiedy: "na żądanie", tryb: "Ręczny", on: true },
  { wyz: "Projekt rozliczony", pow: "Prośba o opinię w Google", odb: "Klient końcowy", kiedy: "na żądanie", tryb: "Ręczny", on: false },
  { wyz: "Przycisk, nigdy automat", pow: "Klient uzyskał dofinansowanie", odb: "Instytucja", kiedy: "na żądanie", tryb: "Ręczny", on: true },
  { wyz: "Mail przychodzący z praca.gov.pl", pow: "Alert o piśmie z portalu", odb: "Opiekun klienta", kiedy: "przy odbiorze maila", tryb: "Auto", on: false }
];

/* Odbiorcy alertu o fakturach: konta, ktorych rola zarzadza komunikacja (komun.manage).
   Domyslnie zaznaczone sa konta z prawem do faktur (finanse.faktury). Sprawdzamy features roli, nie jej nazwe. */
function odbiorcyAlertuFaktur() {
  return DB.UZYTKOWNICY.filter(function (u) {
    return Funkcje.pasuje(Funkcje.nadania(u.rolaId), "komun.manage");
  }).map(function (u) {
    var jestOdpowiedzialny = Funkcje.pasuje(Funkcje.nadania(u.rolaId), "finanse.faktury");
    return '<label class="chk"><input type="checkbox"' + (jestOdpowiedzialny ? " checked" : "") + "> " +
      esc(u.imie) + (jestOdpowiedzialny ? " (admin)" : "") + "</label>";
  }).join("");
}

/* Szablony wycofane z biblioteki: komunikat "wniosek w trakcie przygotowania" (D-247). Wiersz zostaje w danych, ekran go pomija. */
var SZABLONY_WYCOFANE = ["SZB-04"];
function wycofajSzablony09() {
  DB.SZABLONY = DB.SZABLONY.filter(function (s) { return SZABLONY_WYCOFANE.indexOf(s.id) < 0; });
}

function wierszAutomatu(a, i) {
  var ostatni = a.pow === "Alert o piśmie z portalu";
  return "<tr>" +
    '<td class="small">' + esc(a.wyz) + "</td>" +
    '<td class="strong">' + esc(a.pow) + (ostatni ? ' <span class="ref p">P-52</span>' : "") + "</td>" +
    '<td class="small">' + esc(a.odb) + "</td>" +
    '<td class="small muted nowrap">' + esc(a.kiedy) + "</td>" +
    '<td class="c">' + (a.tryb === "Auto" ? '<span class="tag info">Auto</span>' : '<span class="tag mute">Ręczny</span>') + "</td>" +
    '<td class="c"><label class="switch"><input type="checkbox" ' + (a.on ? "checked" : "") + ">" +
      (a.on ? "włączone" : "wyłączone") + "</label></td></tr>";
}

function minus8(d) {
  var dt = new Date(d);
  dt.setDate(dt.getDate() - 8);
  return dt.toISOString().slice(0, 10);
}

function renderAlert8() {
  document.getElementById("tbAlert8").innerHTML = DB.TERMINY
    .filter(function (t) { return t.status === "Zaplanowany"; })
    .sort(function (a, b) { return a.od < b.od ? -1 : 1; })
    .slice(0, 5).map(function (t) {
      var inst = DB.INSTYTUCJE.filter(function (i) { return i.id === t.is; })[0];
      return "<tr><td class='nowrap'>" + esc(DB.fmtDate(t.od)) + '<div class="small muted">' + esc(t.nazwa) + "</div></td>" +
        "<td class='small'>" + esc(inst ? inst.nazwa : t.is) + "</td>" +
        "<td class='nowrap'><span class='tag warn dot'>" + DB.fmtDate(minus8(t.od)) + "</span></td></tr>";
    }).join("");
}

function renderAutomaty09() {
  document.getElementById("tagAuto").textContent =
    AUTOMATY.filter(function (a) { return a.tryb === "Auto"; }).length + " automatycznych, " +
    AUTOMATY.filter(function (a) { return a.tryb === "Ręczny"; }).length + " ręcznych";
  document.getElementById("odbiorcyAlertu").innerHTML = odbiorcyAlertuFaktur();
  document.getElementById("tbAuto").innerHTML = AUTOMATY.map(wierszAutomatu).join("");
  renderAlert8();
  renderProsbaTermin();
}
