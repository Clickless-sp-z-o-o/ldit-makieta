/* Ekran 12, czesc 3: karty polityki retencji (P-26). Statyczne tresci, generowane z opisu. */

var KARTY_RETENCJI = [
  { tytul: "Wpisy rejestru zmian", etykieta: "Okres przechowywania",
    opcje: ["do ustalenia z klientem", "12 miesięcy", "36 miesięcy", "bezterminowo"],
    podpowiedz: "Rekomendacja wykonawcy: bezterminowo, bo objętość jest niewielka, a wartość dowodowa rośnie z czasem." },
  { tytul: "Log logowań", etykieta: "Okres przechowywania",
    opcje: ["do ustalenia z klientem", "6 miesięcy", "12 miesięcy", "24 miesiące"],
    podpowiedz: "Rekomendacja wykonawcy: 12 miesięcy, tyle wystarcza do wyjaśnienia incydentu zgłoszonego z opóźnieniem." },
  { tytul: "Dane uczestników i PESEL", etykieta: "Po rozliczeniu szkolenia",
    opcje: ["do ustalenia z klientem", "pozostają bez zmian", "archiwizacja rocznika", "anonimizacja"],
    podpowiedz: "Decyzja klienta, prawdopodobnie po konsultacji prawnej. Wpływa na model danych, nie tylko na interfejs." }
];
var STYL_ETYKIETY_KARTY = "font-size:12px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:7px";

function kartaRetencji(k) {
  return '<div class="card mb0"><div class="card-body">' +
    '<div class="k-label" style="' + STYL_ETYKIETY_KARTY + '">' + esc(k.tytul) + '</div>' +
    '<div class="field mb0"><label>' + esc(k.etykieta) + '</label>' +
    '<select class="inp">' + k.opcje.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join("") + '</select>' +
    '<div class="hint">' + esc(k.podpowiedz) + '</div></div></div></div>';
}

function renderRetencja() {
  document.getElementById("kartyRetencji").innerHTML = KARTY_RETENCJI.map(kartaRetencji).join("");
}
