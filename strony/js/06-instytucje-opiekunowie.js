/* Ekran Instytucje: opiekunowie instytucji, wybor wielokrotny z kont pracownikow
   (D-274, zastepuje pole "Opiekun LDIT"). Zapis do instytucja_opiekunowie.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

/* Konta, ktore moga opiekowac sie instytucja: typ konta pracownik (w tym administrator) */
function kontaPracownikow06() {
  return Store.query("SELECT u.id, u.imie_nazwisko AS imie FROM uzytkownicy u JOIN role r ON r.id = u.rola_id " +
                     "WHERE r.typ = 'pracownik' ORDER BY u.imie_nazwisko");
}

function poleOpiekunow06(instytucjaId) {
  var wybrani = instytucjaId
    ? Store.query("SELECT uzytkownik_id AS id FROM instytucja_opiekunowie WHERE instytucja_id = ?", [instytucjaId]).map(function (r) { return r.id; })
    : [];
  return '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Opiekunowie instytucji</span>' +
    '<select class="inp" id="if_opiekunowie" multiple data-wielo>' + kontaPracownikow06().map(function (k) {
      return '<option value="' + esc(k.id) + '"' + (wybrani.indexOf(k.id) >= 0 ? " selected" : "") + ">" + esc(k.imie) + "</option>";
    }).join("") + "</select></label>";
}

/* Roznica miedzy wyborem a baza: usuwa odznaczonych, dopisuje nowych */
function zapiszOpiekunow06(instytucjaId) {
  var wybrani = Wielowybor.wartosci(el("if_opiekunowie"));
  var obecni = Store.query("SELECT id, uzytkownik_id FROM instytucja_opiekunowie WHERE instytucja_id = ?", [instytucjaId]);
  obecni.forEach(function (o) { if (wybrani.indexOf(o.uzytkownik_id) < 0) Store.remove("instytucja_opiekunowie", o.id); });
  wybrani.forEach(function (u) {
    if (!obecni.some(function (o) { return o.uzytkownik_id === u; })) {
      Store.insert("instytucja_opiekunowie", { instytucja_id: instytucjaId, uzytkownik_id: u }, "IO-");
    }
  });
}
