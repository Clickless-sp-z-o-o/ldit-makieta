/* Konfigurator instytucji: zakladki konfiguracji jednej instytucji (ekran 06-instytucje.html,
   uwagi z 08.10.2026). Warunki prowizyjne, wzor certyfikatu, dane do faktury i formularz
   zgloszeniowy renderuja sie dla instytucji wybranej na ekranie Instytucje, bez osobnej listy
   wyboru. Warunki prowizyjne tylko z modulem Administracja (D-07). Wzor certyfikatu i formularz
   widzi caly zespol LDIT, zmienia administrator; dane do faktury zmienia konto z feature
   instytucje.dane_faktury, czyli tez pracownik LDIT (feedback makiety 19.10.2026, D-366).
   Tylko deklaracje. */
function podlaczFormularzeEdycji() {
  if (!STAN_07.mozeEdytowac) return;
  var kum = document.getElementById("nwKum");
  kum.addEventListener("change", function () {
    var brak = kum.value === "brak";
    document.getElementById("nwSposob").style.display = brak ? "none" : "";
    document.getElementById("nwProgi").style.display = brak ? "none" : "";
    document.getElementById("nwStala").style.display = brak ? "" : "none";
  });
  document.getElementById("nwZapisz").addEventListener("click", dodajWersje);
  document.getElementById("pdZapisz").addEventListener("click", dodajWersjeProgow);
}

/* Warunki prowizyjne i progi dofinansowania: tylko konto z modulem Administracja (D-07) */
function renderProwizje07(i, wnioski) {
  var dzis = dzisiaj();
  var wersje = wersjeInstytucji(i.id);
  var akt = wersjaNaDzien(wersje, dzis);

  document.getElementById("tagModel").textContent = akt ? "Model " + akt.model + ": " + OPIS_MODELU[akt.model] : "Brak warunków prowizyjnych";
  document.getElementById("obowOd").innerHTML = akt ? "obowiązuje od <b>" + esc(DB.fmtDate(akt.od)) + "</b>" : "brak warunków";
  document.getElementById("warunkiAkt").innerHTML = warunkiHtml(akt);
  document.getElementById("historia").innerHTML = historiaHtml(wersje, dzis);

  var projekty = wnioski.filter(function (w) {
    return w.statusDec === "Pozytywna" && w.dataFaktury && w.podstawaProwizji != null;
  });
  document.getElementById("rozlWersje").innerHTML = rozliczeniaHtml(wersje, projekty);

  document.getElementById("polaWersji").innerHTML = polaWersjiHtml();
  progiDofRender(dzis);
  podlaczFormularzeEdycji();
}

function render07() {
  var i = instytucja(STAN_07.wybrana);
  if (!i) return;
  var wnioski = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.is === i.id; });
  var wn26 = wnioski.filter(function (w) { return w.rok === "2026"; });
  if (Auth.widziModul("admin")) renderProwizje07(i, wnioski);
  var ctx = certyfikatRender(i, wn26);
  daneDoFakturyRender(i, wn26, ctx);
  formularzRender(i);
}

/* Panel tylko do podgladu: pola i przyciski zmian (data-edycja) wylaczone, na gorze informacja, kto zmienia */
function tylkoPodglad07(idPanelu, kto) {
  var panel = document.getElementById(idPanelu);
  Array.prototype.forEach.call(panel.querySelectorAll("[data-edycja]"), function (x) {
    x.disabled = true;
    x.title = "Tylko podgląd: zmienia " + kto;
  });
  panel.insertAdjacentHTML("afterbegin", '<div class="card-body" style="padding-bottom:0"><div class="note mb0" data-podglad>' +
    '<b>Podgląd.</b> Ustawienia tej zakładki zmienia ' + esc(kto) + '.</div></div>');
}

/* Wstawia statyczne panele zakladek (tresc w plikach panel-*.js). Bez modulu Administracja panel
   warunkow prowizyjnych zostaje pusty, wiec warunki nie trafiaja nawet do kodu strony (D-07). */
function zaladujPanele07() {
  if (Auth.widziModul("admin")) document.getElementById("p-prow").innerHTML = panelProwizje07();
  document.getElementById("p-cert").innerHTML = panelCertyfikat07();
  document.getElementById("p-fakt").innerHTML = panelFaktura07();
  document.getElementById("p-form").innerHTML = panelFormularz07();
  if (!STAN_07.mozeEdytowac) { tylkoPodglad07("p-cert", "administrator"); tylkoPodglad07("p-form", "administrator"); }
  if (!Auth.moze("instytucje.dane_faktury")) tylkoPodglad07("p-fakt", "zespół LDIT");
}

/* Raz przy starcie strony: panele i usuwanie planowanej wersji warunkow (administrator) */
function przygotujKonfiguracje07() {
  STAN_07.mozeEdytowac = Auth.edytujeModul("admin");
  zaladujPanele07();
  if (!Auth.widziModul("admin")) return;
  document.getElementById("historia").addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-usun");
    if (id) usunPlanowana(id);
  });
}

/* Render zakladek konfiguracji dla instytucji wybranej na ekranie Instytucje */
function pokazKonfiguracje07(idInstytucji) {
  STAN_07.wybrana = idInstytucji;
  render07();
}
