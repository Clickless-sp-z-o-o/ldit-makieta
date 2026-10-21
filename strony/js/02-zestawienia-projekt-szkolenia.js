/* Ekran 02, nowy projekt, czesc 2: szkolenia z cena ustalana w projekcie i uczestnicy z puli klienta
   (D-264). Katalog pokazuje sama nazwe szkolenia, cena katalogowa jest tylko wartoscia domyslna pola ceny.
   Stan: PROJEKT_NOWY (szkolenia projektu), uczestnikow odczytuje zapis z pol formularza.
   Same deklaracje. */

var PROJEKT_NOWY = { szkolenia: [], formularzId: "" };

function pfInstytucja() { return document.getElementById("pfInstytucja").value; }
function pfKlientId() { return document.getElementById("pfKlient").value; }

function pfOpcjeKatalogu() {
  var juz = PROJEKT_NOWY.szkolenia.map(function (s) { return s.szkolenieId; });
  return SzkoleniaWniosku.szkoleniaInstytucji(pfInstytucja())
    .filter(function (s) { return juz.indexOf(s.id) < 0; })
    .map(function (s) { return '<option value="' + esc(s.id) + '" data-cena="' + esc(s.cena == null ? 0 : s.cena) + '">' + esc(s.nazwa) + "</option>"; }).join("");
}

function pfRenderSzkolenia() {
  var wiersze = PROJEKT_NOWY.szkolenia.map(function (s, i) {
    var kat = SzkoleniaWniosku.szkolenieKatalogu(s.szkolenieId);
    return "<tr><td>" + esc(kat ? kat.nazwa : s.szkolenieId) + '</td><td class="num"><input class="inp num" style="width:110px;height:28px" value="' + esc(s.cena) +
      '" aria-label="Cena w projekcie" onchange="pfZmienCene(' + i + ', this.value)"></td>' +
      '<td class="right"><button class="btn xs" onclick="pfUsunSzkolenie(' + i + ')">Usuń</button></td></tr>';
  }).join("");
  document.getElementById("pfSzkolenia").innerHTML =
    (wiersze ? '<table class="tbl"><thead><tr><th>Szkolenie</th><th class="num">Cena w tym projekcie</th><th></th></tr></thead><tbody>' + wiersze + "</tbody></table>"
      : '<div class="small muted">Dodaj co najmniej jedno szkolenie z katalogu instytucji.</div>') +
    '<div class="toolbar" style="gap:8px;padding:8px 0 0"><select class="inp" id="pfSzkNowe" style="min-width:300px" onchange="pfPodpowiedzCene()" aria-label="Szkolenie z katalogu">' +
    pfOpcjeKatalogu() + '</select><input class="inp num" id="pfSzkCena" style="width:130px" placeholder="cena w projekcie" aria-label="Cena nowego szkolenia">' +
    '<button class="btn sm" onclick="pfDodajSzkolenie()">+ Dodaj szkolenie</button></div>';
  pfPodpowiedzCene();
  pfRenderUczestnicy();
}

function pfPodpowiedzCene() {
  var wybor = document.getElementById("pfSzkNowe");
  if (wybor && wybor.selectedOptions.length) document.getElementById("pfSzkCena").value = wybor.selectedOptions[0].getAttribute("data-cena");
}

function pfDodajSzkolenie() {
  var wybor = document.getElementById("pfSzkNowe");
  var cena = SzkoleniaWniosku.parsujKwote(document.getElementById("pfSzkCena").value);
  if (!wybor.value) { pfBledy(["Brak szkolenia do dodania w katalogu tej instytucji."]); return; }
  if (cena === null) { pfBledy(["Cena szkolenia to liczba nie mniejsza niż 0, np. 4500 albo 4500,50."]); return; }
  PROJEKT_NOWY.szkolenia.push({ szkolenieId: wybor.value, cena: cena });
  pfBledy([]);
  pfRenderSzkolenia();
}

function pfZmienCene(i, tekst) {
  var cena = SzkoleniaWniosku.parsujKwote(tekst);
  if (cena === null) { pfBledy(["Cena szkolenia to liczba nie mniejsza niż 0."]); pfRenderSzkolenia(); return; }
  PROJEKT_NOWY.szkolenia[i].cena = cena;
  pfBledy([]);
}

function pfUsunSzkolenie(i) { PROJEKT_NOWY.szkolenia.splice(i, 1); pfRenderSzkolenia(); }
