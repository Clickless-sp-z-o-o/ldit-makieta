/* Ekran Terminy: przypisanie nowego terminu do wniosku (uwaga 08.10). Kandydaci to wnioski widoczne
   dla konta, ktorych uczestnicy maja to szkolenie bez terminu. Wybor ustawia termin_id w uczestnik_szkolenia
   tych uczestnikow (straznik: termin tej samej instytucji, StraznikWlasnosc.terminUczestnika).
   Bez wyboru powstaje wolny termin instytucji. Tylko deklaracje. */

/* Uczestnicy wniosku z danym szkoleniem, jeszcze bez terminu */
function uczestnicyBezTerminu13(w, szkolenieId) {
  return (w.uczestnicy || []).filter(function (u) { return u.szkolenie === szkolenieId && !u.termin; });
}

function wnioskiDoTerminu13(szkolenieId) {
  return DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return uczestnicyBezTerminu13(w, szkolenieId).length; });
}

function opcjeWnioskow13(szkolenieId) {
  return '<option value="">bez wniosku: wolny termin instytucji</option>' + wnioskiDoTerminu13(szkolenieId).map(function (w) {
    var n = uczestnicyBezTerminu13(w, szkolenieId).length;
    return '<option value="' + esc(w.id) + '">' + esc(w.klNazwa + ", wniosek " + w.id + " (" + n + " os. bez terminu)") + '</option>';
  }).join("");
}

function odswiezWnioskiDoTerminu13() {
  var pole = el("nfWniosek");
  if (pole) pole.innerHTML = opcjeWnioskow13(el("nfSzk").value);
}

/* Zwraca liczbe przypisanych uczestnikow; kazde przypisanie trafia do rejestru aktywnosci */
function przypiszTerminDoWniosku13(terminId, wniosekId, szkolenieId) {
  var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === wniosekId; })[0];
  if (!w) return 0;
  var sesja = Auth.sesja();
  var osoby = uczestnicyBezTerminu13(w, szkolenieId);
  osoby.forEach(function (u) { Store.update("uczestnik_szkolenia", u.id, { termin_id: terminId }); });
  Store.insert("rejestr_aktywnosci", { czas: new Date().toISOString(), kto: sesja.imie || sesja.uzytkownik_id,
    typ: "Przypisanie terminu do wniosku", obiekt: wniosekId, pole: "Termin", przed: "brak",
    po: terminId + " (" + osoby.length + " os.)" }, "AKT-");
  /* Termin ustawiony przez LDIT trafia do instytucji jako powiadomienie (D-317); instytucja wie, co sama przypisala */
  if (osoby.length && !sesja.instytucja_id) Powiadomienia.oTerminie(w, Store.find("terminy", terminId) || {});
  return osoby.length;
}
