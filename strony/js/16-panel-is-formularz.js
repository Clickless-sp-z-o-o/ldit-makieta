/* Panel instytucji: kolejka formularzy czekajacych na akceptacje LDIT (tylko deklaracje).
   Formularza nie wypelnia klient koncowy, wprowadza go instytucja albo LDIT (D-244). */

function oczekujace16() {
  return STAN_16.FORMULARZE.filter(function (k) { return k.status === "oczekuje"; });
}

function wierszKolejki16(k) {
  return '<tr><td class="strong">' + esc(k.firma) + '<div class="small muted">' + esc(k.szkolenie) + '</div>' +
    (k.braki.length ? '<div class="small" style="color:var(--neg-ink)">Brakuje: ' + esc(k.braki.join(", ")) + '</div>' : "") + '</td>' +
    '<td class="num">' + esc(k.osob) + '</td>' +
    '<td class="small nowrap">' + esc(DB.fmtDate(k.data)) + '</td></tr>';
}

function renderKolejka16() {
  var lista = oczekujace16();
  el16("kolejka").innerHTML = lista.length ? wiersze16(lista, wierszKolejki16) :
    '<tr><td colspan="3"><div class="empty"><div class="ei">&#9993;</div>' +
    '<div class="et">Brak zgłoszeń do akceptacji</div>Wysłane formularze pojawią się tutaj do czasu decyzji LDIT.</div></td></tr>';
}
