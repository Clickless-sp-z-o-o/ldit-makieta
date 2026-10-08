/* Ustawienia, zakladka Slowniki: slowniki zmieniane wylacznie przez administratora.
   Lata zestawien (D-273: rok dodaje tylko administrator, tutaj zamiast w menu) i slownik
   urzedow pracy z aliasami (D-272, 11-konta-uprawnienia-urzedy.js).
   Uprawnienie sprawdza warstwa danych (Lata.dodaj i straznik), nie tylko ten ekran.
   Same deklaracje. */

function renderLata11() {
  var lata = Lata.lista();
  return '<div class="card-head"><h3>Lata zestawień</h3><span class="sub">zakładki roczne Dofinansowań w lewym menu</span></div>' +
    '<div class="card-body tight"><table class="tbl"><thead><tr><th>Rok</th><th>Opis</th><th>Dodano</th><th>Dodał</th></tr></thead><tbody>' +
    lata.map(function (l) {
      return "<tr><td class=\"strong\">" + esc(l.rok) + "</td><td>" + esc(l.opis || "") + "</td><td class=\"small\">" +
        esc(DB.fmtDate(l.utworzono)) + "</td><td class=\"small\">" + esc(l.utworzyl || "") + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="card-body"><div class="btn-row" style="align-items:center">' +
    '<input class="inp" id="nowyRok11" value="' + esc(Lata.nastepny()) + '" maxlength="4" style="width:80px">' +
    '<button class="btn primary sm" id="btnDodajRok11">+ Dodaj rok</button>' +
    '<span class="small muted">Nowy rok pojawi się w lewym menu, pusty, bez wniosków <span class="ref">D-159</span> <span class="ref">D-273</span></span>' +
    "</div></div>";
}

function dodajRok11() {
  try {
    var nowy = Lata.dodaj(document.getElementById("nowyRok11").value, Auth.sesja().imie);
    KFS.zapiszTeraz();
    window.alert("Dodano rok " + nowy.rok + ". Zakładka jest w lewym menu Dofinansowań.");
  } catch (e) {
    if (!(e instanceof Lata.LataError)) throw e;
    window.alert(e.message);
  }
}

function renderSlowniki11() {
  var host = document.getElementById("slowniki11");
  host.innerHTML = '<div class="card">' + renderLata11() + '</div><div class="card mb0">' + renderUrzedy11() + "</div>";
  document.getElementById("btnDodajRok11").addEventListener("click", dodajRok11);
  podepnijUrzedy11(host);
}
