/* Ekran 02, czesc 8: akcje na liscie. Cofanie zmian zbiorczych z historii (D-234),
   historia zmian wniosku, wybor roku i instytucji z list rozwijanych (D-241) oraz powrot
   z karty na to samo miejsce listy (D-241). Logika partii: 02-zestawienia-zbiorcza.js. */

function komunikatZbiorczej(tekst) {
  document.getElementById("komZbiorcza").textContent = tekst;
}

/* Przycisk cofania jest aktywny tylko, gdy w rejestrze jest niecofnieta zmiana zbiorcza */
function odswiezPrzyciskCofania() {
  var btn = document.getElementById("btnCofnij");
  var partia = ostatniaPartiaDoCofniecia();
  btn.disabled = !partia;
  btn.title = partia ? "Przywraca statusy sprzed ostatniej zmiany zbiorczej (" + partia + ")" : "Brak zmiany zbiorczej do cofnięcia";
}

function cofnijZbiorcza() {
  var partia = ostatniaPartiaDoCofniecia();
  if (!partia) { alert("Brak zmiany zbiorczej do cofnięcia."); return; }
  if (!window.confirm("Cofnąć ostatnią zmianę zbiorczą (" + partia + ")? Statusy wrócą do wartości sprzed zmiany.")) return;
  STAN_02.batch = true;
  try {
    var wynik = cofnijPartie(partia, ktoZmienia());
    komunikatZbiorczej("Cofnięto zmianę zbiorczą: przywrócono " + wynik.przywrocone + " wniosków" +
      (wynik.pominiete ? ", pominięto " + wynik.pominiete + " (zmienione po zmianie zbiorczej)." : "."));
  } finally {
    STAN_02.batch = false;
    STAN_02.W = budujW(); render();
  }
}

/* Historia zmian wniosku z rejestru aktywnosci (D-234) */
function pokazHistorie(id) {
  var wpisy = historiaWniosku(id);
  var panel = document.getElementById("histPanel");
  panel.innerHTML = '<div class="small strong" style="margin-bottom:6px">Historia zmian wniosku ' + esc(id) +
    ' <button class="btn xs" id="btnZamknijHist">Zamknij</button></div>' + (wpisy.length
      ? '<table class="tbl"><thead><tr><th>Czas</th><th>Kto</th><th>Zmiana</th><th>Pole</th><th>Przed</th><th>Po</th></tr></thead><tbody>' +
        wpisy.map(function (r) {
          return '<tr><td class="nowrap">' + esc(DB.fmtDate(r.czas)) + '</td><td>' + esc(r.kto) + '</td><td>' + esc(r.typ) +
            '</td><td>' + esc(r.pole) + '</td><td>' + esc(r.przed) + '</td><td>' + esc(r.po) + '</td></tr>';
        }).join("") + '</tbody></table>'
      : '<div class="muted small">Brak zapisanych zmian tego wniosku.</div>');
  panel.style.display = "block";
  document.getElementById("btnZamknijHist").addEventListener("click", function () { panel.style.display = "none"; });
}

/* Rok i instytucja z list rozwijanych zamiast dublujacych sie pozycji menu */
function wypelnijRok02() {
  var sel = document.getElementById("fRok");
  sel.innerHTML = DB.LATA.map(function (l) {
    return '<option value="' + esc(l.rok) + '">' + esc("Dofinansowania " + nazwaRoku(l.rok)) + '</option>';
  }).join("");
  sel.value = STAN_02.rokAktywny;
  sel.addEventListener("change", function () { STAN_02.rokAktywny = sel.value; odswiezRok(); });
}

/* Instytucja wybrana w filtrze (jedna) zawęza zrodlo listy tak jak wejscie z menu (?is=) */
function zsynchronizujInstytucje02() {
  var wybrane = wybrane02("fIS");
  var inst = wybrane.length === 1 ? DB.INSTYTUCJE.filter(function (i) { return i.id === wybrane[0]; })[0] : null;
  STAN_02.forcedInst = inst || null;
  document.querySelectorAll("th.kol-is").forEach(function (th) { th.style.display = inst ? "none" : ""; });
}

/* Klik w wiersz zapisuje miejsce na liscie: wiersz w adresie (powrot z historii ekranow) i przewiniecie */
function zapamietajMiejsce02(e) {
  var tr = e.target.closest("tr[data-id]");
  if (!tr || !e.target.closest("a[href]")) return;
  Nawigacja.zapiszWAdresie(Object.assign(wartosciFiltrow02(), { wn: tr.dataset.id }));
  var kontener = document.querySelector(".lista-tabela");
  Nawigacja.zapamietajPrzewiniecie(kontener, document.querySelectorAll("#body tr[data-id]").length, tr.dataset.id);
}

/* Powrot z karty: odtworz przewiniecie, a gdy go nie ma, pokaz wiersz na srodku */
function przywrocMiejsce02(zapis, idWniosku) {
  pokazWierszPowrotu(idWniosku);
  if (zapis) document.querySelector(".lista-tabela").scrollTop = zapis.top;
}
