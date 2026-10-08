/* Ekran 02, czesc 3: rok widoku (D-129, D-159). Lata wybiera sie w lewym menu
   (Dofinansowania > rok > instytucja), wiec ekran nie ma wlasnych zakladek lat. Kolejny
   rok dodaje administrator w Ustawieniach > Slowniki (D-273). Korzysta ze STAN_02. Same deklaracje. */

function nazwaRoku(rok) { return rok === NIEPRZYPISANE ? "nieprzypisane" : rok; }

/* Informacja nad lista tylko wtedy, gdy uzytkownik jej potrzebuje: rok bez wnioskow albo wnioski bez roku.
   Opis roku ze slownika lat to notatka projektowa (przeglad 08.10), wiec nie trafia na liste. */
function odswiezNoteRoku() {
  var opis = STAN_02.rokAktywny === NIEPRZYPISANE ? "Wnioski bez przypisanego roku. Nie znikają z systemu." : "";
  var brakWnioskow = !STAN_02.W.length;
  document.getElementById("notaRok").style.display = (opis || brakWnioskow) ? "block" : "none";
  /* Informacja o roku jest dla uzytkownika, wiec bez numeru decyzji (inaczej ukrylby ja tryb bez uwag projektowych) */
  document.getElementById("notaRokTresc").innerHTML = "<b>Dofinansowania " + esc(nazwaRoku(STAN_02.rokAktywny)) +
    (brakWnioskow ? ": brak wniosków." : ".") + "</b> " + esc(opis);
}

function odswiezRok() {
  var tytul = document.querySelector(".page-title");
  var zakres = STAN_02.forcedInst ? STAN_02.forcedInst.nazwa : "wszystkie instytucje";
  tytul.textContent = "Dofinansowania " + nazwaRoku(STAN_02.rokAktywny) + " · " + zakres;
  STAN_02.W = budujW();
  odswiezNoteRoku();
  /* Nowy projekt dostaje numer i identyfikator z roku, wiec nie ma sensu w zakladce bez roku */
  document.getElementById("btnNowyProjekt").style.display = STAN_02.rokAktywny === NIEPRZYPISANE ? "none" : "";
  render();
}
