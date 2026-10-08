/* Ekran Instytucje: formularz karty instytucji (edycja i dodawanie).
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---- Karta instytucji ---- */
var POLA_IS = [
  ["nazwa", "Nazwa"], ["skrot", "Skrót"], ["siedziba_miejscowosc", "Siedziba (miejscowość)"], ["nip", "NIP"],
  ["strona_www", "Strona www"], ["opis_dzialalnosci", "Opis działalności"],
  ["osoba_kontaktowa", "Kontakt główny (osoba)"], ["email", "Kontakt główny (e-mail)"], ["telefon", "Kontakt główny (telefon)"],
  ["osoba_kontaktowa_2", "Kontakt 2 (osoba)"], ["email_2", "Kontakt 2 (e-mail)"], ["telefon_2", "Kontakt 2 (telefon)"],
  ["osoba_kontaktowa_3", "Kontakt 3 (osoba)"], ["email_3", "Kontakt 3 (e-mail)"], ["telefon_3", "Kontakt 3 (telefon)"],
  ["standard_godzinowy", "Standard godzinowy"]
];
function polaFormularzaIS(wiersz) {
  var pola = POLA_IS.map(function (p) {
    return '<label class="small" style="display:flex;flex-direction:column;gap:3px">' +
      '<span class="muted">' + p[1] + '</span>' +
      '<input class="inp" id="if_' + p[0] + '" value="' + esc(wiersz ? wiersz[p[0]] : "") + '"></label>';
  }).join("");
  var model = wiersz ? wiersz.model_terminow : "kalendarz";
  return pola + poleOpiekunow06(wiersz ? wiersz.id : null) + kolorPolaIS(wiersz) + '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Model terminów</span>' +
    '<select class="inp" id="if_model_terminow">' + Object.keys(MODEL_TERMINOW).map(function (k) {
      return '<option value="' + k + '"' + (model === k ? " selected" : "") + ">" + esc(MODEL_TERMINOW[k]) + "</option>";
    }).join("") + "</select></label>";
}
function isFormHTML(wiersz, tytul, submitLabel, onSubmit) {
  return '<div class="card mb0"><div class="card-body">' +
    '<div class="small strong" style="margin-bottom:10px">' + esc(tytul) + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + polaFormularzaIS(wiersz) + '</div>' +
    '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn primary sm" onclick="' + onSubmit + '">' + submitLabel + '</button>' +
      '<button class="btn sm" onclick="zamknijISForm()">Anuluj</button>' +
    '</div></div></div>';
}
function zbierzIS(nowa) {
  var o = {};
  POLA_IS.forEach(function (p) { o[p[0]] = el("if_" + p[0]).value.trim() || null; });
  o.model_terminow = el("if_model_terminow").value;
  var kolor = odczytKoloruIS(nowa);
  if (kolor) o.kolor_kalendarza = kolor;
  return o;
}
function otworzISForm(html) {
  el("daneFirmy").style.display = "none";
  var f = el("isForm");
  f.innerHTML = html;
  f.style.display = "block";
  Wielowybor.zamienWszystkie(f);
  aktywujTab("p-dane");
}
function zamknijISForm() {
  var f = el("isForm");
  f.style.display = "none"; f.innerHTML = "";
  el("daneFirmy").style.display = "";
  if (STAN_06.nowa) { STAN_06.nowa = false; wrocDoPrzegladu06(); }
}
/* Kazda instytucja ma inny kolor: zbyt podobny do cudzego zatrzymuje zapis z komunikatem */
function kolorDoZapisuOk(o, idPomin) {
  var zajety = o.kolor_kalendarza ? kolorZajetyIS(o.kolor_kalendarza, idPomin) : null;
  if (zajety) window.alert("Kolor jest zbyt podobny do koloru instytucji " + zajety + ". Wybierz inny kolor.");
  return !zajety;
}
function zapiszEdycjeIS() {
  var patch = zbierzIS();
  if (!patch.nazwa) { el("if_nazwa").focus(); return; }
  if (!kolorDoZapisuOk(patch, STAN_06.wybrana)) return;
  Store.update("instytucje", STAN_06.wybrana, patch);
  zapiszOpiekunow06(STAN_06.wybrana);
  zamknijISForm();
}
function dodajIS() {
  var o = zbierzIS(true);
  if (!o.nazwa) { el("if_nazwa").focus(); return; }
  if (!kolorDoZapisuOk(o, null)) return;
  var nowa = Store.insert("instytucje", o, "IS-");
  zapiszOpiekunow06(nowa.id);
  STAN_06.nowa = false;
  zamknijISForm();
  otworzKonfiguracje06(nowa.id);
}

function otworzEdycjeIS() {
  var wiersz = Store.find("instytucje", STAN_06.wybrana);
  otworzISForm(isFormHTML(wiersz, "Edycja karty: " + wiersz.nazwa, "Zapisz zmiany", "zapiszEdycjeIS()"));
}
/* Nowa instytucja: formularz w widoku konfiguracji, Anuluj wraca do przegladu */
function otworzNowaIS() {
  STAN_06.nowa = true;
  pokazWidok06("konfig");
  el("detNazwa").textContent = "Nowa instytucja szkoleniowa";
  el("detSub").textContent = "";
  otworzISForm(isFormHTML(null, "Nowa instytucja szkoleniowa", "Dodaj instytucję", "dodajIS()"));
}
