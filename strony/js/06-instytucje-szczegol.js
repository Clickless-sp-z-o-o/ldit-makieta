/* Ekran Instytucje: szczegoly (Konto instytucji, osoby, konta, korespondencja).
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- Szczegol: Konto instytucji (D-288), wspolne wiersze w konto-instytucji.js ---------- */
function renderDane(i) {
  var kl = klienciIS(i.id), wn = wnioskiIS(i.id);
  el("daneFirmy").innerHTML = kontoInstytucjiHtml(wierszeKontaInstytucji(i).concat([
    ["Identyfikator", '<span class="mono">' + esc(i.id) + '</span> <span class="pill">' + esc(i.skrot) + '</span>'],
    ["Status", czyAktywna(i.id) ? '<span class="tag pos">aktywna</span>' : '<span class="tag mute">nieaktywna</span>'],
    ["Model terminów", esc(MODEL_TERMINOW[i.modelTerminow] || i.modelTerminow) + ' <span class="ref">D-142</span>'],
    ["Programy szkoleń", szkoleniaIS(i.id).length],
    ["Klientów przypisanych", DB.fmtNum(kl.length)],
    ["Projekty aktywne", aktywneIS(i.id).length + " z " + wn.length + " w roku 2026"],
    ["Warunki prowizyjne", widziKonfiguracje06()
      ? 'w zakładce Warunki prowizyjne <span class="ref">D-07</span>'
      : '<span class="tag mute dot">widoczne tylko dla administratora</span> <span class="ref">D-07</span>']
  ]));
}

/* ---------- Szczegol: osoby, konta, korespondencja ---------- */
function osobaBox(tytul, k) {
  return '<div class="card mb0"><div class="card-head"><h3>' + tytul + "</h3></div>" +
    '<div class="card-body">' +
    (k
      ? '<div style="font-size:14px;font-weight:700">' + esc(k.osoba || "-") + "</div>" +
        '<div class="small muted" style="margin-top:3px">' + esc([k.mail, k.tel].filter(Boolean).join(" · ")) + "</div>"
      : '<div class="muted small">Nie wskazano.</div>') +
    "</div></div>";
}
/* Tylko role o zakresie instytucja: bez pracownika LDIT przypisanego do firmy (D-248) */
function czyRolaInstytucji(rolaId) {
  var r = Store.find("role", rolaId);
  return !!r && r.typ === "instytucja";
}
function renderOsoby(i) {
  el("role3").innerHTML = [0, 1, 2].map(function (n) {
    return osobaBox(n === 0 ? "Kontakt główny" : "Osoba kontaktowa " + (n + 1), i.kontakty[n]);
  }).join("");
  var konta = DB.UZYTKOWNICY.filter(function (u) {
    return czyRolaInstytucji(u.rolaId) && u.inst.split(", ").indexOf(i.nazwa) >= 0;
  });
  el("konta").innerHTML = konta.length ? konta.map(function (u) {
    return "<tr>" +
      '<td class="strong">' + esc(u.imie) + "</td>" +
      '<td class="mono small">' + esc(u.login) + "</td>" +
      "<td><span class='tag " + (u.rolaId === "is" ? "info" : "mute") + "'>" + esc(u.rola) + "</span></td>" +
      '<td class="small nowrap">' + esc(DB.fmtDate(u.ost)) + "</td>" +
      '<td class="c">' + (u["2fa"] ? '<span class="tag pos">tak</span>' : '<span class="tag warn">nie</span>') + "</td>" +
      '<td class="right"><a class="btn xs" href="11-konta-uprawnienia.html">Uprawnienia</a></td>' +
      "</tr>";
  }).join("") : '<tr><td colspan="6"><div class="empty"><div class="ei">&#9723;</div>' +
    '<div class="et">Brak kont</div>Instytucja nie ma jeszcze założonych kont w systemie.</div></td></tr>';
}
function renderMaile(i) {
  var maile = DB.MAILE.filter(function (m) { return m.isId === i.id; });
  el("maile").innerHTML = maile.length ? maile.map(function (m) {
    return "<tr>" +
      "<td>" + (m.kier === "in" ? '<span class="tag info">&#8600;</span>' : '<span class="tag mute">&#8599;</span>') + "</td>" +
      '<td class="strong">' + esc(m.temat) + "</td>" +
      '<td class="small mono muted">' + esc(m.od) + "</td>" +
      '<td class="small muted">' + esc(m.skrz) + "</td>" +
      '<td class="small nowrap">' + esc(DB.fmtDate(m.data)) + "</td>" +
      '<td class="c">' + (m.zal ? '<span class="pill">' + esc(m.zal) + "</span>" : '<span class="muted">&ndash;</span>') + "</td>" +
      "</tr>";
  }).join("") : '<tr><td colspan="6"><div class="empty"><div class="et">Brak korespondencji</div>Brak wiadomości przypisanych do tej instytucji.</div></td></tr>';
}

function renderSzczegol() {
  var i = aktualnaIS();
  if (!i) { el("detNazwa").textContent = "Brak instytucji"; return; }
  var klientow = klienciIS(i.id).length, projektow = wnioskiIS(i.id).length;
  el("detNazwa").textContent = i.nazwa;
  el("detKolor").style.setProperty("--kolor-is", i.kolor);
  el("detSub").textContent = i.id + " · " + i.miasto + " · " + DB.fmtNum(klientow) + " " + odmiana06(klientow, "klient") +
    " · " + projektow + " " + odmiana06(projektow, "projekt") + " w 2026";
  pokazTylkoGdyEdycja("btnEdytujIS");
  pokazTylkoGdyEdycja("btnNowaIS");
  renderDane(i);
  renderKatalog(i);
  renderOsoby(i);
  renderMaile(i);
  /* Warunki, certyfikat, faktura i formularz: tylko administrator (D-07), kod w 07-konfigurator-is-*.js */
  if (widziKonfiguracje06()) pokazKonfiguracje07(i.id);
}
