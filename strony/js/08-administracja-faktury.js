/* Administracja 08: zakladka Faktury. Tylko deklaracje. */
function widokFaktury() {
  document.getElementById("t-faktury").innerHTML = `

    <div class="grid g4" style="margin-bottom:18px" id="kpiFakt"></div>

    <div class="card">
      <div class="card-head">
        <h3>Import faktur z systemu księgowego <span class="ref">D-39</span></h3>
        <span class="sub">import CSV zamiast integracji API</span>
      </div>
      <div class="card-body">
        <div class="btn-row" style="align-items:center">
          <button class="btn primary" id="btnCsv">Importuj z systemu księgowego (CSV)</button>
          <button class="btn atrapa" data-tip="W aplikacji docelowej">Pobierz szablon CSV</button>
          <span class="small muted">Import w makiecie jest demonstracją, bez zapisu do bazy.</span>
        </div>
        <dl class="dl mt16">
          <dt>Wolumen</dt>
          <dd>5 do 40 faktur miesięcznie, około 300 rocznie</dd>
          <dt>Koszt rozwiązania</dt>
          <dd>import CSV około 1 godziny pracy, integracja API 10 do 15 godzin plus przechowywanie klucza API</dd>
          <dt>Główny przypadek użycia PDF</dt>
          <dd>sprawdzenie terminu płatności bez logowania do systemu księgowego</dd>
          <dt>Numer faktury w arkuszu</dt>
          <dd>kolumna znika z arkusza operacyjnego, faktury żyją wyłącznie w tym module</dd>
        </dl>
      </div>
    </div>

    <div class="note warn">
      <b>Blokada <span class="ref p">P-09</span>: nie potwierdzono, czy system księgowy udostępnia eksport CSV.</b>
      System klienta to <b>eSzokBR</b>. Klient miał zadzwonić do księgowej w przerwie warsztatu,
      odpowiedź nie padła. <b>Cały moduł faktur opiera się na tym założeniu.</b>
      Jeżeli eksport nie istnieje, decyzja „import zamiast integracji API” upada i wracamy do wyceny
      integracji, czyli 10 do 15 godzin plus obsługa klucza API do systemu fakturowego, a to jest
      dodatkowa powierzchnia ryzyka bezpieczeństwa. Do czasu potwierdzenia ta zakładka jest
      projektowana warunkowo.
    </div>

    <div class="card">
      <div class="toolbar">
        <input class="inp search" id="qF" placeholder="Szukaj: numer faktury, instytucja...">
        <select class="inp" id="fFIS" data-wielo><option value="">Wszystkie instytucje</option></select>
        <select class="inp" id="fFSt" data-wielo>
          <option value="">Wszystkie statusy</option>
          <option>Opłacona</option><option>Oczekuje</option><option>Po terminie</option>
        </select>
        <span class="sp"></span>
        <span class="small muted" id="liczF"></span>
      </div>
      <div class="tbl-wrap" style="max-height:560px;overflow-y:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Numer<span class="tip-mark" data-tip="Numer faktury z systemu księgowego. Ten sam numer pokazywany jest przy powiązanym wniosku, żeby odnaleźć fakturę bez logowania do księgowości (D-139).">i</span></th>
              <th>Instytucja<span class="tip-mark" data-tip="Kontrahent faktury dopasowany do instytucji po NIP przy imporcie CSV.">i</span></th>
              <th class="num">Kwota<span class="tip-mark" data-tip="Kwota brutto z faktury zaimportowanej z systemu księgowego.">i</span></th>
              <th class="c">VAT<span class="tip-mark" data-tip="Stawka VAT z faktury. Wchodzi do statystyk kwotowych jako przychód i VAT (D-141).">i</span></th>
              <th>Wystawiona<span class="tip-mark" data-tip="Data wystawienia faktury. Jest okresem rozliczeniowym prowizji rzeczywistej (P-01).">i</span></th>
              <th>Termin płatności<span class="tip-mark" data-tip="Główny powód importu faktur: sprawdzenie terminu płatności bez logowania do systemu księgowego.">i</span></th>
              <th>Status<span class="tip-mark" data-tip="Status płatności zaczytany z systemu księgowego: Opłacona, Oczekuje, Po terminie.">i</span></th>
              <th class="num">Projekty<span class="tip-mark" data-tip="Liczba projektów objętych tą fakturą.">i</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tabFakt"></tbody>
        </table>
      </div>
    </div>
`;
}

function tagFakt(s) {
  if (s === "Opłacona") return '<span class="tag pos dot">Opłacona</span>';
  if (s === "Po terminie") return '<span class="tag neg dot">Po terminie</span>';
  return '<span class="tag info dot">Oczekuje</span>';
}

function numerFakturyHtml(f) {
  if (f.rodzaj !== "korygujaca") return esc(f.nr);
  var pierwotna = STAN_08.fakturyPoId[f.korygowana] || {};
  return esc(f.nr) + ' <span class="tag neg">korekta</span>' +
    '<div class="small muted">do ' + esc(pierwotna.nr || f.korygowana) + ', okres ' + esc(f.okres) +
    '<br>korekta rozliczona w okresie wystawienia <span class="ref">D-161</span></div>';
}

