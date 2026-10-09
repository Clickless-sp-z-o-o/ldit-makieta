/* Ekran 21, czesc 2: uruchomienie formularza (D-269). Formularz jest przypisany do instytucji osoby,
   ktora go wprowadza: konto instytucji ma ja ustawiona na sztywno, konto LDIT wybiera z listy.
   Bez funkcji formularze.zglaszanie ekran pokazuje tylko komunikat o braku uprawnienia. */

function nazwyInstytucji21() {
  return DB.INSTYTUCJE.map(function (i) { return [i.id, i.nazwa]; });
}

function szkoleniaInstytucji21(instytucjaId) {
  var nazwy = DB.SZKOLENIA.filter(function (s) { return !instytucjaId || s.is === instytucjaId; }).map(function (s) { return s.nazwa; });
  return nazwy.filter(function (n, i) { return nazwy.indexOf(n) === i; }).map(function (n) { return [n, n]; });
}

function pokazKomunikat21(braki) {
  var pole = el21("komunikat21");
  pole.hidden = false;
  pole.className = "note mb0" + (braki.length ? " warn" : "");
  pole.innerHTML = "<b>Formularz wysłany do akceptacji LDIT.</b> " + esc(tekstBrakowFormularza(braki));
}

function opcjeFormularza21() {
  var instytucjaId = Auth.sesja().instytucja_id;
  var opcje = {
    kontener: "zfKontener21", bezAnulowania: true, zostaje: true,
    szkolenia: szkoleniaInstytucji21(instytucjaId),
    /* Po wyslaniu pusty formularz wraca od razu, zeby wprowadzic kolejny */
    poWyslaniu: function (nowy, braki) {
      pokazKomunikat21(braki); renderLista21();
      zfPokaz(opcjeFormularza21()); uzupelnijBlokSzablonu21();
    }
  };
  if (!instytucjaId) { opcje.instytucje = nazwyInstytucji21(); return opcje; }
  opcje.instytucjaId = instytucjaId;
  var instytucja = DB.INSTYTUCJE.filter(function (i) { return i.id === instytucjaId; })[0];
  opcje.instytucjaNazwa = instytucja ? instytucja.nazwa : instytucjaId;
  return opcje;
}

function inicjuj21() {
  var mozeDodawac = Auth.moze("formularze.zglaszanie");
  el21("brakUprawnienia21").hidden = mozeDodawac;
  el21("kartaFormularza21").hidden = !mozeDodawac;
  if (mozeDodawac) { zfPokaz(opcjeFormularza21()); uzupelnijBlokSzablonu21(); }
  renderLista21();
  inicjujTryb21();
  if (EDYCJA_21.edytuj) edytujFormularz21(EDYCJA_21.edytuj);
  window.addEventListener("db:changed", renderLista21);
}
