/* Konta i uprawnienia: stan ekranu i funkcje wspolne. Same deklaracje, dane dopiero w inicjuj11(). */
var STAN_11 = { tylkoBez2fa: false, edytowany: null, aktywna: "pracownik" };
var DLUGOSC_SOLI_BAJTY = 8;

function inicjujZakladki11() {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
      document.querySelectorAll(".tab-pane").forEach(function (x) { x.classList.remove("on"); });
      t.classList.add("on");
      document.getElementById(t.dataset.t).classList.add("on");
    });
  });
}

/* Rejestr aktywnosci jest tylko do dopisywania (D-189). Autor zawsze z sesji. */
function czasTeraz() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function wpiszAktywnosc(typ, obiekt, pole, przed, po) {
  Store.insert("rejestr_aktywnosci", {
    czas: czasTeraz(), kto: Auth.sesja().imie, typ: typ, obiekt: obiekt, pole: pole, przed: przed, po: po
  }, "AKT-");
}
function losowaSol() {
  var b = crypto.getRandomValues(new Uint8Array(DLUGOSC_SOLI_BAJTY));
  return Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
}
function rolaPoId(id) {
  return DB.ROLE.filter(function (r) { return r.id === id; })[0] || null;
}
function czyRolaInstytucji(rolaId) {
  var r = rolaPoId(rolaId);
  return !!r && r.typ === "instytucja";
}

/* Czy rola (dowolna, nie tylko zalogowana) ma feature, z uwzglednieniem wildcard */
function rolaMaFunkcje(rolaId, feature) {
  return Funkcje.pasuje(Funkcje.nadania(rolaId), feature);
}

function odswiezWszystko11() {
  odswiezFiltrRoli();
  renderU();
  renderAlert2fa();
  renderKonfig();
  renderPrzydzial();
  inicjujPodglad11();
  renderSlowniki11();
}

function inicjuj11() {
  inicjujZakladki11();
  wstawPanele11();
  inicjujListe11();
  document.getElementById("btnDodajUsera").addEventListener("click", function () {
    STAN_11.edytowany = null;
    otworzUserForm(null, "Nowe konto użytkownika");
  });
  window.addEventListener("db:changed", odswiezWszystko11);
  renderKonfig();
  renderPrzydzial();
  inicjujPodglad11();
  renderSlowniki11();
  document.getElementById("selPodglad").addEventListener("change", renderPodglad11);
}
