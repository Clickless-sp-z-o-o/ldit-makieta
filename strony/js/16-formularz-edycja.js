/* Formularz zgloszeniowy w trybie edycji wyslanego formularza (D-314): wypelnienie pol danymi
   z formularze_oczekujace i zapis przez Akceptacje.edytujFormularz. Kto i kiedy moze edytowac,
   decyduje assets/akceptacje-edycja.js. Wywolywane z 16-formularz-zgloszenia.js. Same deklaracje. */

function zfWypelnijZFormularza(id) {
  var f = Store.find("formularze_oczekujace", id);
  if (!f) return;
  zfDefinicjePol().forEach(function (p) {
    var pole = zfEl("zf_" + p.k);
    if (pole && f[p.k] != null) pole.value = String(f[p.k]);
  });
  zfPrzelaczUgode();
  ZF.uczestnicy = JSON.parse(f.uczestnicy_json || "[]");
}

function zfZapiszEdycje() {
  var opcje = ZF.opcje;
  try {
    var dane = zfOdczytaj();
    var wiersz = Akceptacje.edytujFormularz(opcje.edycja.id, dane, Akceptacje.ktoTeraz());
    if (window.KFS && KFS.zapiszTeraz) KFS.zapiszTeraz();
    opcje.poZapisie(wiersz);
  } catch (e) {
    if (!(e instanceof Akceptacje.AkceptacjeError) && e.name !== "StraznikError") throw e;
    zfEl("zfKomunikat").textContent = e.message;
    zfEl("zfKomunikat").style.color = "var(--neg-ink)";
  }
}
