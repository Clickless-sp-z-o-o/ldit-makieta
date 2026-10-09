/* Ekran Terminy: dodawanie, edycja i usuwanie terminow przez Store.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
function opcjeSzkolen(sel) {
  return DB.SZKOLENIA.map(function (s) {
    return '<option value="' + esc(s.id) + '"' + (sel === s.id ? " selected" : "") + '>' +
           esc(nazwaIS(s.is) + " - " + s.nazwa) + '</option>';
  }).join("");
}
function opcjeStatus(sel) {
  return ["Wolny", "Zaplanowany", "Odbyty"].map(function (s) {
    return '<option' + (sel === s ? " selected" : "") + '>' + s + '</option>';
  }).join("");
}

function wierszEdycji(t) {
  return '<tr class="row-nabor">' +
      '<td class="mono strong">' + esc(t.id) + '</td>' +
      '<td class="strong nowrap">' + esc(t.nazwa) + '<div class="small muted">' + esc(t.szk) + '</div></td>' +
      '<td class="nowrap">' + esc(nazwaIS(t.is)) + '</td>' +
      '<td><input class="inp" id="edOd" type="date" value="' + esc(t.od) + '" style="width:150px"></td>' +
      '<td><input class="inp" id="edDo" type="date" value="' + esc(t.do) + '" style="width:150px"></td>' +
      '<td><input class="inp" id="edMiejsce" value="' + esc(t.miejsce) + '"></td>' +
      '<td><select class="inp" id="edStatus">' + opcjeStatus(t.status) + '</select></td>' +
      '<td><div class="btn-row">' +
        '<span class="small muted" title="Liczba wynika z przypisanych uczestników">' + zapisani(t) + ' z</span>' +
        '<input class="inp" id="edLimit" type="number" min="1" value="' + esc(t.limit) + '" style="width:70px" title="Limit miejsc">' +
      '</div></td>' +
      '<td class="right nowrap"><div class="btn-row" style="justify-content:flex-end">' +
        '<button class="btn xs primary" onclick="zapiszEdycje(\'' + escJs(t.id) + '\')">Zapisz</button>' +
        '<button class="btn xs" onclick="anulujEdycje()">Anuluj</button>' +
      '</div></td>' +
    '</tr>';
}

function pokazForm() {
  var f = el("addForm");
  f.innerHTML =
    '<div class="small strong" style="margin-bottom:8px">Nowy termin</div>' +
    '<div class="toolbar" style="flex-wrap:wrap;gap:8px;padding:0">' +
      '<select class="inp" id="nfSzk" style="min-width:280px">' + opcjeSzkolen("") + '</select>' +
      '<input class="inp" id="nfOd" type="date" value="' + esc(STAN_13.DZIS) + '" title="Data od">' +
      '<input class="inp" id="nfDo" type="date" value="' + esc(STAN_13.DZIS) + '" title="Data do">' +
      '<input class="inp" id="nfMiejsce" placeholder="Miejsce, np. Online / adres" style="min-width:200px">' +
      '<select class="inp" id="nfStatus">' + opcjeStatus("Wolny") + '</select>' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Przypisz do wniosku (opcjonalnie)</span>' +
      '<select class="inp" id="nfWniosek" style="min-width:260px"></select></label>' +
      '<input class="inp" id="nfLimit" type="number" min="1" placeholder="Limit miejsc" style="width:110px" title="Limit miejsc">' +
      '<button class="btn primary sm" onclick="zapiszNowyTermin()">Zapisz termin</button>' +
      '<button class="btn sm" onclick="ukryjForm()">Anuluj</button>' +
    '</div>';
  f.style.display = "block";
  el("nfSzk").addEventListener("change", odswiezWnioskiDoTerminu13);
  odswiezWnioskiDoTerminu13();
}
function ukryjForm() {
  var f = el("addForm");
  f.style.display = "none";
  f.innerHTML = "";
}

function zapiszNowyTermin() {
  var szk = DB.SZKOLENIA.filter(function (s) { return s.id === el("nfSzk").value; })[0];
  if (!szk) return;
  var od = el("nfOd").value;
  if (!od) { el("nfOd").focus(); return; }
  var wniosekId = el("nfWniosek").value;
  var nowy = Store.insert("terminy", {
    instytucja_id: szk.is, szkolenie_id: szk.id, nazwa: szk.nazwa,
    data_od: od, data_do: el("nfDo").value || od,
    miejsce: el("nfMiejsce").value.trim() || null,
    status_realizacji: wniosekId ? "Zaplanowany" : el("nfStatus").value,
    zapisani: 0, limit_miejsc: parseInt(el("nfLimit").value, 10) || null
  }, "TR-");
  /* Termin z wnioskiem: uczestnicy wniosku z tym szkoleniem dostaja ten termin; bez wniosku zostaje wolny termin instytucji */
  if (wniosekId) przypiszTerminDoWniosku13(nowy.id, wniosekId, szk.id);
  ukryjForm();   /* przerysowanie nastapi przez zdarzenie db:changed */
}

function edytujTermin(id) { STAN_13.edytowany = id; renderLista(); }
function anulujEdycje() { STAN_13.edytowany = null; renderLista(); }
function zapiszEdycje(id) {
  var patch = {
    data_od: el("edOd").value, data_do: el("edDo").value,
    miejsce: el("edMiejsce").value.trim() || null,
    status_realizacji: el("edStatus").value,
    limit_miejsc: parseInt(el("edLimit").value, 10) || null
  };
  STAN_13.edytowany = null;   /* wyczysc przed zapisem, by db:changed odrysowal normalny wiersz */
  Store.update("terminy", id, patch);
}

/* Termin z uczestnikami nie jest usuwany (klucz obcy uczestnicy.termin_id) */
function usunTermin(id) {
  var n = (STAN_13.uczestnicyPoTerminie[id] || []).length;
  if (n > 0) {
    window.alert("Nie można usunąć terminu " + id + ": ma przypisanych uczestników (" + n +
      "). Najpierw przenieś ich na inny termin.");
    return;
  }
  if (window.confirm("Usunąć termin " + id + "? Operacja dotyczy tylko danych makiety.")) {
    Store.remove("terminy", id);
  }
}

/* Licznik przy zakladce Projekty: tyle wierszy, ile pokaze domyslna zakladka roku w Zestawieniach.
   Rola bez modulu Dofinansowan (instytucja) nie ma tej zakladki na pasku (Nawigacja). */
function odswiezLicznikProjektow() {
  var licznik = el("navProjekty");
  if (!licznik) return;
  var rok = Lata.domyslny();
  licznik.textContent = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return String(w.rok) === rok; }).length;
}

function odswiez13() {
  STAN_13.T = DB.TERMINY;
  wczytajUczestnikow();
  wypelnijFiltryIS();
  el("btnNowy").style.display = moznaEdytowac() ? "" : "none";
  odswiezLicznikProjektow();
  renderKalendarz();
  renderLista();
}
