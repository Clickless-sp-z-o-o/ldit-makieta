/* Ekran Wniosek: przebieg jako os czasu z wpisow przebiegu i zadan z terminem (D-263).
   Zadanie z terminem trafia do tabeli zadania i przypomina dzien przed terminem. Kolejnosc pozycji
   zmieniaja strzalki gora/dol (logika: 03-wniosek-os-logika.js).
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function przyciskiKolejnosci(p) {
  if (!STAN_03.mozeEdytowac) return "";
  var arg = "'" + p.rodzaj + "','" + escJs(p.id) + "'";
  return '<span class="nowrap" style="float:right">' +
    '<button class="btn xs" title="Przesuń wyżej" onclick="przesunNaOsi(' + arg + ',-1)">&uarr;</button> ' +
    '<button class="btn xs" title="Przesuń niżej" onclick="przesunNaOsi(' + arg + ',1)">&darr;</button></span>';
}

function pozycjaPrzebiegu(p, ostatnia) {
  var w = p.wiersz;
  /* Wpis reczny (D-285) nie zmienia etapu: tytulem jest opis, obok wykonawca */
  var tytul = w.rodzaj === "reczny" ? w.komentarz + (w.wykonawca_id ? " · wykonawca: " + nazwaKonta03(w.wykonawca_id) : "")
    : "Etap " + w.etap_do + (w.etap_z != null ? " (z etapu " + w.etap_z + ")" : "");
  var opis = DB.fmtDate(w.czas) + (w.rodzaj !== "reczny" && w.komentarz ? " · " + w.komentarz : "");
  return '<div class="tl-item ' + (ostatnia ? "now" : "done") + '">' + przyciskiKolejnosci(p) +
    '<div class="t">' + esc(tytul) + '</div><div class="m">' + esc(opis) + '</div></div>';
}

function pozycjaZadania(p) {
  var w = p.wiersz;
  var od = WniosekLogika.widoczneOd(w.termin, w.przypomnij_dni);
  return '<div class="tl-item' + (w.status === "zrobione" ? " done" : "") + '">' + przyciskiKolejnosci(p) +
    '<div class="t">Zadanie: ' + esc(w.tytul) + ' <span class="tag ' + (w.status === "zrobione" ? "pos" : "warn") + '">' + esc(w.status) + '</span></div>' +
    '<div class="m">termin ' + esc(DB.fmtDate(w.termin)) + ', w zadaniach od ' + esc(DB.fmtDate(od)) + '</div></div>';
}

/* Gdy nie ma zapisanych zmian etapu, pokazujemy daty z karty i biezacy etap */
function pozycjaProsta(klasa, tytul, opis) {
  return '<div class="tl-item ' + klasa + '"><div class="t">' + esc(tytul) + '</div><div class="m">' + esc(opis) + '</div></div>';
}

function przebiegZDat() {
  var w = STAN_03.w;
  var daty = [["Formularz wpłynął", DB.fmtDate(w.dataFormularza)], ["Wniosek złożony", DB.fmtDate(w.dataWniosku)], ["Faktura wystawiona", DB.fmtDate(w.dataFaktury)]];
  return daty.filter(function (d) { return d[1]; }).map(function (d) { return pozycjaProsta("done", d[0], d[1]); }).join("") +
    pozycjaProsta("now", "Aktualny etap: " + w.etap + " z " + ETAPOW, "brak zapisanych zmian etapu");
}

function renderPrzebieg() {
  var pozycje = OsCzasu.os(STAN_03.w.id);
  var ostatniaZmiana = -1;
  pozycje.forEach(function (p, i) { if (p.rodzaj === "przebieg") ostatniaZmiana = i; });
  el("przebieg").innerHTML = pozycje.length
    ? pozycje.map(function (p, i) { return p.rodzaj === "zadanie" ? pozycjaZadania(p) : pozycjaPrzebiegu(p, i === ostatniaZmiana); }).join("")
    : przebiegZDat();
}

/* Formularz zadania z terminem: rysowany raz, zeby odswiezenie osi nie kasowalo wpisanego tekstu */
function renderFormularzOsi() {
  el("osFormularz").innerHTML = STAN_03.mozeEdytowac
    ? '<div class="small strong" style="margin-top:12px">Dodaj zadanie z terminem <span class="ref">D-263</span>' +
      '<span class="tip-mark" data-tip="Np. harmonogram do 12.08. Zadanie pokazuje się na osi czasu i w Zadaniach, a przypomnienie dostajesz dzień przed terminem. Kolejność pozycji zmieniasz strzałkami.">i</span></div>' +
      '<div class="formularz-osi">' +
      '<input class="inp" id="osTytul" placeholder="np. harmonogram do klienta" aria-label="Treść zadania">' +
      '<input class="inp" id="osTermin" type="date" aria-label="Termin zadania">' +
      '<button class="btn primary sm" onclick="dodajZadanieNaOsi()">Dodaj</button></div>' + formularzWpisu03()
    : "";
}

function przesunNaOsi(rodzaj, id, kierunek) {
  var wynik = OsCzasu.przesun(STAN_03.w.id, rodzaj, id, kierunek);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  renderPrzebieg();
}

function dodajZadanieNaOsi() {
  var wynik = OsCzasu.dodajZadanie(STAN_03.w.id, { tytul: el("osTytul").value, termin: el("osTermin").value });
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  el("osTytul").value = ""; el("osTermin").value = "";
  renderPrzebieg();
  komunikat("Dodano zadanie, przypomnienie od " + DB.fmtDate(wynik.widoczneOd) + ".");
}
