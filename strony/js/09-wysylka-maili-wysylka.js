/* Wysylka maili, zakladka 2, krok 1: wybor szablonu i wielu adresatow (wnioski klientow).
   Adresatem jest zawsze firma (wnioskodawca), instytucja albo zespol LDIT wedlug odbiorcy szablonu,
   nigdy uczestnik szkolenia (spotkanie 14.10.2026). Tylko deklaracje. */
var MIESIECY_PO_SZKOLENIU_09 = 3;

var KONTEKSTY_09 = {
  poz: "Decyzja pozytywna, oczekujące na realizację",
  poSzkoleniu: "Szkolenie zakończone (np. przypomnienie o ZUS RCA)",
  zlozone: "Złożone, bez decyzji",
  rozl: "Rozliczone (prośba o opinię)",
  wszystkie: "Wszystkie projekty"
};

function dataMinusMiesiace09(miesiace) {
  var d = new Date();
  d.setMonth(d.getMonth() - miesiace);
  var p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function pasujeKontekst09(w, k, koniecDo) {
  if (k === "poz") return w.statusDec === "Pozytywna" && w.rozliczenie === "Oczekuje";
  if (k === "zlozone") return w.statusSkl === "Złożony" && !w.statusDec;
  if (k === "rozl") return w.rozliczenie === "Rozliczone";
  if (k === "poSzkoleniu") return !!w.szkolenieDo && (!koniecDo || w.szkolenieDo <= koniecDo);
  return true;
}

function adresaci() {
  var k = document.getElementById("wyKontekst").value;
  var koniecDo = document.getElementById("wyKoniecDo").value;
  var q = document.getElementById("wySzukaj").value.trim().toLowerCase();
  return DB.WNIOSKI_WSZYSTKIE.filter(function (w) {
    if (!pasujeKontekst09(w, k, koniecDo)) return false;
    return !q || [w.klNazwa, w.klNazwaPelna, w.nip, w.nr, w.isNazwa, w.szkolenie].join(" ").toLowerCase().indexOf(q) >= 0;
  });
}

function wybranySzablon09() { return szablon09(document.getElementById("wySzablon").value); }

/* Zmiana szablonu, kontekstu albo frazy nie gubi zaznaczonych adresatow, ktorzy nadal sa na liscie */
function renderOdb() {
  var lista = adresaci(), s = wybranySzablon09();
  var zaznaczone = Array.prototype.map.call(document.querySelectorAll(".odbCh:checked"), function (c) { return c.dataset.i; });
  document.getElementById("wyKoniecPole").hidden = document.getElementById("wyKontekst").value !== "poSzkoleniu";
  document.getElementById("odbList").innerHTML = lista.length ? lista.map(function (w) {
    var adres = s ? adresDoMaila09(s.do, w) : "";
    return '<label class="odb-row">' +
      '<input type="checkbox" class="odbCh" data-i="' + esc(w.id) + '"' + (zaznaczone.indexOf(w.id) >= 0 ? " checked" : "") + ">" +
      '<span class="on"><b>' + esc(w.klNazwa) + "</b>" +
      '<div class="om mono">' + esc(adres || "brak adresu e-mail") + "</div>" +
      '<div class="om">' + esc(w.isNazwa) + (w.szkolenieDo ? " · koniec szkolenia " + esc(DB.fmtDate(w.szkolenieDo)) : "") + "</div></span>" +
      '<span class="pill">' + esc(w.nr || w.id) + "</span></label>";
  }).join("") : '<div class="empty"><div class="ei">&#9993;</div><div class="et">Brak adresatów</div>W tym kontekście nie ma projektów.</div>';
  Array.prototype.forEach.call(document.querySelectorAll(".odbCh"), function (c) {
    c.addEventListener("change", licz);
  });
  licz();
  podgladWysylki();
}

function licz() {
  var n = document.querySelectorAll(".odbCh:checked").length;
  document.getElementById("licznikOdb").textContent = "wybrano " + n + " z " + document.querySelectorAll(".odbCh").length;
  document.getElementById("btnDoPodgladu").textContent = n ? "Dalej: podgląd " + n + " " + (n === 1 ? "maila" : "maili") : "Dalej: podgląd maili";
}

function zaznacz(v) {
  Array.prototype.forEach.call(document.querySelectorAll(".odbCh"), function (c) { c.checked = v; });
  licz();
}

function wybrane() {
  return Array.prototype.map.call(document.querySelectorAll(".odbCh:checked"), function (c) {
    return DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.id === c.dataset.i; })[0];
  }).filter(Boolean);
}

/* Krok 1 pokazuje sam szablon; gotowy mail dla kazdego adresata jest w kroku 2 */
function podgladWysylki() {
  var s = wybranySzablon09();
  document.getElementById("wyPodglad").innerHTML = s ? mailHtml("powiadomienia@ldit.pl", s.do, s.temat, s.tresc) : "";
}

function odswiezSzablonyWysylki09() {
  var sel = document.getElementById("wySzablon");
  if (!sel) return;
  var wybrany = STAN_09.wybranySzablon || sel.value;
  sel.innerHTML = szablonyBiblioteki09().map(function (s) {
    return '<option value="' + esc(s.id) + '"' + (s.id === wybrany ? " selected" : "") + ">" +
      esc(s.nazwa + " (" + ((ODBIORCY_09[s.odbiorca] || {}).etykieta || s.odbiorca) + ")") + "</option>";
  }).join("");
}

function inicjujWysylke09() {
  odswiezSzablonyWysylki09();
  document.getElementById("wyKontekst").innerHTML = Object.keys(KONTEKSTY_09).map(function (k) {
    return '<option value="' + k + '">' + esc(KONTEKSTY_09[k]) + "</option>";
  }).join("");
  document.getElementById("wyKoniecDo").value = dataMinusMiesiace09(MIESIECY_PO_SZKOLENIU_09);
  document.getElementById("wySzablon").addEventListener("change", function () {
    STAN_09.wybranySzablon = this.value;
    renderOdb();
  });
  ["wyKontekst", "wyKoniecDo"].forEach(function (id) { document.getElementById(id).addEventListener("change", renderOdb); });
  document.getElementById("wySzukaj").addEventListener("input", renderOdb);
  renderOdb();
}
