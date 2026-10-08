/* Ekran Terminy: firmy klientow zapisanych na termin (D-254).
   Zrodlo: uczestnicy wnioskow przypisani do terminu (uczestnicy.termin_id). Pokazujemy
   tylko firmy klientow widocznych dla konta (DB.KLIENCI przeszlo przez separacje danych). */
var MAX_FIRM_W_KAFELKU = 2;

function firmyTerminu(t) {
  var widoczni = {};
  DB.KLIENCI.forEach(function (k) { widoczni[k.id] = true; });
  var wynik = [], widziane = {};
  (STAN_13.uczestnicyPoTerminie[t.id] || []).forEach(function (u) {
    if (!widoczni[u.klient_id] || widziane[u.klient_id]) return;
    widziane[u.klient_id] = true;
    wynik.push({ nazwa: u.klient, nip: u.nip || "" });
  });
  return wynik;
}

/* Tekst do wyszukiwania po nazwie firmy lub NIP (NIP takze bez myslnikow) */
function tekstFirmTerminu(t) {
  return firmyTerminu(t).map(function (f) {
    return f.nazwa + " " + f.nip + " " + f.nip.replace(/\D/g, "");
  }).join(" ");
}

function htmlFirmKafelka(t) {
  var firmy = firmyTerminu(t);
  if (!firmy.length) return "";
  var pokazane = firmy.slice(0, MAX_FIRM_W_KAFELKU).map(function (f) { return esc(f.nazwa); }).join(", ");
  var reszta = firmy.length > MAX_FIRM_W_KAFELKU ? " +" + (firmy.length - MAX_FIRM_W_KAFELKU) : "";
  return '<div style="font-size:12px;opacity:.85" title="' + esc(firmy.map(function (f) { return f.nazwa; }).join(", ")) +
    '">' + pokazane + reszta + '</div>';
}
