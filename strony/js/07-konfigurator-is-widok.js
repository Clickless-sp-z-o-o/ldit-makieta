/* Konfigurator instytucji: zakladki administratora w konfiguracji jednej instytucji
   (ekran 06-instytucje.html, uwagi z 08.10.2026). Warunki prowizyjne, wzor certyfikatu,
   dane do faktury i formularz zgloszeniowy renderuja sie dla instytucji wybranej na
   ekranie Instytucje, bez osobnej listy wyboru. Tylko deklaracje. */
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

function render07() {
  var i = instytucja(STAN_07.wybrana);
  if (!i) return;
  var dzis = dzisiaj();
  var wersje = wersjeInstytucji(i.id);
  var akt = wersjaNaDzien(wersje, dzis);
  var wnioski = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.is === i.id; });
  var wn26 = wnioski.filter(function (w) { return w.rok === "2026"; });

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

  var ctx = certyfikatRender(i, wn26);
  daneDoFakturyRender(i, wn26, ctx);
  formularzRender(i);
}

/* Wstawia statyczne panele zakladek (tresc w plikach panel-*.js) */
function zaladujPanele07() {
  document.getElementById("p-prow").innerHTML = panelProwizje07();
  document.getElementById("p-cert").innerHTML = panelCertyfikat07();
  document.getElementById("p-fakt").innerHTML = panelFaktura07();
  document.getElementById("p-form").innerHTML = panelFormularz07();
}

/* Raz przy starcie strony: panele i usuwanie planowanej wersji. Bez modulu Administracja
   panele zostaja puste, wiec warunki prowizyjne nie trafiaja nawet do kodu strony (D-07). */
function przygotujKonfiguracje07() {
  if (!Auth.widziModul("admin")) return;
  STAN_07.mozeEdytowac = Auth.edytujeModul("admin");
  zaladujPanele07();
  document.getElementById("historia").addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-usun");
    if (id) usunPlanowana(id);
  });
}

/* Render zakladek administratora dla instytucji wybranej na ekranie Instytucje */
function pokazKonfiguracje07(idInstytucji) {
  if (!Auth.widziModul("admin")) return;
  STAN_07.wybrana = idInstytucji;
  render07();
}
