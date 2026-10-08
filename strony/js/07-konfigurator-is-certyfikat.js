/* Konfigurator instytucji: zakladka wzoru certyfikatu (placeholdery i podglad). Tylko deklaracje. */
function certyfikatRender(i, wn) {
  var szk = DB.SZKOLENIA.filter(function (s) { return s.is === i.id; })[0] ||
            { nazwa: "(brak szkoleń w katalogu)", godz: "-", cena: 0 };
  var termin = DB.TERMINY.filter(function (t) { return t.is === i.id; })[0];
  var przykladOsoba = (wn[0] && wn[0].uczestnicy[0]) ? wn[0].uczestnicy[0].imie : "(brak uczestników)";
  var terminTxt = termin ? DB.fmtDate(termin.od) + " do " + DB.fmtDate(termin.do) : "brak terminu";

  document.getElementById("certSub").textContent = i.nazwa;
  document.getElementById("certPlik").textContent = "wzor_certyfikatu_" + String(i.skrot || i.id).toLowerCase() + "_2026.docx";

  var PH = [
    ["{{uczestnik_imie_nazwisko}}", "Uczestnik projektu", esc(przykladOsoba)],
    ["{{szkolenie_nazwa}}", "Katalog szkoleń", esc(szk.nazwa)],
    ["{{termin_realizacji}}", "Termin szkolenia", esc(terminTxt)],
    ["{{data_wystawienia}}", "Data systemowa", esc(DB.fmtDate(dzisiaj()))],
    ["{{miejscowosc}}", "<b>Siedziba instytucji</b> <span class='ref'>D-99</span>", "<b>" + esc(i.miasto) + "</b>"],
    ["{{numer_certyfikatu}}", "Opcjonalny, reguła nieustalona <span class='ref p'>P-40</span>", "<span class='muted'>brak</span>"]
  ];
  document.getElementById("placeholdery").innerHTML = PH.map(function (r) {
    return "<tr><td class='mono strong'>" + r[0] + "</td><td class='small'>" + r[1] + "</td><td class='small'>" + r[2] + "</td></tr>";
  }).join("");

  document.getElementById("podgladCert").innerHTML =
    '<div class="c-top">' + esc(i.nazwa) + "</div>" +
    '<div class="c-tyt">Certyfikat ukończenia szkolenia</div>' +
    '<div class="c-txt">zaświadcza się, że</div>' +
    '<div class="c-os"><span class="ph">{{uczestnik_imie_nazwisko}}</span></div>' +
    '<div class="c-txt">ukończył(a) szkolenie<br><b><span class="ph">{{szkolenie_nazwa}}</span></b><br>' +
    'zrealizowane w terminie <span class="ph">{{termin_realizacji}}</span><br>' +
    "w wymiarze " + esc(szk.godz) + " godzin dydaktycznych</div>" +
    '<div class="c-stopka">' +
      '<div><span class="ph">{{miejscowosc}}</span>, <span class="ph">{{data_wystawienia}}</span></div>' +
      '<div>nr <span class="ph">{{numer_certyfikatu}}</span></div></div>';
  return { szk: szk, terminTxt: terminTxt };
}
