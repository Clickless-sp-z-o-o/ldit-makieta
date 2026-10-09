/* Ekran Moje konto (D-321): dane konta tylko do odczytu i zmiana wlasnego hasla przez
   Auth.zmienHaslo (assets/haslo-zmiana.js). Dostepny dla kazdego zalogowanego. Same deklaracje. */

var POLA_HASLA_23 = [["obecne", "obecne23", "bladObecne23"], ["nowe", "nowe23", "bladNowe23"], ["powtorzone", "powtorzone23", "bladPowtorzone23"]];

function el23(id) { return document.getElementById(id); }

function wierszDanych23(etykieta, wartosc) {
  return "<dt>" + esc(etykieta) + "</dt><dd>" + (wartosc ? esc(wartosc) : '<span class="muted">-</span>') + "</dd>";
}

function renderDane23() {
  var s = Auth.sesja();
  var konto = Store.one("SELECT ostatnie_logowanie FROM uzytkownicy WHERE id = ?", [s.uzytkownik_id]) || {};
  el23("daneKonta23").innerHTML = wierszDanych23("Imię i nazwisko", s.imie) + wierszDanych23("Login", s.login) +
    wierszDanych23("Rola", s.rola_nazwa) + wierszDanych23("Instytucja", s.instytucja_nazwa || (s.rola_typ === "pracownik" ? "LDIT" : "")) +
    wierszDanych23("Ostatnie logowanie", konto.ostatnie_logowanie);
  el23("login23").value = s.login;
}

function pokazBledy23(bledy) {
  var pierwsze = null;
  POLA_HASLA_23.forEach(function (p) {
    var tekst = bledy[p[0]] || "";
    el23(p[2]).textContent = tekst;
    el23(p[1]).setAttribute("aria-invalid", tekst ? "true" : "false");
    if (tekst && !pierwsze) pierwsze = el23(p[1]);
  });
  if (pierwsze) pierwsze.focus();
}

function zmienHaslo23(e) {
  e.preventDefault();
  var wynik = Auth.zmienHaslo(el23("obecne23").value, el23("nowe23").value, el23("powtorzone23").value);
  var komunikat = el23("komunikat23");
  if (!wynik.ok) {
    pokazBledy23(wynik.bledy);
    komunikat.textContent = wynik.bledy.ogolny || "Popraw zaznaczone pola.";
    komunikat.style.color = "var(--neg-ink)";
    return;
  }
  pokazBledy23({});
  POLA_HASLA_23.forEach(function (p) { el23(p[1]).value = ""; });
  if (window.KFS && KFS.zapiszTeraz) KFS.zapiszTeraz();
  komunikat.textContent = "Hasło zostało zmienione. Przy następnym logowaniu użyj nowego hasła.";
  komunikat.style.color = "var(--pos-ink)";
}

function inicjuj23() {
  renderDane23();
  el23("politykaHasla23").textContent = ZmianaHasla.POLITYKA;
  el23("formHasla23").addEventListener("submit", zmienHaslo23);
}
