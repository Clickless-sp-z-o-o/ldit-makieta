/* Ekran 02, czesc 10: zmiana statusu wniosku z menu wiersza (przeglad 08.10, zamiast pola wyboru
   w kazdym wierszu). Przycisk "Zmien" przy znaczniku statusu otwiera male menu z pozostalymi
   statusami; wybor pyta o potwierdzenie i zapisuje przez zmienStatus (02-zestawienia-dane.js).
   Bez zmian zbiorczych (D-262). Escape i klik poza menu je zamykaja. Same deklaracje. */

var MENU_STATUSU_02 = "menuStatusu02";

/* Statusy do wyboru: wszystkie z listy poza biezacym */
function statusyDoWyboru02(w) {
  var biezacy = Statusy.wartosc(w);
  return Statusy.LISTA.filter(function (s) { return s !== biezacy; });
}

function tekstPotwierdzeniaStatusu02(w, status) {
  return "Zmienić status wniosku " + w.nr + " (" + w.klNazwa + ")?\n" + Statusy.wartosc(w) + " → " + status +
    "\nZmiana trafi do rejestru aktywności.";
}

function zamknijMenuStatusu02(przywrocFokus) {
  var menu = document.getElementById(MENU_STATUSU_02);
  if (!menu) return;
  var przycisk = document.querySelector('[data-status-menu="' + menu.getAttribute("data-wniosek") + '"]');
  menu.remove();
  if (przycisk) {
    przycisk.setAttribute("aria-expanded", "false");
    if (przywrocFokus) przycisk.focus();
  }
}

function otworzMenuStatusu02(przycisk) {
  var w = znajdzWniosek(przycisk.getAttribute("data-status-menu"));
  if (!w) return;
  zamknijMenuStatusu02(false);
  var menu = document.createElement("div");
  menu.id = MENU_STATUSU_02;
  menu.className = "menu-statusu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Nowy status wniosku " + w.nr);
  menu.setAttribute("data-wniosek", w.id);
  menu.innerHTML = statusyDoWyboru02(w).map(function (s) {
    return '<button type="button" role="menuitem" data-nowy-status="' + esc(s) + '">' + esc(s) + "</button>";
  }).join("");
  var r = przycisk.getBoundingClientRect();
  menu.style.top = (r.bottom + window.scrollY + 4) + "px";
  menu.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - 180)) + "px";
  document.body.appendChild(menu);
  przycisk.setAttribute("aria-expanded", "true");
  menu.querySelector("button").focus();
}

function wybierzStatus02(id, status) {
  var w = znajdzWniosek(id);
  zamknijMenuStatusu02(false);
  if (!w || !window.confirm(tekstPotwierdzeniaStatusu02(w, status))) return false;
  zmienStatus(id, status);
  return true;
}

/* Strzalki gora/dol przesuwaja fokus po pozycjach menu */
function przesunFokusMenu02(menu, krok) {
  var pozycje = Array.prototype.slice.call(menu.querySelectorAll("button"));
  var i = pozycje.indexOf(document.activeElement);
  pozycje[(i + krok + pozycje.length) % pozycje.length].focus();
}

function podlaczMenuStatusu02() {
  document.getElementById("body").addEventListener("click", function (e) {
    var przycisk = e.target.closest("[data-status-menu]");
    if (!przycisk) return;
    e.stopPropagation();
    if (przycisk.getAttribute("aria-expanded") === "true") zamknijMenuStatusu02(true);
    else otworzMenuStatusu02(przycisk);
  });
  document.addEventListener("click", function (e) {
    var pozycja = e.target.closest("[data-nowy-status]");
    var menu = document.getElementById(MENU_STATUSU_02);
    if (pozycja && menu) { wybierzStatus02(menu.getAttribute("data-wniosek"), pozycja.getAttribute("data-nowy-status")); return; }
    if (menu && !e.target.closest("#" + MENU_STATUSU_02)) zamknijMenuStatusu02(false);
  });
  /* Menu jest przypiete do miejsca na stronie, a tabela przewija sie w swoim kontenerze: przewiniecie je zamyka */
  document.addEventListener("scroll", function () { zamknijMenuStatusu02(false); }, true);
  document.addEventListener("keydown", function (e) {
    var menu = document.getElementById(MENU_STATUSU_02);
    if (!menu) return;
    if (e.key === "Escape") { e.preventDefault(); zamknijMenuStatusu02(true); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); przesunFokusMenu02(menu, e.key === "ArrowDown" ? 1 : -1); }
  });
}
