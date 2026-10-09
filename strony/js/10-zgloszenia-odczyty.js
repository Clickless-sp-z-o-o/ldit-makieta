/* Zgloszenia: nieprzeczytane per konto (D-315). Brak wiersza w zgloszenia_odczyty = nowe dla
   tego konta; licznik czerwony w menu powloki liczy Nawigacja.noweZgloszenia. Tylko deklaracje. */

function noweZgloszenia10() {
  var mapa = {};
  (Nawigacja.noweZgloszenia(Auth, DB) || []).forEach(function (id) { mapa[id] = true; });
  return mapa;
}

function terazIso10() { return new Date().toISOString(); }

function zapiszOdczyt10(id) {
  Store.insert("zgloszenia_odczyty", { uzytkownik_id: Auth.sesja().uzytkownik_id, zgloszenie_id: id, przeczytano: terazIso10() }, "ZGO-");
}

/* Zapis odswieza liste przez db:changed; powloka dostaje nowy licznik */
function oznaczPrzeczytane10(id) {
  if (!noweZgloszenia10()[id]) return;
  zapiszOdczyt10(id);
  Nawigacja.zglosEkran();
}

function oznaczWszystkie10() {
  Object.keys(noweZgloszenia10()).forEach(zapiszOdczyt10);
  Nawigacja.zglosEkran();
}

function znacznikNowego10(nowe, id) {
  return nowe[id] ? '<span class="tag neg dot">nowe</span>' : "";
}

function przyciskPrzeczytane10(nowe, id) {
  return nowe[id] ? '<button class="btn sm" onclick="oznaczPrzeczytane10(\'' + escJs(id) + '\')">Oznacz jako przeczytane</button>' : "";
}

function odswiezPrzyciskWszystkich10(nowe) {
  var przycisk = document.getElementById("btnPrzeczytane");
  var liczba = Object.keys(nowe).length;
  przycisk.hidden = !liczba;
  przycisk.textContent = "Oznacz wszystkie jako przeczytane (" + liczba + ")";
}
