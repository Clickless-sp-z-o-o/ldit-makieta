/* ============================================================================
   Powloka makiety (index.html): podmenu Dofinansowan. Same deklaracje.

   Pod "Dofinansowania" sa lata jak arkusze w Excelu (D-129, D-159), a pod
   kazdym rokiem instytucje z przydzialu konta (D-112, D-113). Liczby przy
   latach przychodza z ekranu w ramce (Nawigacja.zglosEkran), bo kopia bazy
   w powloce jest z chwili logowania. Powloka niczego nie zapisuje: "+ Dodaj
   rok" otwiera formularz w Zestawieniach, ktore pracuja na swiezej bazie.
   ============================================================================ */

function adresRoku(rok, nazwaIS) {
  return "02-zestawienia.html" + Nawigacja.zbudujZapytanie({ is: nazwaIS || "", rok: rok });
}

function etykietaRoku(rok) {
  return rok === Lata.NIEPRZYPISANE ? "Nieprzypisane" : "Dofinansowania " + rok;
}

function htmlInstytucjiRoku(rok, instytucje) {
  var wszystkie = '<div class="nav-item sub-is" data-rok="' + esc(rok) + '" data-is="" data-plik="' + esc(adresRoku(rok)) + '"' +
    ' data-label="Wszystkie instytucje" data-tip="Wnioski kazdej instytucji w zasiegu konta w danym roku. D-127, D-241.">' +
    '<span>Wszystkie instytucje</span></div>';
  return wszystkie + instytucje.map(function (nazwa) {
    return '<div class="nav-item sub-is" data-rok="' + esc(rok) + '" data-is="' + esc(nazwa) + '"' +
      ' data-plik="' + esc(adresRoku(rok, nazwa)) + '" data-label="' + esc(nazwa) + '"' +
      ' data-tip="Tylko klienci i wnioski instytucji ' + esc(nazwa) + ' (separacja danych, D-35)."><span>' + esc(nazwa) + '</span></div>';
  }).join("");
}

/* lata: [{rok, n}], otwarte: {rok: true}. Rok dodaje administrator w Ustawieniach, nie z menu (D-273) */
function htmlPodmenuDofin(lata, instytucje, otwarte) {
  var html = lata.map(function (l) {
    var nieprzypisane = l.rok === Lata.NIEPRZYPISANE;
    var otwarty = !nieprzypisane && otwarte[l.rok];
    return '<div class="nav-item sub-rok' + (otwarty ? " open" : "") + '" data-rok="' + esc(l.rok) + '"' +
        ' data-plik="' + esc(adresRoku(l.rok)) + '" data-label="' + esc(etykietaRoku(l.rok)) + '">' +
        (nieprzypisane ? '<span class="chev-miejsce"></span>' : '<span class="chev">&#9654;</span>') +
        '<span>' + esc(etykietaRoku(l.rok)) + '</span><span class="n">' + Number(l.n) + '</span></div>' +
      (nieprzypisane ? "" : '<div class="nav-sub2' + (otwarty ? " open" : "") + '" data-rok="' + esc(l.rok) + '">' +
        htmlInstytucjiRoku(l.rok, instytucje) + '</div>');
  }).join("");
  return '<div class="nav-sub" id="sub-dofin">' + html + '</div>';
}

/* Rok jest lista rozwijana: klik zwija albo rozwija jego instytucje i niczego nie otwiera.
   Widok calego roku otwiera jedna pozycja "Wszystkie instytucje", zeby dwie pozycje menu
   nie robily tego samego (D-241). Zwraca true, gdy po kliknieciu trzeba otworzyc widok
   (tylko rok bez listy instytucji, czyli Nieprzypisane). */
function kliknietoRok(el, cel, otwarte) {
  var rok = el.getAttribute("data-rok");
  var lista = document.querySelector('.nav-sub2[data-rok="' + CSS.escape(rok) + '"]');
  if (!lista) return true;
  var otwarty = !lista.classList.contains("open");
  lista.classList.toggle("open", otwarty);
  el.classList.toggle("open", otwarty);
  otwarte[rok] = otwarty;
  return false;
}

/* Lata z komunikatu ekranu roznia sie od menu (nowy rok, zmiana liczby wnioskow) */
function inneLata(a, b) {
  return JSON.stringify(a || []) !== JSON.stringify(b || []);
}
