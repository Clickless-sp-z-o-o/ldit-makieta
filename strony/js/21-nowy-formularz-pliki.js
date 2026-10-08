/* Ekran 21: plik Excel .xlsx w formularzu (decyzja P-67) i pobieranie pustego formularza.
   Formularz rysuje 16-formularz-zgloszenia.js (wspolny z panelem instytucji); ten plik na ekranie
   Nowy formularz rozszerza jego wczytywanie pliku: .xlsx zamienia na CSV (js/21-xlsx.js) i podaje
   temu samemu parserowi co CSV, a formularz zapisuje zrodlo "xlsx" z oryginalnym plikiem do podgladu.
   Musi byc zaladowany po 16-formularz-zgloszenia.js. Same deklaracje. */

var NAZWA_SZABLONU_XLSX_21 = "szablon-formularza-klienta.xlsx";
var TYP_XLSX_21 = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
var ROZMIAR_KAWALKA_21 = 0x8000;

function naBase6421(bajty) {
  var tekst = "";
  for (var i = 0; i < bajty.length; i += ROZMIAR_KAWALKA_21) tekst += String.fromCharCode.apply(null, bajty.subarray(i, i + ROZMIAR_KAWALKA_21));
  return btoa(tekst);
}

/* Wynik parsera dla tresci CSV z arkusza: { firma, uczestnicy, ostrzezenia } albo { blad } */
function formularzZXlsx21(bufor) {
  return XlsxPlik.naCsv(bufor).then(parsujFormularzCsv);
}

function obsluzXlsx21(plik) {
  var czytnik = new FileReader();
  czytnik.onload = function () {
    formularzZXlsx21(czytnik.result).then(function (wynik) {
      if (wynik.blad) { zfKomunikatPliku(wynik.blad, true); return; }
      ZF.plik = zfDanePliku(plik, naBase6421(new Uint8Array(czytnik.result)));
      ZF.zrodlo = "xlsx";
      zfWypelnijZCsv(wynik);
      zfKomunikatPliku("Wczytano " + plik.name + ", uczestników: " + wynik.uczestnicy.length + ". Sprawdź dane przed wysłaniem.", false);
    }, function (blad) {
      if (!(blad instanceof XlsxPlik.XlsxError) && !(blad instanceof DOMException) && !(blad instanceof TypeError)) throw blad;
      zfKomunikatPliku("Nie udało się odczytać pliku Excel: " + blad.message, true);
    });
  };
  czytnik.readAsArrayBuffer(plik);
}

/* Wczytanie z 16-formularz-zgloszenia.js zostaje dla CSV i PDF; .xlsx czytamy tutaj */
var zfWczytajPlikBazowy21 = zfWczytajPlik;
zfWczytajPlik = function (input) {
  var plik = input.files && input.files[0];
  var rozszerzenie = plik ? plik.name.split(".").pop().toLowerCase() : "";
  if (ZF.zrodlo !== "pdf" && rozszerzenie === "xlsx") { obsluzXlsx21(plik); return; }
  if (ZF.zrodlo !== "pdf" && rozszerzenie === "xls") { zfKomunikatPliku("Starszy format .xls: zapisz arkusz jako .xlsx albo CSV i wczytaj ponownie.", true); return; }
  zfWczytajPlikBazowy21(input);
};

function pobierz21(dane, typ, nazwa) {
  var adres = URL.createObjectURL(new Blob([dane], { type: typ }));
  var link = document.createElement("a");
  link.href = adres;
  link.download = nazwa;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(adres);
}

function pobierzSzablonXlsx21() { pobierz21(XlsxPlik.szablon(NAGLOWKI_SZABLONU_CSV), TYP_XLSX_21, NAZWA_SZABLONU_XLSX_21); }
function pobierzSzablonCsv21() { zfPobierzSzablon(); }

/* Opis przy wyborze pliku: szablon w obu formatach, bez odsylania do zapisu jako CSV */
function uzupelnijBlokSzablonu21() {
  var blok = document.getElementById("zfSzablonBlok");
  if (!blok) return;
  blok.innerHTML = "Wpisz dane w pustym formularzu i wczytaj go poniżej (Excel .xlsx albo CSV). " +
    '<button type="button" class="btn xs" onclick="pobierzSzablonXlsx21()">Pusty formularz Excel</button> ' +
    '<button type="button" class="btn xs" onclick="pobierzSzablonCsv21()">Pusty formularz CSV</button>';
}
