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

/* ---------- Uczestnicy z puli klienta, kazdy z wyborem szkolenia ---------- */
function pfSelectSzkolenia(ukId) {
  return '<select class="inp pfUczSzk" style="height:28px">' + PROJEKT_NOWY.szkolenia.map(function (s) {
    var kat = SzkoleniaWniosku.szkolenieKatalogu(s.szkolenieId);
    return '<option value="' + esc(s.szkolenieId) + '">' + esc(kat ? kat.nazwa : s.szkolenieId) + "</option>";
  }).join("") + "</select>";
}

function pfRenderUczestnicy() {
  var pula = pfPulaKlienta(pfKlientId());
  var pole = document.getElementById("pfUczestnicy");
  if (!pula.length) {
    pole.innerHTML = '<div class="small muted">Klient nie ma jeszcze uczestników w puli. Dodasz ich w karcie klienta albo później w projekcie.</div>';
    return;
  }
  if (!PROJEKT_NOWY.szkolenia.length) { pole.innerHTML = '<div class="small muted">Najpierw dodaj szkolenia, potem wybierzesz uczestników.</div>'; return; }
  pole.innerHTML = '<table class="tbl"><thead><tr><th></th><th>Uczestnik</th><th>Szkolenie</th><th class="num">Kwota (puste = cena szkolenia)</th></tr></thead><tbody>' +
    pula.map(function (u) {
      return '<tr data-uk="' + esc(u.id) + '"><td><input type="checkbox" class="pfUczCk" aria-label="Wybierz ' + esc(u.imie) + '"></td><td>' + esc(u.imie) + "</td><td>" +
        pfSelectSzkolenia(u.id) + '</td><td class="num"><input class="inp num pfUczKwota" style="width:100px;height:28px" aria-label="Kwota"></td></tr>';
    }).join("") + "</tbody></table>";
}

function pfPulaKlienta(klientId) {
  return DB.UCZESTNICY_KLIENTA.filter(function (u) { return u.klient === klientId; });
}

function pfZebraniUczestnicy() {
  return Array.prototype.filter.call(document.querySelectorAll("#pfUczestnicy tr[data-uk]"), function (tr) {
    return tr.querySelector(".pfUczCk").checked;
  }).map(function (tr) {
    return { uczestnikKlientaId: tr.getAttribute("data-uk"), szkolenieId: tr.querySelector(".pfUczSzk").value, kwota: tr.querySelector(".pfUczKwota").value };
  });
}
