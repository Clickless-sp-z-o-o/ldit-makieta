/* Ekran 04: import klienta z pliku eksportu do wybranej instytucji jako nowego klienta
   (D-282, logika w strony/js/19-klient-eksport.js). Instytucje do wyboru tylko z zakresu
   konta. Same deklaracje. */

function pokazImportKlienta04() {
  var stary = document.getElementById("oknoImportu04");
  if (stary) { stary.remove(); return; }
  var okno = document.createElement("div");
  okno.id = "oknoImportu04";
  okno.className = "note";
  okno.innerHTML = '<b>Import klienta z pliku</b> <span class="ref">D-282</span><div class="btn-row" style="margin-top:8px;align-items:center">' +
    '<select class="inp" id="instImportu04">' + DB.INSTYTUCJE.map(function (i) {
      return '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + "</option>";
    }).join("") + '</select><input class="inp" type="file" id="plikImportu04" accept=".json,application/json">' +
    '<span class="small" id="wynikImportu04"></span></div>' +
    '<div class="small muted" style="margin-top:6px">Klient trafi do wybranej instytucji jako nowy rekord, bez powiązania z klientem, z którego go wyeksportowano.</div>';
  document.querySelector(".page-head").after(okno);
  document.getElementById("plikImportu04").addEventListener("change", function (e) {
    if (e.target.files[0]) wczytajPlikKlienta04(e.target.files[0]);
    e.target.value = "";
  });
}

function wczytajPlikKlienta04(plik) {
  var czytnik = new FileReader();
  czytnik.onload = function () {
    var dane;
    try { dane = JSON.parse(czytnik.result); }
    catch (e) { document.getElementById("wynikImportu04").textContent = "To nie jest poprawny plik JSON: " + e.message; return; }
    var wynik = KlientEksport.zaimportuj(dane, document.getElementById("instImportu04").value);
    if (!wynik.ok) { document.getElementById("wynikImportu04").textContent = wynik.bledy.join(" "); return; }
    KFS.zapiszTeraz().finally(function () { location.href = Nawigacja.adresKlienta(wynik.id); });
  };
  czytnik.readAsText(plik);
}
