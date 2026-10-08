/* Ekran 21, czesc 1: lista wyslanych formularzy ze statusem (D-269). Konto instytucji widzi formularze
   swojej instytucji (zakres z warstwy danych), konto LDIT formularze, ktore samo wyslalo. Same deklaracje. */

var ZRODLA_21 = { reczny: "ręcznie", csv: "plik CSV", xlsx: "plik Excel", pdf: "plik PDF" };

function el21(id) { return document.getElementById(id); }

function wyslaneFormularze21() {
  var sesja = Auth.sesja();
  return DB.KOLEJKA.filter(function (k) { return sesja.instytucja_id || k.zglosil === sesja.uzytkownik_id; })
    .sort(function (a, b) { return b.data < a.data ? -1 : b.data > a.data ? 1 : 0; });
}

/* Zwrot do uzupelnienia to odrzucenie z powodem zaczynajacym sie od Akceptacje.PREFIKS_ZWROTU (D-269) */
function tagStatusu21(f) {
  var klasa = f.status === "oczekuje" ? "warn" : f.status === "zaakceptowany" ? "pos" : "neg";
  var zwrot = f.status === "odrzucony" && f.powod && f.powod.indexOf(Akceptacje.PREFIKS_ZWROTU) === 0;
  return '<span class="tag ' + klasa + ' dot">' + esc(zwrot ? "zwrócony do uzupełnienia" : f.status) + '</span>';
}

function uwagiWiersza21(f) {
  var braki = f.braki.length && f.status === "oczekuje"
    ? '<div class="small" style="color:var(--neg-ink)">Niekompletne dane. Brakuje: ' + esc(f.braki.join(", ")) + '</div>' : "";
  var powod = f.powod ? '<div class="small" style="color:var(--neg-ink)">Powód: ' + esc(f.powod) + '</div>' : "";
  return braki + powod;
}

function wierszWyslanego21(f) {
  return '<tr><td class="small nowrap mono">' + esc(DB.fmtDate(f.data)) + '</td>' +
    '<td class="strong">' + esc(f.firma) + '<div class="small muted mono">' + esc(f.nip) + '</div>' + uwagiWiersza21(f) + '</td>' +
    '<td class="small">' + esc(f.is) + '</td><td class="small">' + esc(ZRODLA_21[f.zrodlo] || f.zrodlo) + '</td>' +
    '<td>' + tagStatusu21(f) + '</td></tr>';
}

function renderLista21() {
  var lista = wyslaneFormularze21();
  el21("wyslane").innerHTML = lista.length ? lista.map(wierszWyslanego21).join("") :
    '<tr><td colspan="5"><div class="empty"><div class="et">Brak wysłanych formularzy</div>Formularz wysłany z tego ekranu pojawi się tutaj ze statusem.</div></td></tr>';
  el21("liczWyslane").textContent = lista.length;
}
