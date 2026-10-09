/* Ekran 20, czesc 3: pelne dane formularza w panelu szczegolow (D-245) i wprowadzanie
   formularza przez LDIT lub instytucje (D-244). Formularz z brakami jest przyjmowany,
   braki pokazujemy zatwierdzajacemu i wysylajacemu. Same deklaracje. */

var RODZAJE_ZATRUDNIENIA_20 = { umowa_o_prace: "umowa o pracę", umowa_zlecenie: "umowa zlecenie", umowa_o_dzielo: "umowa o dzieło",
                                wlasciciel: "właściciel / JDG", inna: "inna" };
var POWIADOMIENIE_20 = { id: null };

function zrodloFormularza20(f) {
  var nazwa = f.zrodlo === "csv" ? "plik CSV" : f.zrodlo === "pdf" ? "plik PDF" : "ręcznie w systemie";
  var podglad = f.plikId ? ' <button class="btn xs" onclick="podgladPliku20(\'' + escJs(f.plikId) + '\')">Podgląd</button>' : "";
  return esc(nazwa) + (f.plik ? ", " + esc(f.plik) + podglad : "");
}

/* Podglad wgranego pliku formularza (D-287): czy dane dobrze sie rozczytaly */
function podgladPliku20(id) {
  var p = Store.find("pliki", id);
  if (!p || !p.tresc) { window.alert("Plik nie ma zapisanej treści."); return; }
  var bajty = Uint8Array.from(atob(p.tresc), function (c) { return c.charCodeAt(0); });
  window.open(URL.createObjectURL(new Blob([bajty], { type: p.typ || "text/plain" })), "_blank");
}

/* PESEL to dane wrazliwe: bez feature klient.pesel pokazujemy tylko, czy jest podany */
function peselFormularza20(pesel) {
  if (!pesel) return '<span class="muted">brak</span>';
  return Auth.moze("klient.pesel") ? '<span class="mono">' + esc(pesel) + "</span>" : '<span class="muted">ukryty</span>';
}

function tabelaUczestnikow20(lista) {
  if (!lista.length) return '<div class="small muted">Formularz nie zawiera uczestników.</div>';
  return '<table class="tbl" style="margin-top:6px"><thead><tr><th>Imię i nazwisko</th><th>Zatrudnienie</th><th>Wykształcenie</th><th>Zawód</th><th>PESEL</th></tr></thead><tbody>' +
    lista.map(function (u) {
      return "<tr><td class='strong'>" + esc(u.imie_nazwisko) + "</td><td class='small'>" + esc(RODZAJE_ZATRUDNIENIA_20[u.rodzaj_zatrudnienia] || u.rodzaj_zatrudnienia || "") +
        "</td><td class='small'>" + esc(u.wyksztalcenie) + "</td><td class='small'>" + esc(u.zawod) + "</td><td>" + peselFormularza20(u.pesel) + "</td></tr>";
    }).join("") + "</tbody></table>";
}

function notaBrakow20(f) {
  var wyslano = POWIADOMIENIE_20.id === f.id ? '<b>Wysłano do akceptacji.</b> ' : "";
  if (!f.braki.length) return wyslano ? '<div class="note mb0" style="margin-bottom:12px">' + wyslano + 'Formularz kompletny.</div>' : "";
  return '<div class="note warn mb0" style="margin-bottom:12px">' + wyslano + '<b>Niekompletne dane przesłanego formularza.</b> Brakuje: ' +
    esc(f.braki.join(", ")) + '. Formularz jest przyjęty, bo nabór trzeba obserwować, ale dane trzeba uzupełnić.</div>';
}

function daneFirmy20(f) {
  return sekcjeKlienta20(f) + sekcjaZgloszenia20(f);
}

function panelFormularza20(f) {
  var duplikat = f.status === "oczekuje" ? Akceptacje.klientWZakresieZNip(f.nip, f.isId) : null;
  el20("tytulPanelu").textContent = f.firma;
  el20("subPanelu").textContent = "formularz " + f.id;
  el20("panel").innerHTML = przyciskEdycji20(f) + notaBrakow20(f) + daneFirmy20(f) +
    '<div class="small strong" style="margin-top:12px">Uczestnicy (' + f.uczestnicy.length + ')</div>' + tabelaUczestnikow20(f.uczestnicy) +
    (duplikat ? ostrzezenieDuplikatu20(f, duplikat) : "") +
    (f.status === "oczekuje" ? decyzja20("Akceptuj i dodaj do bazy klientów", "Akceptacja tworzy klienta w Bazie klientów (albo dopisuje istniejącego), przenosi na jego kartę komplet danych z formularza i uczestników oraz przypisuje go do instytucji. Po akceptacji założysz projekt tą samą ścieżką co ręcznie, z danymi z formularza. Niekompletny formularz możesz zwrócić instytucji do uzupełnienia.", f.braki.length ? zwrotFormularza20() : "")
      : rozpatrzenie20(f));
}

/* Formularz zajmuje cala szerokosc strony: lista i panel szczegolow chowaja sie na czas wpisywania */
function pokazFormularz20(otwarty) {
  el20("uklad20").hidden = otwarty;
  if (otwarty) el20("zfKontener20").scrollIntoView({ block: "start" });
}

/* Edycja danych formularza przed decyzja (D-314): ten sam formularz co przy wprowadzaniu, z danymi */
function przyciskEdycji20(f) {
  if (!Akceptacje.edycjaFormularza(Store.find("formularze_oczekujace", f.id)).mozna) return "";
  return '<div class="btn-row" style="margin-bottom:10px"><button class="btn sm" onclick="edytujFormularz20(\'' + escJs(f.id) + '\')">Edytuj dane formularza</button></div>';
}

function edytujFormularz20(id) {
  var wiersz = Store.find("formularze_oczekujace", id);
  var ocena = Akceptacje.edycjaFormularza(wiersz);
  if (!ocena.mozna) return;
  var instytucja = DB.INSTYTUCJE.filter(function (i) { return i.id === wiersz.instytucja_id; })[0];
  pokazFormularz20(true);
  zfPokaz({
    kontener: "zfKontener20", instytucjaId: wiersz.instytucja_id, instytucjaNazwa: instytucja ? instytucja.nazwa : wiersz.instytucja_id,
    szkolenia: DB.SZKOLENIA.filter(function (s) { return s.is === wiersz.instytucja_id; }).map(function (s) { return [s.nazwa, s.nazwa]; }),
    edycja: { id: id, zwrot: ocena.zwrot },
    poZamknieciu: function () { pokazFormularz20(false); },
    poZapisie: function () { zfZamknij(); STAN_20.wybrany = id; render20(); }
  });
}

/* Wprowadzanie formularza przez LDIT lub instytucje; panel szczegolow na czas wpisywania znika */
function nowyFormularz20() {
  pokazFormularz20(true);
  zfPokaz({
    kontener: "zfKontener20",
    instytucje: DB.INSTYTUCJE.map(function (i) { return [i.id, i.nazwa]; }),
    szkolenia: DB.SZKOLENIA.map(function (s) { return [s.nazwa, s.nazwa]; }),
    poZamknieciu: function () { pokazFormularz20(false); },
    poWyslaniu: function (nowy, braki) {
      POWIADOMIENIE_20 = { id: nowy.id };
      STAN_20.widok = "formularze";
      STAN_20.wybrany = nowy.id;
      render20();
    }
  });
}