function renderFaktury() {
  var q = document.getElementById("qF").value.toLowerCase().trim();
  var fis = Wielowybor.wartosci(STAN_08.selFIS);
  var fst = Wielowybor.wartosci(document.getElementById("fFSt"));

  var lista = DB.FAKTURY.filter(function (f) {
    if (!Wielowybor.pasuje(fis, f.isId)) return false;
    if (!Wielowybor.pasuje(fst, f.status)) return false;
    return !q || (f.nr + " " + f.is).toLowerCase().indexOf(q) >= 0;
  });
  var suma = function (a) { return a.reduce(function (s, f) { return s + f.kwota; }, 0); };

  document.getElementById("liczF").innerHTML =
    "<b>" + lista.length + "</b> z " + DB.FAKTURY.length + " faktur &middot; " + DB.fmtPLN(suma(lista));

  document.getElementById("tabFakt").innerHTML = lista.map(function (f) {
    return '<tr class="' + (f.status === "Po terminie" ? "row-danger" : "") + '">' +
      '<td class="strong mono">' + numerFakturyHtml(f) + '</td>' +
      '<td class="nowrap">' + esc(f.is) + '</td>' +
      '<td class="num strong">' + DB.fmtPLN2(f.kwota) + '</td>' +
      '<td class="c muted">' + esc(f.vat) + '</td>' +
      '<td class="mono">' + esc(f.wystawiona) + '</td>' +
      '<td class="mono">' + esc(f.termin) + '</td>' +
      '<td>' + tagFakt(f.status) + '</td>' +
      '<td class="num">' + f.projekty + '</td>' +
      '<td class="right"><button class="btn xs" data-pdf="' + esc(f.nr) + '">Podgląd PDF</button></td></tr>';
  }).join("");

  document.querySelectorAll("#tabFakt button[data-pdf]").forEach(function (b) {
    b.addEventListener("click", function () {
      alert("Podgląd PDF faktury " + b.dataset.pdf + ".\n\n" +
            "Plik pobierany z systemu księgowego przy imporcie CSV.\n" +
            "Główny przypadek użycia: sprawdzenie terminu płatności bez logowania do księgowości.");
    });
  });
  renderKpiFaktur();
}

function renderKpiFaktur() {
  var rok = DB.FAKTURY.filter(function (f) { return (f.wystawiona || "").slice(0, 4) === STAN_08.rok; });
  var wg = function (st) { return rok.filter(function (f) { return f.status === st; }); };
  var kw = function (a) { return a.reduce(function (s, f) { return s + f.kwota; }, 0); };
  var opl = wg("Opłacona"), ocz = wg("Oczekuje"), pt = wg("Po terminie");

  document.getElementById("kpiFakt").innerHTML =
    kartaKpi('Wystawione w ' + STAN_08.rok + znakPodpowiedzi("Wszystkie faktury zaimportowane z systemu księgowego w bieżącym roku, wraz z łączną kwotą (korekty pomniejszają sumę)."),
        DB.fmtNum(rok.length), "na kwotę " + DB.fmtPLN(kw(rok)), true) +
    kartaKpi('Opłacone' + znakPodpowiedzi("Faktury ze statusem Opłacona zaczytanym z systemu księgowego, z udziałem w całości wolumenu."),
        DB.fmtNum(opl.length),
        DB.fmtPLN(kw(opl)) + " &middot; " + (rok.length ? Math.round(opl.length / rok.length * 100) : 0) + "% wolumenu", true) +
    kartaKpi('Oczekujące' + znakPodpowiedzi("Faktury czekające na płatność, przed upływem terminu."),
        DB.fmtNum(ocz.length), "na kwotę " + DB.fmtPLN(kw(ocz)), true) +
    kartaKpi('Po terminie' + znakPodpowiedzi("Faktury z przekroczonym terminem płatności. Główny powód sprawdzania terminów w tym module."),
        DB.fmtNum(pt.length), '<span class="tag neg dot">' + DB.fmtPLN(kw(pt)) + '</span>', true);
}

function pokazImportCsv() {
  alert("Import CSV z systemu księgowego.\n\n" +
        "Mapowanie kolumn: numer, kontrahent, kwota, stawka VAT, data wystawienia, " +
        "termin płatności, status płatności.\nDopasowanie kontrahenta do instytucji po NIP.\n\n" +
        "Uwaga: dostępność eksportu CSV w systemie eSzokBR nie została potwierdzona.");
}

function podlaczFaktury() {
  STAN_08.selFIS.innerHTML += DB.INSTYTUCJE.map(function (i) {
    return '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + '</option>';
  }).join("");
  document.getElementById("btnCsv").addEventListener("click", pokazImportCsv);
  ["qF", "fFIS", "fFSt"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderFaktury);
    document.getElementById(id).addEventListener("change", renderFaktury);
  });
}
