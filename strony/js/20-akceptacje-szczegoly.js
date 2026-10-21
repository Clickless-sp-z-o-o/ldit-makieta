/* Ekran 20, czesc 3: pelne dane formularza w panelu szczegolow (D-245) i wprowadzanie
   formularza przez LDIT lub instytucje (D-244). Formularz z brakami jest przyjmowany,
   braki pokazujemy zatwierdzajacemu i wysylajacemu. Podglad w tym samym ukladzie co formularz
   (spotkanie 14.10): sekcje z wierszami Pole | Wartosc (zfPodgladHtml z 16-formularz-pola.js),
   uczestnicy w tabeli, osoba w wierszu. Same deklaracje. */

var RODZAJE_ZATRUDNIENIA_20 = { umowa_o_prace: "umowa o pracę", umowa_zlecenie: "umowa zlecenie", umowa_o_dzielo: "umowa o dzieło",
                                wlasciciel: "właściciel / JDG", inna: "inna" };
var POWIADOMIENIE_20 = { id: null };

function zrodloFormularza20(f) {
  var nazwa = { csv: "plik CSV", xlsx: "plik Excel", pdf: "plik PDF" }[f.zrodlo] || "ręcznie w systemie";
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

/* Uczestnik formularza z informacja o zatrudnieniu: rodzaj, zatrudnienie od - do i stanowisko (kolumna zawod, D-368,
   feedback Martyny 19.10.2026). Brak rodzaju i dat widac od razu ("brak"), bo decyduja o kwalifikacji do KFS. */
function tabelaUczestnikow20(lista) {
  var tytul = '<div class="zf-sekcja">Uczestnicy (' + lista.length + ') <span class="zf-sekcja-opis">jedna osoba w wierszu</span></div>';
  if (!lista.length) return '<div class="zf-arkusz">' + tytul + '<div class="small muted" style="padding:8px 10px">Formularz nie zawiera uczestników.</div></div>';
  var brak = '<span class="muted">brak</span>';
  return '<div class="zf-arkusz">' + tytul + '<div class="zf-tab-ramka"><table class="zf-tab"><thead><tr><th class="num">Lp.</th><th>Imię i nazwisko</th><th>Rodzaj zatrudnienia</th>' +
    '<th>Zatrudnienie od - do</th><th>Stanowisko</th><th>Wykształcenie</th><th>PESEL</th></tr></thead><tbody>' +
    lista.map(function (u, i) {
      return "<tr><td class='num muted'>" + (i + 1) + "</td><td class='strong'>" + esc(u.imie_nazwisko) + "</td><td>" +
        (esc(RODZAJE_ZATRUDNIENIA_20[u.rodzaj_zatrudnienia] || u.rodzaj_zatrudnienia || "") || brak) +
        "</td><td class='nowrap'>" + (u.zatrudnienie_od || u.zatrudnienie_do ? esc(DB.fmtZatrudnienie(u.zatrudnienie_od, u.zatrudnienie_do)) : brak) +
        "</td><td>" + (esc(u.zawod) || brak) +
        "</td><td>" + esc(u.wyksztalcenie) + "</td><td>" + peselFormularza20(u.pesel) + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";
}

function notaBrakow20(f) {
  var wyslano = POWIADOMIENIE_20.id === f.id ? '<b>Wysłano do akceptacji.</b> ' : "";
  if (!f.braki.length) return wyslano ? '<div class="note mb0" style="margin-bottom:12px">' + wyslano + 'Formularz kompletny.</div>' : "";
  return '<div class="note warn mb0" style="margin-bottom:12px">' + wyslano + '<b>Niekompletne dane przesłanego formularza.</b> Brakuje: ' +
    esc(f.braki.join(", ")) + '. Formularz jest zapisany, bo nabór trzeba obserwować, ale zaakceptować można go dopiero po uzupełnieniu. Odeślij go do uzupełnienia.</div>';
}

/* Zgloszenie (szkolenie, instytucja, kto i jak wprowadzil) w tym samym ukladzie wierszy co dane firmy */
function sekcjaZgloszeniaZf20(f) {
  return zfArkusz("Zgłoszenie", [
    zfWiersz("", "Szkolenie", esc(f.szkolenie) || '<span class="muted">brak</span>'), zfWiersz("", "Instytucja", esc(f.is)),
    zfWiersz("", "Wypełnił", esc(WYPELNIL_20[f.wypelnil] || f.wypelnil) + (f.zglosil ? ", " + esc(imieKonta(f.zglosil)) : "")),
    zfWiersz("", "Sposób wprowadzenia", zrodloFormularza20(f)),
    zfWiersz("", "Data wpłynięcia", esc(DB.fmtDate(f.data)) + ' <span class="tag mute">auto</span>'),
    zfWiersz("", "Uwagi dla LDIT", esc(f.uwagi) || '<span class="muted">brak</span>')]);
}

/* Dane firmy z wiersza formularze_oczekujace w sekcjach formularza; NIP do poprawy przed akceptacja */
function daneFirmy20(f) {
  var wiersz = Store.find("formularze_oczekujace", f.id) || {};
  return zfPodgladHtml(wiersz, { pomin: ["Szkolenie i uwagi"], wartosci: { nip: poleNip20(f) } }) + sekcjaZgloszeniaZf20(f);
}

function panelFormularza20(f) {
  var duplikat = f.status === "oczekuje" ? Akceptacje.klientWZakresieZNip(f.nip, f.isId) : null;
  el20("tytulPanelu").textContent = f.firma;
  el20("subPanelu").textContent = "formularz " + f.id;
  el20("panel").innerHTML = przyciskEdycji20(f) + notaBrakow20(f) + daneFirmy20(f) +
    tabelaUczestnikow20(f.uczestnicy) +
    (duplikat ? ostrzezenieDuplikatu20(f, duplikat) : "") +
    (f.status === "oczekuje" ? decyzja20({ rodzaj: "formularz", isId: f.isId, etykietaTak: "Akceptuj, dodaj klienta i załóż projekt",
      opisTak: "Akceptacja tworzy klienta w Bazie klientów (albo dopisuje istniejącego), przenosi na jego kartę komplet danych z formularza i uczestników, przypisuje go do instytucji i od razu zakłada projekt z danymi z formularza.",
      dodatkowe: f.braki.length ? zwrotFormularza20() : "",
      /* Zaakceptowac mozna tylko kompletny formularz (D-331) */
      blokada: f.braki.length ? "Akceptacja jest możliwa dopiero po uzupełnieniu formularza. Brakuje: " + f.braki.join(", ") + ". Odeślij go do uzupełnienia." : "" })
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
