/* Zgloszenia: formularz nowego wpisu, filtry i odswiezanie (tylko deklaracje) */

function dzisiaj() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

var POWOD_NIEZLOZONY_WNIOSEK = "Niezłożony wniosek";

/* Podmiot to instytucja albo klient z bazy (D-249): lista zalezy od wybranego typu */
function odswiezTyp() {
  var typ = document.getElementById("nTyp").value;
  var opcje = typ === "Klient"
    ? DB.KLIENCI.slice().sort(function (a, b) { return a.nazwa.localeCompare(b.nazwa, "pl"); })
        .map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.nazwa + (k.nip ? " (NIP " + k.nip + ")" : "")) + "</option>"; })
    : DB.INSTYTUCJE.map(function (i) { return '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + "</option>"; });
  document.getElementById("nPodmiot").innerHTML = opcje.join("");
  odswiezInfoCzarnaLista();
}

/* Informacja o regule czarnej listy pojawia sie dla klienta z powodem "Niezlozony wniosek" */
function odswiezInfoCzarnaLista() {
  var pokaz = document.getElementById("nTyp").value === "Klient" &&
    document.getElementById("nPowod").value.trim() === POWOD_NIEZLOZONY_WNIOSEK;
  document.getElementById("infoCzarnaLista").style.display = pokaz ? "" : "none";
}

function przygotujFormularz() {
  document.getElementById("nTyp").innerHTML =
    '<option value="Instytucja">Instytucja szkoleniowa</option><option value="Klient">Klient</option>';

  /* Autor domyslnie = zalogowany (z sesji), pole edytowalne (D-121) */
  var pracownicy = DB.UZYTKOWNICY.filter(function (u) {
    return u.typ === "pracownik";
  });
  var domyslnyAutor = Auth.sesja().imie;
  document.getElementById("nAutor").innerHTML = pracownicy.map(function (u) {
    return '<option' + (u.imie === domyslnyAutor ? " selected" : "") + ">" + esc(u.imie) + "</option>";
  }).join("");
  document.getElementById("nData").value = DB.fmtDate(dzisiaj());
  document.getElementById("nTyp").addEventListener("change", odswiezTyp);
  document.getElementById("nPowod").addEventListener("input", odswiezInfoCzarnaLista);
}

/* Wiersz zgloszenia: klient zapisuje klient_id (podstawa reguly czarnej listy), instytucja nie */
function wierszZgloszenia(powod, opis) {
  var s = document.getElementById("nPodmiot");
  var typ = document.getElementById("nTyp").value;
  return {
    data: dzisiaj(), podmiot: s.options[s.selectedIndex].text.replace(/ (NIP [^)]*)$/, ""),
    podmiot_typ: typ === "Klient" ? "klient" : "instytucja", typ: typ,
    klient_id: typ === "Klient" ? s.value : null,
    powod: powod, opis: opis, autor: document.getElementById("nAutor").value,
    waga: document.getElementById("nWaga").value
  };
}

function dodaj() {
  var powod = document.getElementById("nPowod").value.trim();
  var opis = document.getElementById("nOpis").value.trim();
  if (!powod || !opis) {
    document.getElementById("wynikDodania").innerHTML =
      '<div class="note warn mt16 mb0">Powód i opis są wymagane. Zgłoszenie bez opisu jest bezużyteczne po roku.</div>';
    return;
  }
  Store.insert("zgloszenia", wierszZgloszenia(powod, opis), "ZG-");
  document.getElementById("nPowod").value = "";
  document.getElementById("nOpis").value = "";
  odswiezInfoCzarnaLista();
  document.getElementById("wynikDodania").innerHTML =
    '<div class="note mt16 mb0" style="border-left-color:var(--pos-ink);background:var(--pos-bg)">' +
    "<b>Zgłoszenie zapisane w bazie.</b> Historia podmiotu przeliczyła się na liście powyżej.</div>";
  window.scrollTo(0, 0);
  /* odswiez() wywola sie przez zdarzenie db:changed */
}

/* Anuluj czysci wpisany powod i opis, bez zapisu */
function anulujZgloszenie() {
  document.getElementById("nPowod").value = "";
  document.getElementById("nOpis").value = "";
  document.getElementById("wynikDodania").innerHTML = "";
  odswiezInfoCzarnaLista();
}

function podepnijFiltry() {
  Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (c) {
    c.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (x) { x.classList.remove("on"); });
      c.classList.add("on");
      STAN_10.filtrTyp = c.dataset.typ;
      renderLista();
    });
  });
  document.getElementById("szukaj").addEventListener("input", renderLista);
  document.getElementById("fWaga").addEventListener("change", renderLista);
}

function odswiez() { renderKpi(); renderLista(); renderPowracajace(); renderCzarnaLista(); }
