/* Konta i uprawnienia, zakladka 2: zapis nadan rol w role_funkcje (D-211).
   Kazda zmiana zapisuje sie od razu i trafia do rejestru aktywnosci (typ "Zmiana uprawnień"),
   autor z sesji. Store.exec przepuszcza straznik tylko roli z ustaw.manage. */
var KOMUNIKAT_USTAW = "Nie możesz odebrać własnej roli prawa ustaw.manage (edycja modułu Ustawienia), " +
  "bo stracisz dostęp do tego ekranu.";

/* Nadania po zmianie poziomu modulu, liczone w pamieci przed zapisem */
function nadaniaPoZmianie(nadania, modulId, poziom) {
  var stare = [modulId + ".view", modulId + ".manage", modulId + ".*"];
  var wynik = nadania.filter(function (n) { return stare.indexOf(n) < 0; });
  if (poziom === "podglad") wynik.push(modulId + ".view");
  if (poziom === "edycja") wynik.push(modulId + ".*");
  return wynik;
}

/* Blokada: zalogowany nie odbiera sobie ustaw.manage */
function odbieraUstawManage(rolaId, nadaniaPo) {
  return rolaId === Auth.rola() && !Funkcje.pasuje(nadaniaPo, "ustaw.manage");
}

function odswiezUprawnienia11() {
  Funkcje.wyczyscPamiec();
  renderKonfig();
}

/* Poziom modulu: usun nadania modul.view / modul.manage / modul.*, potem wstaw nowe */
function zapiszPoziomModulu(rolaId, modulId, poziom) {
  Store.exec("DELETE FROM role_funkcje WHERE rola_id = ? AND funkcja IN (?, ?, ?)",
    [rolaId, modulId + ".view", modulId + ".manage", modulId + ".*"]);
  if (poziom === "podglad") Store.insert("role_funkcje", { rola_id: rolaId, funkcja: modulId + ".view" });
  if (poziom === "edycja") Store.insert("role_funkcje", { rola_id: rolaId, funkcja: modulId + ".*" });
}

function zmienPoziom(modulId, poziom) {
  var rolaId = STAN_11.aktywna, nadania = Funkcje.nadania(rolaId);
  var przed = poziomModulu(nadania, modulId);
  if (przed === poziom) return;
  if (odbieraUstawManage(rolaId, nadaniaPoZmianie(nadania, modulId, poziom))) {
    window.alert(KOMUNIKAT_USTAW);
    renderKonfig();
    return;
  }
  zapiszPoziomModulu(rolaId, modulId, poziom);
  wpiszAktywnosc("Zmiana uprawnień", rolaId + " / " + modulId, "Poziom modułu", przed, poziom);
  odswiezUprawnienia11();
}

function zmienFeature(klucz, widoczne) {
  var rolaId = STAN_11.aktywna;
  var przed = Funkcje.pasuje(Funkcje.nadania(rolaId), klucz);
  if (przed === widoczne) return;
  if (widoczne) Store.insert("role_funkcje", { rola_id: rolaId, funkcja: klucz });
  else Store.exec("DELETE FROM role_funkcje WHERE rola_id = ? AND funkcja = ?", [rolaId, klucz]);
  wpiszAktywnosc("Zmiana uprawnień", rolaId + " / " + klucz, "Uprawnienie pola", przed ? "tak" : "nie", widoczne ? "tak" : "nie");
  odswiezUprawnienia11();
}

/* Hurtowa zmiana modulow roli: jeden wpis w rejestrze zamiast kilkunastu */
function ustawWszystkieModuly(poziom) {
  var rolaId = STAN_11.aktywna, lista = moduly11();
  var nadania = lista.reduce(function (n, m) { return nadaniaPoZmianie(n, m.id, poziom); }, Funkcje.nadania(rolaId));
  if (odbieraUstawManage(rolaId, nadania)) {
    window.alert(KOMUNIKAT_USTAW);
    return;
  }
  lista.forEach(function (m) { zapiszPoziomModulu(rolaId, m.id, poziom); });
  wpiszAktywnosc("Zmiana uprawnień", rolaId, "Poziom wszystkich modułów", "różne", poziom);
  odswiezUprawnienia11();
}
function zaznaczWszystko(zaznacz) { ustawWszystkieModuly(zaznacz ? "edycja" : "brak"); }

/* Nowa rola: wiersz w role i zero nadan, czyli brak dostepu domyslnie */
function nowaRola() {
  var n = prompt("Nazwa nowej roli:", "Menedżer zespołu");
  if (!n || !n.trim()) return;
  var id = "rola" + Date.now();
  Store.insert("role", { id: id, nazwa: n.trim(), opis: "Rola własna, utworzona przez administratora.", typ: "pracownik", systemowa: 0 });
  STAN_11.aktywna = id;
  wpiszAktywnosc("Zmiana uprawnień", id, "Nowa rola", "", n.trim());
}
