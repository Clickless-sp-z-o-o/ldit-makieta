/* Ekran Wniosek: dane projektu, korespondencja klienta.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- Dane projektu ----------
   Dane firmy (NIP, adres, konto, zatrudnienie, osoby firmy) edytuje sie tylko w karcie klienta (D-265).
   We wniosku jest nazwa firmy i przycisk przejscia do klienta. */
function renderDane() {
  var wiersze = [
    ["Numer klienta", "<b>" + esc(STAN_03.w.nr) + "</b> <span class='small muted'>(trafia na fakturę)</span>"],
    ["Firma", '<b>' + esc(STAN_03.w.klNazwa) + '</b><div style="margin-top:6px"><a class="btn sm" id="btnDoKlienta" href="' +
      esc(Nawigacja.adresKlienta(STAN_03.w.klient)) + '" data-tip="Dane firmy (adres, NIP, konto, zatrudnienie, osoby kontaktowe) edytujesz w karcie klienta, nie we wniosku (D-265).">Przejdź do klienta</a></div>'],
    ["Instytucja", Auth.widziModul("inst")
      ? '<a class="link-rekordu" href="06-instytucje.html' + esc(Nawigacja.zbudujZapytanie({ id: STAN_03.w.is })) + '">' + esc(STAN_03.w.isNazwa) + '</a>'
      : esc(STAN_03.w.isNazwa)],
    ["Data formularza", esc(DB.fmtDate(STAN_03.w.dataFormularza)) + ' <span class="tag mute">auto</span>'],
    ["Data wniosku", esc(DB.fmtDate(STAN_03.w.dataWniosku)) || "brak"],
    ["Data faktury", (esc(DB.fmtDate(STAN_03.w.dataFaktury)) || "brak") + ' <span class="small muted">wyznacza okres prowizji</span>']
  ];
  el("dane").innerHTML = wiersze.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");
  document.getElementById("tytul").textContent = STAN_03.w.id + " · " + STAN_03.w.klNazwa;
  KOLUMNY_KONTAKTU.forEach(function (k) { el(k[1]).value = STAN_03.raw[k[0]] || ""; });
}

/* ---------- Korespondencja klienta ---------- */
function renderMaile() {
  var maile = DB.MAILE.filter(function (m) { return m.klient === STAN_03.w.klient; });
  el("maile").innerHTML = maile.length ? maile.map(function (m) {
    return '<tr><td>' + (m.kier === "in" ? '<span class="tag info">&#8600;</span>' : '<span class="tag mute">&#8599;</span>') + '</td>' +
      '<td class="strong">' + esc(m.temat) + '</td>' +
      '<td class="small muted">' + esc(m.skrz) + '</td>' +
      '<td class="small nowrap">' + esc(DB.fmtDate(m.data)) + '</td>' +
      '<td class="c">' + (m.zal ? '<span class="pill">' + esc(m.zal) + '</span>' : '<span class="muted">&mdash;</span>') + '</td></tr>';
  }).join("") : '<tr><td colspan="5" class="muted">Brak korespondencji tego klienta.</td></tr>';
}
