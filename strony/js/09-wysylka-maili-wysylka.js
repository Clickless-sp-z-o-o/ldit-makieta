/* Wysylka maili, zakladka 2, krok 1: wybor szablonu, kontekstu i adresatow */
function adresaci() {
  var k = document.getElementById("wyKontekst").value;
  return DB.WNIOSKI_WSZYSTKIE.filter(function (w) {
    if (k === "poz") return w.statusDec === "Pozytywna" && w.rozliczenie === "Oczekuje";
    if (k === "zlozone") return w.statusSkl === "Złożony" && !w.statusDec;
    return w.rozliczenie === "Rozliczone";
  });
}

function renderOdb() {
  var lista = adresaci();
  document.getElementById("odbList").innerHTML = lista.length ? lista.map(function (w) {
    return '<label class="odb-row">' +
      '<input type="checkbox" class="odbCh" data-i="' + esc(w.id) + '">' +
      '<span class="on"><b>' + esc(w.klNazwa) + "</b>" +
      '<div class="om mono">' + esc(adresMaila(w) || "brak adresu") + "</div></span>" +
      '<span class="pill">' + esc(w.id) + "</span></label>";
  }).join("") : '<div class="empty"><div class="ei">&#9993;</div><div class="et">Brak adresatów</div>W tym kontekście nie ma projektów.</div>';
  Array.prototype.forEach.call(document.querySelectorAll(".odbCh"), function (c) {
    c.addEventListener("change", licz);
  });
  licz();
  podgladWysylki();
}

function licz() {
  var n = document.querySelectorAll(".odbCh:checked").length;
  var el = document.getElementById("licznikOdb");
  el.textContent = "wybrano " + n + " z " + document.querySelectorAll(".odbCh").length;
}

function zaznacz(v) {
  Array.prototype.forEach.call(document.querySelectorAll(".odbCh"), function (c) { c.checked = v; });
  licz();
}

function wybrane() {
  return Array.prototype.map.call(document.querySelectorAll(".odbCh:checked"), function (c) {
    return DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.id === c.dataset.i; })[0];
  });
}

function podgladWysylki() {
  var t = TRESCI[document.getElementById("wySzablon").value];
  var w = wybrane()[0];
  if (!w) {
    document.getElementById("wyPodglad").innerHTML =
      '<div class="empty"><div class="ei">&#9993;</div><div class="et">Nie wybrano adresata</div>' +
      "Zaznacz kogoś na liście po lewej, żeby zobaczyć podstawione dane.</div>";
    return;
  }
  document.getElementById("wyPodglad").innerHTML =
    mailHtml("powiadomienia@ldit.pl", podstaw(t.do, w), podstaw(t.temat, w), podstaw(t.tresc, w));
}

function inicjujWysylke09() {
  document.getElementById("wySzablon").innerHTML = DB.SZABLONY.map(function (s) {
    return '<option value="' + esc(s.id) + '">' + esc(s.nazwa + " (" + s.odbiorca + ")") + '</option>';
  }).join("");
  document.getElementById("wySzablon").addEventListener("change", podgladWysylki);
  document.getElementById("wyKontekst").addEventListener("change", renderOdb);
  renderOdb();
}
