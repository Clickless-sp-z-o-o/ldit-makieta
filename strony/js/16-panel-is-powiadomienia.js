/* Panel instytucji: powiadomienia instytucji (D-317). Lista z Powiadomienia.widoczne(), czyli tylko
   powiadomienia tej instytucji i adresowane do zalogowanej osoby; przeczytanie zapisuje kto i kiedy.
   Odnosnik prowadzi do formularza (edycja, gdy mozliwa) albo do projektu klienta na liscie powyzej. Same deklaracje. */

var LIMIT_POWIADOMIEN_16 = 30;

function odnosnikPowiadomienia16(p) {
  if (p.tabela === "formularze_oczekujace") {
    var f = Store.find("formularze_oczekujace", p.rekord_id);
    if (f && Akceptacje.edycjaFormularza(f).mozna) return '<a href="21-nowy-formularz.html?edytuj=' + encodeURIComponent(p.rekord_id) + '">Popraw formularz</a>';
    return "";
  }
  if (p.tabela === "wnioski") {
    var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === p.rekord_id; })[0];
    return w ? '<button class="btn xs" onclick="pokazProjekt16(\'' + escJs(w.klNazwa) + '\')">Pokaż projekt</button>' : "";
  }
  return "";
}

/* Projekt klienta na liscie "Moi klienci i ich projekty": wyszukanie po nazwie klienta */
function pokazProjekt16(nazwa) {
  el16("szukaj").value = nazwa;
  renderKlienci16();
  el16("szukaj").scrollIntoView({ block: "start" });
}

function wierszPowiadomienia16(p) {
  var nowe = !p.rozwiazano;
  return '<tr' + (nowe ? ' class="powiadomienie-nowe"' : "") + '><td class="small nowrap mono">' + esc(DB.fmtDate(String(p.utworzono).slice(0, 10))) + '</td>' +
    '<td>' + (nowe ? '<span class="tag neg">nowe</span> ' : "") + esc(p.tresc) + '<div class="small">' + odnosnikPowiadomienia16(p) + '</div></td>' +
    '<td class="right">' + (nowe ? '<button class="btn xs" onclick="oznaczPrzeczytane16(\'' + escJs(p.id) + '\')" aria-label="Oznacz jako przeczytane: ' + esc(p.tresc) + '">Przeczytane</button>' : "") + '</td></tr>';
}

function renderPowiadomienia16() {
  var lista = Powiadomienia.widoczne();
  var nowe = lista.filter(function (p) { return !p.rozwiazano; }).length;
  el16("powiadomieniaInfo16").textContent = nowe ? nowe + " nieprzeczytanych" : "wszystkie przeczytane";
  el16("btnPrzeczytane16").hidden = !nowe;
  el16("listaPowiadomien16").innerHTML = lista.length ? lista.slice(0, LIMIT_POWIADOMIEN_16).map(wierszPowiadomienia16).join("") :
    '<tr><td colspan="3" class="small muted">Brak powiadomień. Pojawią się tu decyzje LDIT o formularzach i zmianach danych oraz decyzje urzędów dla Twoich klientów.</td></tr>';
}

/* Po zapisie powloka dostaje nowy licznik (Nawigacja.zglosEkran) */
function poZmianiePowiadomien16() {
  renderPowiadomienia16();
  if (window.KFS && KFS.zapiszTeraz) KFS.zapiszTeraz();
  Nawigacja.zglosEkran();
}

function oznaczPrzeczytane16(id) {
  Powiadomienia.oznacz(id);
  poZmianiePowiadomien16();
}

function oznaczWszystkie16() {
  Powiadomienia.oznaczWszystkie();
  poZmianiePowiadomien16();
}
