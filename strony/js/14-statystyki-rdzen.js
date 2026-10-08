/* Statystyki 14: stan wspolny, pomocniki i przelaczanie widoku. Tylko deklaracje. */
var LIMIT_LISTY = 8;
var PROG_DOBRY = 60, PROG_SREDNI = 40;
var STAN_14 = {};

function dzisIso() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function klasaSkutecznosci(s) { return s >= PROG_DOBRY ? "pos" : s >= PROG_SREDNI ? "warn" : "neg"; }
function sumaPola(lista, pole) { return lista.reduce(function (s, x) { return s + (x[pole] || 0); }, 0); }
function kartaKpi(l, v, f, adm, link) {
  return '<div class="kpi' + (adm ? " admin" : "") + '"' + (link || "") + '><div class="k-label">' + l + '</div>' +
    '<div class="k-value">' + v + '</div>' + (f ? '<div class="k-foot">' + f + '</div>' : "") + '</div>';
}
/* Atrybut data-href do listy wnioskow tego roku i tej instytucji, co statystyki (drill through,
   D-212). Rola bez Dofinansowan dostaje element bez linku. */
function link14(filtry) {
  if (!Auth.widziModul("dofin")) return "";
  var adres = Nawigacja.adresWnioskow(Object.assign({ rok: STAN_14.rok, inst: Wielowybor.tekst(STAN_14.selIS) }, filtry));
  return ' data-href="' + esc(adres) + '" title="Pokaż wnioski"';
}

function instytucjaPoId(id) {
  return DB.INSTYTUCJE.filter(function (i) { return i.id === id; })[0];
}

function render14() {
  /* Wybrane instytucje (wybor wielokrotny); pusta tablica = wszystkie */
  var fis = Wielowybor.wartosci(STAN_14.selIS);
  var widok = STAN_14.selOkres.value;
  var biezacy = widok === "biezacy";
  document.getElementById("widokBiezacy").style.display = biezacy ? "" : "none";
  document.getElementById("kartaHistoria").style.display = biezacy ? "none" : "";
  if (biezacy) renderBiezacy(fis);
  else if (widok === "poprzedni") renderPoprzedni(fis);
  else renderPorownanie(fis);
}

function inicjuj14() {
  STAN_14.dzis = dzisIso();
  STAN_14.rok = STAN_14.dzis.slice(0, 4);
  STAN_14.rokPoprz = String(parseInt(STAN_14.rok, 10) - 1);

  STAN_14.selIS = document.getElementById("fIS");
  STAN_14.selIS.innerHTML += DB.INSTYTUCJE.map(function (i) {
    return '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + '</option>';
  }).join("");

  STAN_14.selOkres = document.getElementById("okres");
  var widoki = { biezacy: "Rok " + STAN_14.rok, poprzedni: "Rok " + STAN_14.rokPoprz,
                 porownanie: "Porównanie " + STAN_14.rokPoprz + " / " + STAN_14.rok };
  STAN_14.selOkres.innerHTML = Object.keys(widoki).map(function (k) {
    return '<option value="' + k + '">' + widoki[k] + '</option>';
  }).join("");

  STAN_14.selIS.addEventListener("change", render14);
  STAN_14.selOkres.addEventListener("change", render14);
  Nawigacja.podlaczLinki(document.body);
  render14();
}
