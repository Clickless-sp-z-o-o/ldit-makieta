/* Ekran Instytucje: kolor instytucji w kalendarzu terminow (D-267).
   Kolor jest uzywany w kalendarzu i jako tlo kafelka instytucji (uwagi z 08.10.2026), kazda
   instytucja ma inny. Pole w karcie instytucji: wybor dowolnego koloru
   plus paleta gotowych. Tylko deklaracje, bez kodu wykonywanego od razu. */

var PALETA_KOLOROW_IS = ["#2563EB", "#16A34A", "#DC2626", "#D97706", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

/* Kolor podpowiadany w formularzu: zapisany, a bez niego kolor nadany instytucji (kazda inny);
   nowa instytucja dostaje od razu kolor rozny od wszystkich istniejacych */
function kolorDomyslnyIS(wiersz) {
  if (wiersz && wiersz.kolor_kalendarza) return wiersz.kolor_kalendarza;
  var nadany = wiersz ? DB.INSTYTUCJE.filter(function (i) { return i.id === wiersz.id; })[0] : null;
  if (nadany) return nadany.kolor;
  return DBInstytucje.kolorDlaNowej(DB.INSTYTUCJE.map(function (i) { return i.kolor; }));
}

/* Nazwa instytucji o kolorze zbyt podobnym do wybranego albo null; idPomin to edytowana instytucja */
function kolorZajetyIS(kolor, idPomin) {
  var konflikt = DB.INSTYTUCJE.filter(function (i) {
    return i.id !== idPomin && DBInstytucje.roznicaKolorow(kolor, i.kolor) < DBInstytucje.MIN_ROZNICA;
  })[0];
  return konflikt ? konflikt.nazwa : null;
}

function kolorPolaIS(wiersz) {
  var obecny = kolorDomyslnyIS(wiersz);
  var probki = PALETA_KOLOROW_IS.map(function (k) {
    return '<button type="button" class="probka" style="background:' + k + '" title="' + k + '" onclick="wybierzKolorIS(\'' + k + '\')"></button>';
  }).join("");
  return '<div class="small" style="display:flex;flex-direction:column;gap:3px;grid-column:1 / -1">' +
    '<span class="muted">Kolor w kalendarzu <span class="ref">D-267</span>' +
    '<span class="tip-mark" data-tip="Kolor instytucji na kafelkach terminów w kalendarzu i na kafelku instytucji. Każda instytucja ma inny kolor.">i</span></span>' +
    '<div class="kolor-is"><input type="color" id="if_kolor_kalendarza" oninput="this.dataset.zmieniony = 1" value="' + esc(obecny) + '" data-bazowy="' +
    esc(wiersz && wiersz.kolor_kalendarza ? obecny : "") + '">' + probki +
    '<span class="muted">Kolor w kalendarzu terminów i na kafelku instytucji, inny dla każdej instytucji.</span></div></div>';
}

function wybierzKolorIS(kolor) {
  var pole = el("if_kolor_kalendarza");
  pole.value = kolor;
  pole.dataset.zmieniony = 1;
}

/* Instytucja bez zapisanego koloru nie dostaje go w bazie, dopoki ktos go nie wybierze
   (do tego czasu ma kolor nadany w warstwie danych); nowa instytucja zapisuje kolor od razu */
function odczytKoloruIS(nowa) {
  var pole = el("if_kolor_kalendarza");
  var wartosc = pole.value.toUpperCase();
  if (nowa || pole.dataset.bazowy || pole.dataset.zmieniony) return wartosc;
  return null;
}
