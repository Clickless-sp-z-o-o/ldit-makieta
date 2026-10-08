/* Konta i uprawnienia, zakladka 5: podglad konta i roli (D-268). Administrator widzi, co zobaczy
   konto albo rola, zanim je udostepni. Obliczenia w assets/podglad-roli.js, tu tylko widok.
   Tylko odczyt: nikt sie nie loguje, sesja administratora zostaje bez zmian. */
var PREFIKS_ROLA_11 = "rola:";

function opcjePodgladu11() {
  var konta = DB.UZYTKOWNICY.map(function (u) {
    return '<option value="' + esc(u.login) + '">' + esc(u.imie) + ' (' + esc(u.login) + ')</option>';
  }).join("");
  var role = DB.ROLE.map(function (r) {
    return '<option value="' + PREFIKS_ROLA_11 + esc(r.id) + '">' + esc(r.nazwa) + '</option>';
  }).join("");
  return '<optgroup label="Konta">' + konta + '</optgroup><optgroup label="Role (bez konta)">' + role + '</optgroup>';
}

function opisWybranegoPodgladu11() {
  var wartosc = document.getElementById("selPodglad").value;
  if (wartosc.indexOf(PREFIKS_ROLA_11) === 0) return PodgladRoli.opiszRole(wartosc.slice(PREFIKS_ROLA_11.length));
  return PodgladRoli.opiszKonto(wartosc);
}

function menuPodgladu11(menu) {
  if (!menu.length) return '<div class="nic">Brak modułów. Po zalogowaniu widoczny tylko profil i wylogowanie.</div>';
  return menu.map(function (m) {
    return '<div class="mi">' + esc(m.nazwa) +
      (m.poziom === "edycja" ? '<b>edycja</b>' : '<b style="color:#64748b">podgląd</b>') + '</div>';
  }).join("");
}

function polaPodgladu11(pola) {
  return '<table class="tbl"><tbody>' + pola.map(function (p) {
    return '<tr><td><span class="mono strong">' + esc(p.id) + '</span><div class="small muted">' + esc(p.opis) + '</div></td>' +
      '<td class="c"><span class="lv ' + (p.ma ? "full" : "none") + '">' + (p.ma ? "widzi" : "nie widzi") + '</span></td></tr>';
  }).join("") + '</tbody></table>';
}

function zakresPodgladu11(z) {
  var instytucje = z.wszystkieInstytucje ? "wszystkie instytucje"
    : (z.instytucje.length ? z.instytucje.map(function (i) { return esc(i.nazwa); }).join(", ") : "brak instytucji");
  return '<div class="small" style="line-height:1.8">' +
    '<div><b>Instytucje:</b> ' + instytucje + '</div>' +
    '<div><b>Klienci widoczni dla konta:</b> ' + DB.fmtNum(z.klienci) + '</div>' +
    '<div><b>Wnioski widoczne dla konta:</b> ' + DB.fmtNum(z.wnioski) + '</div>' +
    (z.handlowiec ? '<div class="note mb0" style="margin-top:8px">Handlowiec: tylko swoi klienci i wnioski <span class="ref">D-210</span>.</div>' : '') +
    '</div>';
}

function karta11(tytul, tresc) {
  return '<div class="card mb0"><div class="card-head"><h3>' + tytul + '</h3></div><div class="card-body">' + tresc + '</div></div>';
}

function renderPodglad11() {
  var el = document.getElementById("podgladWynik");
  var opis = opisWybranegoPodgladu11();
  if (!opis.ok) { el.innerHTML = '<div class="note warn">' + esc(opis.blad) + '</div>'; return; }
  var naglowek = opis.konto
    ? esc(opis.konto.imie) + ', rola: ' + esc(opis.rola.nazwa) + (opis.konto.zablokowane ? ' (konto zablokowane)' : '')
    : 'Rola: ' + esc(opis.rola.nazwa) + ' (bez konta, zakres danych zależy od przypisania)';
  el.innerHTML = '<div class="note">' + naglowek + '</div>' +
    '<div class="grid g2" style="gap:16px">' +
    karta11("Menu boczne", '<div class="menu-prev">' + menuPodgladu11(opis.menu) + '</div>') +
    karta11("Pola i dane wrażliwe", polaPodgladu11(opis.pola)) + '</div>' +
    (opis.zakres ? '<div style="margin-top:16px">' + karta11("Zakres danych", zakresPodgladu11(opis.zakres)) + '</div>' : '');
}

function inicjujPodglad11() {
  var sel = document.getElementById("selPodglad");
  var wybrane = sel.value;
  sel.innerHTML = opcjePodgladu11();
  if (wybrane) sel.value = wybrane;
  renderPodglad11();
}
