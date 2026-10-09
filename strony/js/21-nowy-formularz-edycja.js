/* Ekran 21: edycja wyslanego formularza (D-314). Adres ?edytuj=FO-x otwiera formularz z danymi
   (z listy wyslanych, z panelu instytucji albo z Do akceptacji: wtedy &powrot=akcept daje odnosnik
   powrotny). Kto moze edytowac, decyduje Akceptacje.edycjaFormularza. Same deklaracje. */

var EDYCJA_21 = Nawigacja.odczytajZapytanie(location.search, ["edytuj", "powrot"]);

function odnosnikPowrotu21() {
  return EDYCJA_21.powrot === "akcept" ? ' <a href="20-akceptacje.html">Wróć do Do akceptacji</a>' : "";
}

function komunikatEdycji21(tekst, ostrzezenie) {
  var pole = el21("komunikat21");
  pole.hidden = false;
  pole.className = "note mb0" + (ostrzezenie ? " warn" : "");
  pole.innerHTML = tekst + odnosnikPowrotu21();
}

/* Po zapisie albo anulowaniu ekran wraca do nowego formularza (gdy konto moze je dodawac) */
function pokazNowyFormularz21() {
  var moze = Auth.moze("formularze.zglaszanie");
  el21("kartaFormularza21").hidden = !moze;
  if (moze) { zfPokaz(opcjeFormularza21()); uzupelnijBlokSzablonu21(); }
}

function opcjeEdycji21(f, ocena) {
  var instytucja = DB.INSTYTUCJE.filter(function (i) { return i.id === f.instytucja_id; })[0];
  return {
    kontener: "zfKontener21", instytucjaId: f.instytucja_id, instytucjaNazwa: instytucja ? instytucja.nazwa : f.instytucja_id,
    szkolenia: szkoleniaInstytucji21(f.instytucja_id), edycja: { id: f.id, zwrot: ocena.zwrot },
    poZapisie: function (wiersz) {
      komunikatEdycji21(wiersz.status === "oczekuje" && ocena.zwrot ? "<b>Formularz " + esc(f.id) + " wysłany ponownie do akceptacji LDIT.</b>"
        : "<b>Zapisano zmiany formularza " + esc(f.id) + ".</b>", false);
      renderLista21(); pokazNowyFormularz21();
    },
    poZamknieciu: pokazNowyFormularz21
  };
}

function edytujFormularz21(id) {
  var f = Store.find("formularze_oczekujace", id);
  var ocena = Akceptacje.edycjaFormularza(f);
  if (!ocena.mozna) { komunikatEdycji21(esc(ocena.powod), true); return; }
  el21("brakUprawnienia21").hidden = true;
  el21("kartaFormularza21").hidden = false;
  przelaczTryb21("formularz");
  el21("komunikat21").hidden = true;
  zfPokaz(opcjeEdycji21(f, ocena));
  el21("kartaFormularza21").scrollIntoView({ block: "start" });
}

function przyciskEdycji21(f) {
  var wiersz = Store.find("formularze_oczekujace", f.id);
  if (!Akceptacje.edycjaFormularza(wiersz).mozna) return "";
  return '<button class="btn xs" onclick="edytujFormularz21(\'' + escJs(f.id) + '\')" aria-label="Edytuj formularz ' + esc(f.firma) + '">Edytuj</button>';
}
