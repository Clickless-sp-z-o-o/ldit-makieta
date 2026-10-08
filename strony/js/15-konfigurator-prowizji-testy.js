/* Konfigurator prowizji: przypadki testowe z docs/07 i przyklad z warsztatu. Tylko deklaracje. */
/* Przypadki testowe z docs/07-silnik-prowizji.md */
var TESTY = [
  { n: 1, zr: "warsztat", opis: "Model A, obrót 49 000 zł", ocz: "4 900,00 zł", preset: "A", f: [["Faktura", 49000]] },
  { n: 2, zr: "warsztat", opis: "Model A, obrót 50 000 zł (12% od całości)", ocz: "6 000,00 zł", preset: "A", f: [["Faktura", 50000]] },
  { n: 3, zr: "arkusz", opis: "Styczeń: 26 000 + 25 000, obie po 12%", ocz: "6 120,00 zł", preset: "A", f: [["Szkolenie 1", 26000], ["Szkolenie 2", 25000]] },
  { n: 4, zr: "arkusz", opis: "Luty: 25 000 + 24 000, obie po 10%", ocz: "4 900,00 zł", preset: "A", f: [["Szkolenie 1", 25000], ["Szkolenie 2", 24000]] },
  { n: 5, zr: "warsztat", opis: "Model A, rezygnacja: 54 000 spada do 48 000", ocz: "4 800,00 zł", preset: "A", f: [["Po rezygnacji", 48000]] },
  { n: 6, zr: "arkusz", opis: "Wariant 12/10%: obrót 59 000 zł", ocz: "7 080,00 zł", preset: "A2", f: [["Faktura", 59000]] },
  { n: 7, zr: "arkusz", opis: "Wariant 12/10%: obrót 60 000 zł", ocz: "6 000,00 zł", preset: "A2", f: [["Faktura", 60000]] },
  { n: 8, zr: "arkusz", opis: "Roczny YTD: 240k + 250k + 15k przez próg 500k", ocz: "2 500,00 zł z ostatniej", preset: "Y1", f: [["Faktura 1", 240000], ["Faktura 2", 250000], ["Faktura przez próg", 15000]] },
  { n: 9, zr: "warsztat", opis: "Model B, próg 500k przy stawce 17,5%", ocz: "2 875,00 zł z ostatniej", preset: "B", f: [["Narastająco", 490000], ["Faktura przez próg", 15000]] },
  { n: 10, zr: "warsztat", opis: "Model C, Fit Akademia, obrót 102 000 zł", ocz: "18 280,00 zł", preset: "C", f: [["Faktura", 102000]] },
  { n: 11, zr: "warsztat", opis: "Model C, obrót 250 000 zł przez trzy progi", ocz: "37 000,00 zł", preset: "C", f: [["Faktura", 250000]] },
  { n: 12, zr: "warsztat", opis: "Model D, stała 20%", ocz: "20% liniowo", preset: "D", f: [["Faktura", 80000]] }
];

function renderTesty() {
  document.getElementById("testy").innerHTML = TESTY.map(function (t, i) {
    return '<tr><td class="strong">' + t.n + '</td><td>' + t.opis +
      ' <span class="pill' + (t.zr === "arkusz" ? " w" : "") + '">' + t.zr + '</span></td>' +
      '<td class="num mono">' + t.ocz + '</td>' +
      '<td class="right"><button class="btn xs" onclick="uruchomTest(' + i + ')">Załaduj</button></td></tr>';
  }).join("");
}

function uruchomTest(i) {
  var t = TESTY[i];
  document.getElementById("preset").value = t.preset;
  document.getElementById("preset").dispatchEvent(new Event("change"));
  document.getElementById("nadpisz").value = "";
  faktury = t.f.map(function (x) { return { opis: x[0], kwota: x[1] }; });
  renderFaktury(); przelicz();
  /* Test 5 liczy prowizje tylko z drugiej faktury, pierwsza buduje obrot */
  if (t.n === 8 || t.n === 9) {
    var wyn = liczOkres(warunki(), t.f.map(function (x) { return { kwota: x[1] }; }));
    var r = wyn.pozycje[wyn.pozycje.length - 1];
    document.getElementById("bigOpis").innerHTML =
      "Prowizja z faktury przekraczającej próg: <b>" + DB.fmtPLN2(r.prowizja) +
      "</b> · efektywnie " + DB.fmtPct(Math.round(r.stawka * 100) / 100);
  }
}

function wczytajPrzyklad() {
  document.getElementById("preset").value = "A";
  document.getElementById("preset").dispatchEvent(new Event("change"));
  faktury = [
    { opis: "Styczeń, szkolenie A", kwota: 26000 },
    { opis: "Styczeń, szkolenie B", kwota: 25000 }
  ];
  renderFaktury(); przelicz();
}
