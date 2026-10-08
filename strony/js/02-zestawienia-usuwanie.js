/* Ekran 02, czesc 10: usuwanie wniosku z listy i przywracanie (D-261).
   Lp. na liscie wynika z kolejnosci, wiec usuniecie nie zostawia luk w numeracji. Wniosek wycofany przed rozpoczeciem pracy znika z listy (usuniety = 1, data usuniecia),
   klient zostaje w Bazie danych. Gdy praca byla wykonana, zamiast usuwac nadaje sie status
   Rezygnacja. Usuniete wnioski widac w sekcji "Usuniete z listy", skad wraca sie je na liste.
   Zapis przez Store.update, kazda zmiana trafia do rejestru aktywnosci. Same deklaracje. */

var TYP_USUNIECIE = "Usunięcie wniosku";
var TYP_PRZYWROCENIE = "Przywrócenie wniosku";

/* Praca nad wnioskiem jest wykonana, gdy wniosek wyszedl poza etap przygotowania
   (zlozony albo z decyzja). Wtedy zalecana jest Rezygnacja zamiast usuniecia. */
function czyPracaWykonana(w) {
  var status = Statusy.wartosc(w);
  return !Statusy.przedZlozeniem(w) && status !== "Rezygnacja";
}

function dzisIso02() { return terazStr().slice(0, 10); }

function tekstUsuniecia(w) {
  var t = "Usunąć wniosek " + w.nr + " (" + w.klNazwa + ") z listy?\n" +
    "Klient wycofał się przed rozpoczęciem pracy. Wniosek zniknie z listy, klient zostanie w Bazie danych.";
  if (czyPracaWykonana(w)) {
    t = "Praca nad tym wnioskiem była wykonana (status: " + Statusy.wartosc(w) + ").\n" +
      "Zamiast usuwać, nadaj status Rezygnacja w kolumnie Status.\n\n" + t;
  }
  return t + "\nUsunięty wniosek można przywrócić w sekcji „Usunięte z listy”.";
}

function usunWniosek(id) {
  var w = znajdzWniosek(id);
  if (!w) throw new KolejnoscError("Wniosku " + id + " nie ma na liście.");
  Store.update("wnioski", id, { usuniety: 1, usunieto: dzisIso02() });
  Store.insert("rejestr_aktywnosci", {
    czas: terazStr(), kto: Auth.sesja().imie, typ: TYP_USUNIECIE, obiekt: id, pole: "Na liście",
    przed: "tak", po: "usunięty (klient wycofał się przed rozpoczęciem pracy)"
  }, "AKT-");
  STAN_02.W = budujW();
  render();
}

/* Przywrocony wniosek wraca na koniec listy swojego roku */
function przywrocWniosek(id) {
  var w = DB.WNIOSKI_USUNIETE.filter(function (x) { return x.id === id; })[0];
  if (!w) throw new KolejnoscError("Wniosku " + id + " nie ma wśród usuniętych.");
  var maks = DB.WNIOSKI_WSZYSTKIE.reduce(function (m, x) { return Math.max(m, x.pozycja || 0); }, 0);
  Store.update("wnioski", id, { usuniety: 0, usunieto: null, pozycja: maks + 1 });
  Store.insert("rejestr_aktywnosci", {
    czas: terazStr(), kto: Auth.sesja().imie, typ: TYP_PRZYWROCENIE, obiekt: id, pole: "Na liście",
    przed: "usunięty", po: "przywrócony"
  }, "AKT-");
  STAN_02.W = budujW();
  render();
}

function usunietePoRoku02() {
  return DB.WNIOSKI_USUNIETE.filter(function (w) {
    var rokPasuje = STAN_02.rokAktywny === NIEPRZYPISANE ? !w.rok : String(w.rok) === STAN_02.rokAktywny;
    return rokPasuje && (!STAN_02.forcedInst || w.is === STAN_02.forcedInst.id);
  });
}

function wierszUsunietego(w) {
  return '<tr><td class="strong nowrap">' + esc(w.nr) + '</td><td>' + esc(w.klNazwa) + '</td><td>' + esc(w.isNazwa) +
    '</td><td class="nowrap">' + esc(DB.fmtDate(w.usunieto)) + '</td><td class="right">' +
    '<button class="btn xs" data-przywroc="' + esc(w.id) + '">Przywróć na listę</button></td></tr>';
}

/* Sekcja widoczna dla kont z edycja modulu Dofinansowania; przycisk w pasku narzedzi pokazuje liczbe */
function odswiezUsuniete02() {
  var mozeEdytowac = Auth.edytujeModul("dofin");
  var usuniete = usunietePoRoku02();
  var btn = document.getElementById("btnUsuniete");
  btn.style.display = mozeEdytowac ? "" : "none";
  btn.textContent = "Usunięte z listy (" + usuniete.length + ")";
  var panel = document.getElementById("usunietePanel");
  if (!mozeEdytowac || panel.style.display === "none") return;
  panel.innerHTML = '<div class="small strong" style="margin-bottom:6px">Usunięte z listy <span class="ref">D-261</span></div>' +
    (usuniete.length
      ? '<table class="tbl"><thead><tr><th>Nr</th><th>Klient</th><th>Instytucja</th><th>Usunięto</th><th></th></tr></thead><tbody>' +
        usuniete.map(wierszUsunietego).join("") + '</tbody></table>'
      : '<div class="muted small">Brak usuniętych wniosków w tym roku.</div>');
}

function podlaczUsuwanie02() {
  document.getElementById("btnUsuniete").addEventListener("click", function () {
    var panel = document.getElementById("usunietePanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    odswiezUsuniete02();
  });
  document.getElementById("usunietePanel").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-przywroc]");
    if (btn) przywrocWniosek(btn.dataset.przywroc);
  });
  document.getElementById("body").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-usun]");
    if (!btn) return;
    var w = znajdzWniosek(btn.dataset.usun);
    if (w && window.confirm(tekstUsuniecia(w))) usunWniosek(w.id);
  });
}
