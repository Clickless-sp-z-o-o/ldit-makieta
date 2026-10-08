/* Konta i uprawnienia, zakladka 1: zapis kont. Haslo nigdy jawnie: sol i skrot (assets/haslo.js).
   Konto roli instytucji ma DOKLADNIE jedna instytucje (instytucja_id i jeden wiersz
   uzytkownik_instytucja), konta LDIT dostaja przydzial w siatce na zakladce 4. */
function zbierzUsera() {
  var rolaId = document.getElementById("uf_rola").value;
  var jedna = czyRolaInstytucji(rolaId);
  return {
    imie_nazwisko: document.getElementById("uf_imie").value.trim(),
    rola_id: rolaId,
    instytucja_id: jedna ? (document.getElementById("uf_inst").value || null) : null,
    /* dostep do wszystkich instytucji wynika z prawa zarzadzania ustawieniami, nie z nazwy roli */
    wszystkie_instytucje: rolaMaFunkcje(rolaId, "ustaw.manage") ? 1 : 0,
    dwa_fa: document.getElementById("uf_2fa").checked ? 1 : 0
  };
}

function ustawJednaInstytucje(login, instytucjaId) {
  Store.exec("DELETE FROM uzytkownik_instytucja WHERE uzytkownik_id = ?", [login]);
  if (instytucjaId) Store.insert("uzytkownik_instytucja", { uzytkownik_id: login, instytucja_id: instytucjaId });
}
function wyczyscPrzydzial(login) {
  Store.exec("DELETE FROM uzytkownik_instytucja WHERE uzytkownik_id = ?", [login]);
}

function dodajKonto(dane, login) {
  var domyslne = Store.one("SELECT wartosc FROM meta WHERE klucz = 'haslo_demo'");
  var sol = losowaSol();
  Store.insert("uzytkownicy", {
    id: login, login: login, haslo_sol: sol, haslo_skrot: Haslo.skrot(domyslne.wartosc, sol),
    imie_nazwisko: dane.imie_nazwisko, rola_id: dane.rola_id, instytucja_id: dane.instytucja_id,
    wszystkie_instytucje: dane.wszystkie_instytucje, ostatnie_logowanie: null,
    dwa_fa: dane.dwa_fa, zablokowane: 0
  });
  if (dane.instytucja_id) ustawJednaInstytucje(login, dane.instytucja_id);
  wpiszAktywnosc("Zmiana konta", login, "Utworzenie konta", "", rolaPoId(dane.rola_id).nazwa);
}

function zmienKonto(login, dane) {
  var stare = DB.UZYTKOWNICY.filter(function (x) { return x.login === login; })[0];
  Store.update("uzytkownicy", login, dane);
  if (dane.instytucja_id) ustawJednaInstytucje(login, dane.instytucja_id);
  else if (stare.rolaId !== dane.rola_id) wyczyscPrzydzial(login);
  if (stare.rolaId !== dane.rola_id) {
    wpiszAktywnosc("Zmiana uprawnień", login, "Rola konta", stare.rola, rolaPoId(dane.rola_id).nazwa);
  } else {
    wpiszAktywnosc("Zmiana konta", login, "Dane konta", "", "zapisano");
  }
}

function zapiszUsera() {
  var dane = zbierzUsera();
  if (!dane.imie_nazwisko) { document.getElementById("uf_imie").focus(); return; }
  if (czyRolaInstytucji(dane.rola_id) && !dane.instytucja_id) {
    window.alert("Konto tej roli musi mieć dokładnie jedną instytucję.");
    return;
  }
  if (STAN_11.edytowany) {
    zmienKonto(STAN_11.edytowany, dane);
  } else {
    var login = document.getElementById("uf_login").value.trim().toLowerCase();
    if (!login) { document.getElementById("uf_login").focus(); return; }
    if (Store.one("SELECT id FROM uzytkownicy WHERE lower(login) = ?", [login])) {
      window.alert("Konto o tym adresie już istnieje.");
      return;
    }
    dodajKonto(dane, login);
  }
  zamknijUserForm();
}

function usunUsera(login) {
  if (login === Auth.sesja().login) { window.alert("Nie można usunąć własnego konta."); return; }
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === login; })[0];
  if (!window.confirm("Usunąć konto " + (u ? u.imie : login) + " (" + login + ")?")) return;
  Store.remove("uzytkownicy", login);
  wpiszAktywnosc("Zmiana konta", login, "Usunięcie konta", u ? u.rola : "", "");
}
