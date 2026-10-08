/* Nabory: wczytanie pliku zrodlowego (CSV) naborow ogloszonych albo prognoz (D-271) i cofniecie
   ostatniego wczytania (P-79 wariant b). W aplikacji wczytuje automatyzacja z plikow Excel; tu ten
   sam przebieg recznie, przez assets/nabory-import.js. Widzi to konto z edycja modulu Nabory. Tylko deklaracje. */

function opisOstatniego05(o) {
  return o ? "Ostatnie wczytanie: " + (o.plik || "plik bez nazwy") + ", " + DB.fmtDate(o.czas) + ", wierszy " + o.wierszy + "." : "Brak wczytania do cofnięcia.";
}

function renderWczytaj05() {
  var host = el05("wczytajNabory");
  if (!Auth.edytujeModul("nabory")) { host.style.display = "none"; return; }
  var ostatnie = NaboryImport.ostatnieWczytanie();
  host.innerHTML = '<div class="card-head"><h3>Wczytaj plik naborów</h3>' +
    '<span class="tip-mark" data-tip="Plik CSV z nagłówkiem w pierwszym wierszu, kolumny jak w tabeli źródłowej: wojewodztwo, urzad, data_od, data_do, status, srodki, link, podsumowanie (ogłoszone) albo prognoza_opis (prognozy). Wiersze trafiają do tabeli src_, urząd dopasowuje się po nazwie albo aliasie, nieznany urząd trafia do powiadomień (D-271, D-272).">i</span>' +
    '<span class="sub">to samo robi automatyzacja z plików Excel</span></div>' +
    '<div class="toolbar"><select class="inp" id="rodzajPliku05" aria-label="Rodzaj pliku naborów"><option value="ogloszone">Nabory ogłoszone</option>' +
    '<option value="prognozowane">Prognozy naborów</option></select>' +
    '<input class="inp" type="file" id="plikNaborow05" accept=".csv,text/csv" aria-label="Plik naborów"><span class="small" id="wynikWczytania05"></span></div>' +
    '<div class="toolbar"><button class="btn sm" type="button" id="cofnijWczytanie05"' + (ostatnie ? "" : " disabled") + ' onclick="klikCofnijWczytanie05()">Cofnij ostatnie wczytanie</button>' +
    '<span class="small muted" id="opisOstatniego05">' + esc(opisOstatniego05(ostatnie)) + "</span></div>";
  el05("plikNaborow05").addEventListener("change", function (e) { if (e.target.files[0]) wczytajPlik05(e.target.files[0]); e.target.value = ""; });
}

function opisWyniku05(w) {
  return "Wczytano " + w.wczytane + " wierszy: nowe nabory " + w.nowe + ", zaktualizowane " + w.zaktualizowane +
    (w.nieznane.length ? ", nieznane urzędy (trafiły do powiadomień): " + w.nieznane.join(", ") : "") + ".";
}

function poZapisie05() { KFS.zapiszTeraz().finally(function () { location.reload(); }); }

function wczytajPlik05(plik) {
  var czytnik = new FileReader();
  czytnik.onload = function () {
    var wynik;
    try {
      wynik = NaboryImport.wczytaj(el05("rodzajPliku05").value, NaboryImport.parsujCsv(czytnik.result), plik.name);
    } catch (e) {
      if (!(e instanceof NaboryImport.NaboryImportError) && !(e instanceof Straznik.StraznikError)) throw e;
      el05("wynikWczytania05").textContent = e.message;
      return;
    }
    window.alert(opisWyniku05(wynik));
    poZapisie05();
  };
  czytnik.readAsText(plik);
}

/* Cofniecie usuwa wiersze tego wczytania i przywraca nabory sprzed niego, takze poprawione pozniej recznie */
function klikCofnijWczytanie05() {
  var o = NaboryImport.ostatnieWczytanie();
  if (!o) return;
  if (!window.confirm("Cofnąć wczytanie pliku „" + (o.plik || "plik bez nazwy") + "” z " + DB.fmtDate(o.czas) + "? " +
      "Nabory dodane przez ten plik znikną, a zaktualizowane wrócą do wartości sprzed wczytania.")) return;
  var wynik;
  try {
    wynik = NaboryImport.cofnijWczytanie(o.partia);
  } catch (e) {
    if (!(e instanceof NaboryImport.NaboryImportError) && !(e instanceof Straznik.StraznikError)) throw e;
    el05("opisOstatniego05").textContent = e.message;
    return;
  }
  window.alert("Cofnięto wczytanie: usunięte wiersze " + wynik.usuniete + ", przywrócone nabory " + wynik.przywrocone + ".");
  poZapisie05();
}
