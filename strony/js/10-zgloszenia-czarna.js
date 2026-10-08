/* Zgloszenia: czarna lista klientow (D-249). Klient trafia na nia, gdy ma co najmniej dwa
   zgloszenia "Niezlozony wniosek" z roznych dat (regula w widoku v_klient_czarna_lista).
   Dalsze kroki to adnotacja dla rozmowy z instytucja, system niczego nie wykonuje. */

var DALSZE_KROKI = ["płatność z góry", "koszty po stronie klienta", "rezygnacja ze współpracy"];

function zrodloCzarnejListy(k) {
  if (k.czarnaListaRegula) return "reguła: " + k.niezlozonych + " niezłożone wnioski z różnych dat";
  return "ręczne ustawienie (reguła wyłączona)";
}

function wierszCzarnejListy(k) {
  return "<tr>" +
    '<td class="strong"><span class="tag neg" title="Widnieje na czarnej liście">&#9760;</span> ' +
      '<a href="' + esc(Nawigacja.adresKlienta(k.id)) + '">' + esc(k.nazwa) + "</a></td>" +
    '<td class="small muted">' + esc(zrodloCzarnejListy(k)) + "</td></tr>";
}

function renderCzarnaLista() {
  var lista = DB.KLIENCI.filter(function (k) { return k.czarnaLista; });
  document.getElementById("tbCzarnaLista").innerHTML = lista.length
    ? lista.map(wierszCzarnejListy).join("")
    : '<tr><td colspan="2" class="small muted">Żaden klient nie jest na czarnej liście.</td></tr>';
  document.getElementById("krokiCzarnejListy").textContent = DALSZE_KROKI.join(", ");
}
