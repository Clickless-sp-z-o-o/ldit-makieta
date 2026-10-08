/* Konto instytucji (D-288): jeden widok danych instytucji dla obu stron. Pracownik oglada go
   w Instytucjach dla kazdej instytucji ze swojego zakresu, konto instytucji w swoim panelu
   tylko dla swojej (DB.INSTYTUCJE jest juz zawezone do zakresu konta). Zmiany danych
   instytucja zglasza do akceptacji (D-224). Bez warunkow prowizyjnych (D-07). Tylko deklaracje. */

function kontaktyHtml(i) {
  if (!i.kontakty.length) return '<span class="muted">Nie wskazano</span>';
  return i.kontakty.map(function (k, n) {
    return "<div>" + (n === 0 ? "<b>" : "") + esc(k.osoba || "-") + (n === 0 ? "</b> (główny)" : "") +
      '<div class="small muted">' + esc([k.mail, k.tel].filter(Boolean).join(" · ")) + "</div></div>";
  }).join("");
}

/* Wspolne wiersze konta: [etykieta, html] */
function wierszeKontaInstytucji(i) {
  return [["Nazwa", "<b>" + esc(i.nazwa) + "</b>"],
    ["NIP", '<span class="mono">' + esc(i.nip) + "</span>"],
    ["Strona www", i.www ? esc(i.www) : '<span class="muted">-</span>'],
    ["Siedziba (miejscowość)", "<b>" + esc(i.miasto) + '</b> <span class="tag info dot">źródło miejscowości na certyfikacie</span> <span class="ref">D-99</span>'],
    ["Opis działalności", esc(i.opis)],
    ["Standard godzinowy", '<span class="pill w">' + esc(i.standard) + "</span>"],
    ["Osoby kontaktowe", kontaktyHtml(i)],
    ["Opiekunowie instytucji", i.opiekun ? esc(i.opiekun) : '<span class="muted">Nie przypisano</span>']];
}

function kontoInstytucjiHtml(wiersze) {
  return wiersze.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");
}
