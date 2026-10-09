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

/* Zmiany danych instytucji zgloszone do akceptacji LDIT, jeszcze nierozpatrzone (D-224):
   pole, wartosc obecna i nowa. Pusty tekst, gdy nic nie czeka. */
function zmianyKontaHtml(instytucjaId) {
  var czekajace = DB.PROPOZYCJE.filter(function (p) {
    return p.tabela === "instytucje" && p.rekord === instytucjaId && p.status === "oczekuje";
  });
  if (!czekajace.length) return "";
  var wiersze = [];
  czekajace.forEach(function (p) {
    Object.keys(p.zmiany).forEach(function (k) {
      var z = p.zmiany[k];
      wiersze.push("<li><b>" + esc(Akceptacje.POLA.instytucje[k] || k) + "</b>: zmiana czeka na akceptację, nowa wartość <b>" +
        esc(z.po == null || z.po === "" ? "(puste)" : z.po) + '</b> <span class="small muted">(dziś: ' + esc(z.przed == null || z.przed === "" ? "puste" : z.przed) + ")</span></li>");
    });
  });
  return '<div class="note warn mb0 zmiany-konta"><b>Zmiany czekające na akceptację LDIT</b><ul style="margin:6px 0 0;padding-left:18px">' + wiersze.join("") + "</ul></div>";
}
