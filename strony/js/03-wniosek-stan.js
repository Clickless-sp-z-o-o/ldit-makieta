/* Ekran Wniosek: stan wspolny, zapis zmian z wpisem do rejestru.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
var STAN_03 = { wnId: null, widziProwizje: false, mozeEdytowac: false, w: null, raw: null, inst: null };

var ETAPOW = 10;
var TOLERANCJA = 0.005;

/* Uprawnienia pochodza z zalogowanego konta (feature), nie z parametru w adresie (D-125). */
function inicjujStan03() {
  STAN_03.wnId = new URLSearchParams(location.search).get("id");
  STAN_03.widziProwizje = Auth.moze("finanse.prowizja");
  STAN_03.mozeEdytowac = Auth.edytujeModul("dofin");
}

function el(idElementu) { return document.getElementById(idElementu); }

function wczytaj() {
  STAN_03.w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === STAN_03.wnId; })[0] || null;
  if (!STAN_03.w) return false;
  STAN_03.raw = Store.find("wnioski", STAN_03.w.id);
  STAN_03.inst = DB.INSTYTUCJE.filter(function (i) { return i.id === STAN_03.w.is; })[0] || null;
  return true;
}

function dzis() {
  var d = new Date();
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function teraz() {
  var d = new Date();
  function p(n) { return String(n).padStart(2, "0"); }
  return dzis() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Liczba z pola tekstowego albo null, gdy pole puste */
function num(pole) {
  var t = String(pole.value).replace(/\s/g, "").replace(/[^\d,.-]/g, "").replace(",", ".");
  var v = parseFloat(t);
  return isNaN(v) ? null : v;
}
function pokazKwote(pole, v) {
  pole.value = v == null ? "" : v.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function rozne(a, b) { return Math.abs((a || 0) - (b || 0)) >= TOLERANCJA; }

/* ---------- Rejestr aktywnosci: autor z sesji ---------- */
function wpiszDoRejestru(typ, pole, przed, po) {
  Store.insert("rejestr_aktywnosci", {
    czas: teraz(), kto: Auth.sesja().imie, typ: typ, obiekt: STAN_03.w.id, pole: pole,
    przed: przed == null || przed === "" ? "brak" : String(przed),
    po: po == null || po === "" ? "brak" : String(po)
  }, "AKT-");
}
function zapiszZmiany(tabela, rekordId, patch, wpisy) {
  Store.update(tabela, rekordId, patch);
  wpisy.forEach(function (x) { wpiszDoRejestru(x.typ || "Zmiana pola", x.pole, x.przed, x.po); });
  wczytaj();
  renderWszystko();
}
function komunikat(tekst) { el("stanZapisu").textContent = tekst; }
