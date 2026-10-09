/* Ekran 02, czesc 9: kolejnosc wnioskow na liscie (D-261).
   Numer wniosku (ID, kolumna Nr) jest staly. Miejsce na liscie wyznacza kolumna wnioski.pozycja,
   zawsze bez luk, w obrebie roku w zakresie konta (kolumny Lp. nie ma od 08.10).
   Zmiana kolejnosci (strzalki albo przeciaganie wiersza) zawsze pyta o potwierdzenie,
   zapisuje pozycje przez Store.update i dopisuje wpis do rejestru aktywnosci.
   Korzysta ze STAN_02. Same deklaracje. */

var TYP_KOLEJNOSC = "Zmiana kolejności";
var POLOZENIE_PRZED = "przed";
var POLOZENIE_PO = "po";

/* Cala lista roku w zakresie konta w kolejnosci pozycji, takze wnioski ukryte filtrem */
function listaRoku02() { return wnioskiZakladki(STAN_02.rokAktywny).slice(); }

/* Nowa kolejnosc listy po przeniesieniu wniosku: bez przeniesionego, wstawiony przed albo po celu.
   Rzuca KolejnoscError, gdy wniosku lub celu nie ma na liscie. */
function KolejnoscError(komunikat) { this.name = "KolejnoscError"; this.message = komunikat; }
KolejnoscError.prototype = Object.create(Error.prototype);
KolejnoscError.prototype.constructor = KolejnoscError;

function kolejnoscPoPrzeniesieniu(lista, idWniosku, idCelu, polozenie) {
  var ruszany = lista.filter(function (w) { return w.id === idWniosku; })[0];
  if (!ruszany) throw new KolejnoscError("Wniosku " + idWniosku + " nie ma na tej liście.");
  var reszta = lista.filter(function (w) { return w.id !== idWniosku; });
  var indeks = reszta.map(function (w) { return w.id; }).indexOf(idCelu);
  if (indeks < 0) throw new KolejnoscError("Wniosku docelowego " + idCelu + " nie ma na tej liście.");
  reszta.splice(polozenie === POLOZENIE_PO ? indeks + 1 : indeks, 0, ruszany);
  return reszta;
}

/* Zapisuje pozycje 1..n tylko tam, gdzie sie zmienily, z wpisem do rejestru dla kazdej zmiany */
function zapiszKolejnosc(nowaKolejnosc, idRuszanego) {
  var zmienione = 0;
  STAN_02.batch = true;
  try {
    nowaKolejnosc.forEach(function (w, i) {
      var pozycja = i + 1;
      if (w.pozycja === pozycja) return;
      Store.update("wnioski", w.id, { pozycja: pozycja });
      Store.insert("rejestr_aktywnosci", {
        czas: terazStr(), kto: Auth.sesja().imie, typ: TYP_KOLEJNOSC, obiekt: w.id, pole: "Pozycja na liście",
        przed: String(w.pozycja), po: String(pozycja)
      }, "AKT-");
      zmienione++;
    });
  } finally {
    STAN_02.batch = false;
    STAN_02.W = budujW();
    render();
  }
  return { zmienione: zmienione, ruszany: idRuszanego };
}

function przeniesWniosek(idWniosku, idCelu, polozenie) {
  return zapiszKolejnosc(kolejnoscPoPrzeniesieniu(listaRoku02(), idWniosku, idCelu, polozenie), idWniosku);
}

/* Sasiad widocznego wiersza: strzalka przesuwa o jedno miejsce wsrod wierszy pokazanych na liscie */
function sasiadNaLiscie(idWniosku, kierunek) {
  var widoczne = filtrujWnioski();
  var i = widoczne.map(function (w) { return w.id; }).indexOf(idWniosku);
  var j = kierunek === "gora" ? i - 1 : i + 1;
  return i >= 0 && j >= 0 && j < widoczne.length ? widoczne[j] : null;
}

function tekstPotwierdzeniaRuchu(idWniosku, idCelu) {
  var w = znajdzWniosek(idWniosku), cel = znajdzWniosek(idCelu);
  return "Zmienić kolejność na liście?\nWniosek " + w.nr + " (" + w.klNazwa + ") zostanie przeniesiony obok wniosku " +
    cel.nr + " (" + cel.klNazwa + ").\nNumery wniosków (ID) się nie zmienią, zmieni się tylko miejsce na liście.";
}

function przesunWiersz02(idWniosku, kierunek) {
  var cel = sasiadNaLiscie(idWniosku, kierunek);
  if (!cel) return;
  if (!window.confirm(tekstPotwierdzeniaRuchu(idWniosku, cel.id))) return;
  przeniesWniosek(idWniosku, cel.id, kierunek === "gora" ? POLOZENIE_PRZED : POLOZENIE_PO);
}

/* Przeciaganie wiersza (HTML5 drag and drop): upuszczenie na gornej polowie wiersza wstawia przed nim,
   na dolnej po nim */
function polozenieUpuszczenia(e, tr) {
  var ramka = tr.getBoundingClientRect();
  return e.clientY < ramka.top + ramka.height / 2 ? POLOZENIE_PRZED : POLOZENIE_PO;
}

/* Tryb "Ustaw kolejnosc": dopiero po wlaczeniu wiersze maja przyciski Wyzej/Nizej i daja sie przeciagac.
   Przycisk widzi tylko konto z edycja modulu Dofinansowania. */
function ustawTrybKolejnosci02(wlaczony) {
  STAN_02.trybKolejnosci = !!wlaczony && Auth.edytujeModul("dofin");
  var btn = document.getElementById("btnKolejnosc");
  btn.setAttribute("aria-pressed", String(STAN_02.trybKolejnosci));
  btn.textContent = STAN_02.trybKolejnosci ? "Zakończ ustawianie kolejności" : "Ustaw kolejność";
  document.getElementById("tab").classList.toggle("tryb-kolejnosci", STAN_02.trybKolejnosci);
  render();
}

function podlaczKolejnosc02() {
  var tbody = document.getElementById("body");
  var ciagniety = null;
  var btn = document.getElementById("btnKolejnosc");
  btn.style.display = Auth.edytujeModul("dofin") ? "" : "none";
  btn.addEventListener("click", function () { ustawTrybKolejnosci02(!STAN_02.trybKolejnosci); });
  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-ruch]");
    var tr = btn && btn.closest("tr[data-id]");
    if (tr) przesunWiersz02(tr.dataset.id, btn.dataset.ruch);
  });
  tbody.addEventListener("dragstart", function (e) {
    var tr = e.target.closest ? e.target.closest("tr[data-id]") : null;
    if (!tr) return;
    ciagniety = tr.dataset.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ciagniety);
  });
  tbody.addEventListener("dragover", function (e) {
    if (ciagniety) e.preventDefault();
  });
  tbody.addEventListener("drop", function (e) {
    var tr = e.target.closest("tr[data-id]");
    if (!ciagniety || !tr || tr.dataset.id === ciagniety) { ciagniety = null; return; }
    e.preventDefault();
    var id = ciagniety, cel = tr.dataset.id;
    ciagniety = null;
    if (!window.confirm(tekstPotwierdzeniaRuchu(id, cel))) return;
    przeniesWniosek(id, cel, polozenieUpuszczenia(e, tr));
  });
  tbody.addEventListener("dragend", function () { ciagniety = null; });
}
