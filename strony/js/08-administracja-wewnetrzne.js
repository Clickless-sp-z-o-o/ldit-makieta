/* Administracja 08: zakladka Prowizje wewnetrzne. Jedna wersja: warunki prowizji pracownikow
   (procent od obrotu na wnioskach od minimalnego obrotu, widok v_prowizje_pracownikow).
   Tylko deklaracje. */
function widokWewnetrzne() {
  document.getElementById("t-wewnetrzne").innerHTML = `

    <div class="card">
      <div class="card-head">
        <h3>Model kaskadowy</h3>
        <span class="sub">koszt szkolenia, prowizja LDIT, prowizja pracowników</span>
      </div>
      <div class="card-body">
        <div class="funnel" id="kaskada"></div>
        <div class="sep"></div>
        <dl class="dl mb0">
          <dt>Poziom 1, koszt szkolenia</dt>
          <dd>Koszt całkowity z dopłatą, czyli podstawa naliczenia prowizji LDIT od instytucji</dd>
          <dt>Poziom 2, prowizja LDIT</dt>
          <dd>Prowizja od instytucji wyliczona silnikiem progowym, czyli przychód firmy</dd>
          <dt>Poziom 3, prowizja pracownika</dt>
          <dd>Procent od obrotu na wnioskach pracownika, według warunków poniżej</dd>
        </dl>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Warunki prowizji pracowników</h3>
        <span class="sub">procent od obrotu na wnioskach, od minimalnego obrotu</span>
        <div class="ch-actions"><button class="btn sm atrapa" data-tip="W aplikacji docelowej">Dodaj warunek</button></div>
      </div>
      <div class="card-body tight">
        <table class="tbl">
          <thead>
            <tr><th>Pracownik</th><th class="num">Procent</th><th class="num">Minimum obrotu</th><th class="num">Osiągnięty obrót</th><th>Postęp</th><th class="num">Prowizja</th><th>Status</th></tr>
          </thead>
          <tbody id="tabCele"></tbody>
        </table>
      </div>
      <div class="card-body" style="border-top:1px solid var(--line)">
        <div class="small muted">
          Obrót to koszt z dopłatą wniosków z decyzją pozytywną, które pracownik przygotował w okresie warunku.
        </div>
      </div>
    </div>
`;
}

function fnRow(label, pct, val) {
  return '<div class="fn-row"><div class="fl">' + label + '</div>' +
    '<div class="ft"><i style="width:' + pct + '%"></i></div>' +
    '<div class="fv">' + val + '</div></div>';
}

/* Suma prowizji pracownikow z tych samych warunkow, ktore pokazuje tabela ponizej */
function prowizjaPracownikow() {
  return DB.WARUNKI_PRACOWNIKOW.reduce(function (s, c) { return s + (c.prowizja || 0); }, 0);
}

function renderKaskada() {
  var s = podsumujPozycje([].concat.apply([], DB.INSTYTUCJE.map(function (i) { return pozycjeIS(i.id, ""); })));
  var prac = prowizjaPracownikow();
  document.getElementById("kaskada").innerHTML =
    fnRow("Koszt szkoleń z dopłatą", 100, DB.fmtPLN(s.obrot)) +
    fnRow("Prowizja LDIT, przychód firmy", s.obrot ? Math.max(6, Math.round(s.prow / s.obrot * 100)) : 0, DB.fmtPLN(s.prow)) +
    fnRow("Prowizja pracowników", s.obrot ? Math.max(prac ? 2 : 0, Math.round(prac / s.obrot * 100)) : 0, DB.fmtPLN(prac));
}

/* Warunki prowizji pracownikow: postep do minimalnego obrotu i prowizja z widoku */
function renderCele() {
  document.getElementById("tabCele").innerHTML = DB.WARUNKI_PRACOWNIKOW.map(function (c) {
    var pct = c.minimum_obrotu ? Math.min(100, Math.round(c.osiagniety_obrot / c.minimum_obrotu * 100)) : 100;
    var ok = c.osiagniety === 1;
    return '<tr>' +
      '<td class="strong">' + esc(c.imie_nazwisko) + '<div class="small muted">od ' + esc(DB.fmtDate(c.obowiazuje_od)) + '</div></td>' +
      '<td class="num">' + esc(String(c.procent_prowizji).replace(".", ",")) + '%</td>' +
      '<td class="num">' + DB.fmtPLN(c.minimum_obrotu || 0) + '</td>' +
      '<td class="num">' + DB.fmtPLN(c.osiagniety_obrot) + '<div class="small muted">' + c.wnioskow + ' wniosków</div></td>' +
      '<td style="min-width:150px"><div class="progress' + (ok ? " pos" : "") + '"><i style="width:' + pct + '%"></i></div></td>' +
      '<td class="num strong">' + DB.fmtPLN(c.prowizja) + '</td>' +
      '<td><span class="tag ' + (ok ? "pos" : "info") + ' dot">' + (ok ? "osiągnięty" : "w trakcie") + '</span></td></tr>';
  }).join("");
}
