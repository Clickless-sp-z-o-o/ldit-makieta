/* Ekran Wniosek: prowizja per wniosek (tylko z uprawnieniem finanse.prowizja).
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- Prowizja (wylacznie administrator, D-07/D-34) ---------- */
var OPIS_MODELU = {
  A: "próg miesięczny, stawka od całości", B: "skala roczna YTD, stawka od nadwyżki",
  C: "próg miesięczny, stawka od nadwyżki", D: "stała stawka"
};
function trybProwizji() {
  if (STAN_03.raw.prowizja_regula_aktywna !== 0) return "regula";
  return STAN_03.raw.prowizja_typ_nadpisania === "kwota" ? "kwota" : "procent";
}
/* Kwota i stawka wynikaja wylacznie z nadpisania. Dla reguly kwote liczy okres
   w Administracji, bo zalezy od obrotu okresu (progi, kumulacja). */
function wynikNadpisania(tryb, podstawa) {
  var wartosc = STAN_03.raw.prowizja_wartosc;
  if (tryb === "regula" || wartosc == null) return { kwota: null, stawka: null };
  if (tryb === "kwota") return { kwota: wartosc, stawka: podstawa ? wartosc / podstawa * 100 : null };
  return { kwota: podstawa == null ? null : podstawa * wartosc / 100, stawka: wartosc };
}
function opcjaTrybu(wartosc, tryb, tekst) {
  return '<option value="' + wartosc + '"' + (tryb === wartosc ? " selected" : "") + '>' + tekst + '</option>';
}
function renderProwizja() {
  if (!STAN_03.widziProwizje) return;
  var tryb = trybProwizji();
  var podstawa = STAN_03.w.podstawaProwizji;
  var wynik = wynikNadpisania(tryb, podstawa);
  var kwotaTekst = wynik.kwota == null
    ? (tryb === "regula" ? "wg reguły instytucji" : "wpisz wartość") : DB.fmtPLN2(wynik.kwota);
  var model = STAN_03.inst && STAN_03.inst.prowizja ? STAN_03.inst.prowizja.model : null;

  el("prowizja").innerHTML =
    '<div class="kpi" style="border:0;padding:0;box-shadow:none;margin-bottom:12px">' +
    '<div class="k-label">Prowizja od tego projektu</div>' +
    '<div class="k-value">' + esc(kwotaTekst) + '</div>' +
    '<div class="k-foot">' + (wynik.stawka == null ? "" : 'stawka efektywna <b>' + esc(DB.fmtPct(Math.round(wynik.stawka * 100) / 100)) + '</b> ') +
      (tryb === "regula" ? "" : '<span class="tag set dot">ręcznie</span>') + '</div></div>' +

    '<div class="field" style="margin-bottom:10px">' +
      '<label>Tryb prowizji <span class="calc-badge manual">admin</span>' +
      '<span class="tip-mark" data-tip="Zgodnie z zasadami = licz wg warunkow instytucji (model A/B/C/D). Indywidualne nadpisanie per wniosek jako PROCENT albo KWOTA (D-136). Zmienia wylacznie administrator (D-93).">i</span></label>' +
      '<select class="inp" onchange="ustawTrybProwizji(this.value)"' + (STAN_03.mozeEdytowac ? "" : " disabled") + '>' +
        opcjaTrybu("regula", tryb, "Zgodnie z zasadami instytucji") +
        opcjaTrybu("procent", tryb, "Indywidualny procent (nadpisanie)") +
        opcjaTrybu("kwota", tryb, "Indywidualna kwota (nadpisanie)") +
      '</select>' +
    '</div>' +

    (tryb === "regula" ? "" :
      '<div class="field calc-field overridden" style="margin-bottom:10px">' +
        '<label>' + (tryb === "kwota" ? "Kwota prowizji (zł)" : "Stawka indywidualna (%)") + '</label>' +
        '<input class="inp num" value="' + esc(STAN_03.raw.prowizja_wartosc == null ? "" : STAN_03.raw.prowizja_wartosc) +
          '" onchange="zmienWartoscProwizji(this.value)"' + (STAN_03.mozeEdytowac ? "" : " disabled") + '>' +
        '<div class="restore-rule"><span>&#9888; reguła wyłączona</span>' +
        '<button onclick="ustawTrybProwizji(\'regula\')">Przywróć regułę</button></div>' +
      '</div>') +

    '<dl class="dl">' +
    '<dt>Podstawa</dt><dd>' + (podstawa == null ? '<span class="muted">po decyzji pozytywnej</span>' : esc(DB.fmtPLN2(podstawa))) +
      '<div class="small muted">' + (STAN_03.w.doplataNaFakturze ? "koszt całkowity z dopłatą" : "koszt całkowity bez dopłaty") + ' <span class="ref">D-174</span></div></dd>' +
    '<dt>Model</dt><dd>' + (model
      ? '<span class="pill k">' + esc(model) + '</span> ' + esc(OPIS_MODELU[model])
      : '<span class="muted">instytucja bez warunków</span>') + '</dd>' +
    '</dl>' +

    '<div class="note" style="margin:12px 0 0;font-size:12px">' +
    'Prowizja okresu liczy się w module <b>Administracja</b>, bo zależy od obrotu okresu i progów. Tu ustawiasz tylko nadpisanie <b>per wniosek</b> ' +
    '<span class="ref">D-93</span>. Instytucja nie widzi żadnej stawki <span class="ref">D-07</span>.' +
    (tryb === "regula" ? "" : '<div style="margin-top:6px">Nadpisany wniosek <b>wlicza się do puli progowej</b> pozostałych wniosków instytucji <span class="ref">D-137</span>.</div>') +
    '</div>';
}

var ETYKIETA_TRYBU = { regula: "reguła instytucji", procent: "indywidualny procent", kwota: "indywidualna kwota" };
function ustawTrybProwizji(tryb) {
  var przed = ETYKIETA_TRYBU[trybProwizji()];
  var patch = tryb === "regula"
    ? { prowizja_regula_aktywna: 1 }
    : { prowizja_regula_aktywna: 0, prowizja_typ_nadpisania: tryb, prowizja_wartosc: null };
  zapiszZmiany("wnioski", STAN_03.w.id, patch,
    [{ typ: "Nadpisanie prowizji", pole: "Tryb prowizji", przed: przed, po: ETYKIETA_TRYBU[tryb] }]);
}
function zmienWartoscProwizji(tekst) {
  var v = parseFloat(String(tekst).replace(/\s/g, "").replace(",", "."));
  var nowa = isNaN(v) ? null : v;
  zapiszZmiany("wnioski", STAN_03.w.id, { prowizja_wartosc: nowa },
    [{ typ: "Nadpisanie prowizji", pole: trybProwizji() === "kwota" ? "Kwota prowizji" : "Prowizja %",
       przed: STAN_03.raw.prowizja_wartosc, po: nowa }]);
}
