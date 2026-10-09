/* Zgloszenia: render KPI, listy i podmiotow powracajacych (tylko deklaracje) */
/* ---------- KPI ---------- */
function renderKpi() {
  var wys = STAN_10.lokalne.filter(function (z) { return z.waga === "wysoka"; }).length;
  var ins = STAN_10.lokalne.filter(function (z) { return z.typ === "Instytucja"; }).length;
  var kli = STAN_10.lokalne.filter(function (z) { return z.typ === "Klient"; }).length;
  var kpi = [
    ["Zgłoszenia otwarte", STAN_10.lokalne.length, "cały bieżący rejestr, wpisów się nie zamyka"],
    ["O wysokiej wadze", wys, "kandydaci do zerwania współpracy"],
    ["Dotyczące instytucji", ins, "z " + DB.INSTYTUCJE.length + " instytucji w katalogu"],
    ["Dotyczące klientów", kli, "z " + DB.fmtNum(DB.KLIENCI.length) + " klientów w bazie"]
  ];
  document.getElementById("kpi").innerHTML = kpi.map(function (k, i) {
    return '<div class="kpi"><div class="k-label">' + k[0] + "</div>" +
      '<div class="k-value"' + (i === 1 ? ' style="color:var(--neg-ink)"' : "") + ">" + k[1] + "</div>" +
      '<div class="k-foot">' + k[2] + "</div></div>";
  }).join("");

  document.getElementById("nWsz").textContent = STAN_10.lokalne.length;
  document.getElementById("nInst").textContent = ins;
  document.getElementById("nKl").textContent = kli;

  var maks = Math.max(1, STAN_10.lokalne.length);
  document.getElementById("wagi").innerHTML = ["wysoka", "średnia", "niska"].map(function (w) {
    var n = STAN_10.lokalne.filter(function (z) { return z.waga === w; }).length;
    return '<div class="fn-row"><div class="fl">' + w + "</div>" +
      '<div class="ft"><i style="width:' + Math.round(n / maks * 100) + '%"></i></div>' +
      '<div class="fv">' + n + "</div></div>";
  }).join("");
}

function histHtml(z) {
  var poprz = historia(z.podmiot, z.id);
  var razem = poprz.length + 1;
  var ostrz = razem >= 3
    ? '<span class="tag neg">' + razem + " zgłoszeń, rekomendacja: zakończyć współpracę</span>"
    : razem === 2
      ? '<span class="tag warn">' + razem + " zgłoszenia, to już powtórka</span>"
      : '<span class="tag mute">pierwsze zgłoszenie dla tego podmiotu</span>';

  return '<div class="hist">' +
    '<div class="hl">Historia podmiotu: ' + esc(z.podmiot) + " &middot; " + ostrz + "</div>" +
    (poprz.length
      ? poprz.map(function (p) {
          return '<div class="hr"><span class="hd">' + esc(DB.fmtDate(p.data)) + "</span>" +
            "<span><b>" + esc(p.powod) + "</b> " + wagaTag(p.waga) +
            '<div class="small muted">' + esc(p.opis) + " &middot; zgłosił: " + esc(p.autor) +
            (p.id.indexOf("ZG-A") === 0 ? ' &middot; <span class="pill">przykład: archiwum 2025</span>' : "") +
            "</div></span></div>";
        }).join("")
      : '<div class="small muted">Brak wcześniejszych wpisów w rejestrze ani w archiwum z 2025.</div>') +
    "</div>";
}

/* Karta podmiotu: instytucja otwiera swoja karte w Instytucjach, klient swoja karte klienta.
   Podmiotu spoza bazy (albo spoza zakresu konta) nie da sie otworzyc. */
function adresPodmiotu(z) {
  var zNazwa = function (x) { return x.nazwa === z.podmiot; };
  if (z.typ === "Instytucja") {
    var inst = DB.INSTYTUCJE.filter(zNazwa)[0];
    return inst ? "06-instytucje.html" + Nawigacja.zbudujZapytanie({ id: inst.id }) : null;
  }
  var klient = DB.KLIENCI.filter(zNazwa)[0];
  return klient ? Nawigacja.adresKlienta(klient.id) : null;
}

function przyciskPodmiotu(z) {
  var adres = adresPodmiotu(z);
  return adres
    ? '<a class="btn sm" href="' + esc(adres) + '">Otwórz kartę podmiotu</a>'
    : '<button class="btn sm" disabled data-tip="Podmiotu nie ma w bazie systemu albo jest poza zakresem konta.">Otwórz kartę podmiotu</button>';
}

/* ---------- Lista ---------- */
/* Zgloszenia biezacego widoku (typ, waga, wyszukiwanie): wspolne dla listy i eksportu */
function widoczneZgloszenia10() {
  var q = document.getElementById("szukaj").value.toLowerCase().trim();
  var waga = Wielowybor.wartosci(document.getElementById("fWaga"));
  return STAN_10.lokalne.filter(function (z) {
    if (STAN_10.filtrTyp && z.typ !== STAN_10.filtrTyp) return false;
    if (!Wielowybor.pasuje(waga, z.waga)) return false;
    if (q && (z.podmiot + " " + z.powod + " " + z.opis + " " + z.autor).toLowerCase().indexOf(q) === -1) return false;
    return true;
  }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
}

function renderLista() {
  var lista = widoczneZgloszenia10();

  var nowe = noweZgloszenia10();
  odswiezPrzyciskWszystkich10(nowe);
  document.getElementById("podsumFiltru").textContent =
    "widocznych " + lista.length + " z " + STAN_10.lokalne.length + " zgłoszeń";

  if (!lista.length) {
    document.getElementById("lista").innerHTML =
      '<div class="card"><div class="empty"><div class="ei">&#9888;</div>' +
      '<div class="et">Brak zgłoszeń spełniających filtry</div>' +
      "Zmień filtr wagi, typ podmiotu albo wyczyść wyszukiwanie.</div></div>";
    return;
  }

  document.getElementById("lista").innerHTML = lista.map(function (z) {
    return '<div class="card' + (nowe[z.id] ? ' zg-nowe' : "") + '">' +
      '<div class="card-head" style="align-items:flex-start">' +
        '<div class="zg-head" style="flex:1 1 auto">' +
          '<div class="zg-t">' +
            '<h3 class="zg-powod">' + esc(z.powod) + "</h3>" +
            '<div class="small muted"><span class="mono">' + esc(z.id) + "</span> &middot; " +
              esc(DB.fmtDate(z.data)) + " &middot; zgłosił: " + esc(z.autor) + "</div>" +
          "</div>" +
          '<div class="zg-meta">' + znacznikNowego10(nowe, z.id) + typTag(z.typ) + wagaTag(z.waga) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="card-body">' +
        '<div class="small muted">Podmiot</div>' +
        '<div class="strong" style="font-size:14px;margin-bottom:2px">' + esc(z.podmiot) + "</div>" +
        '<p class="zg-opis">' + esc(z.opis) + "</p>" +
        '<div class="mt16">' + histHtml(z) + "</div>" +
        '<div class="btn-row mt16">' +
          przyciskPrzeczytane10(nowe, z.id) +
          '<button class="btn sm">Dopisz do zgłoszenia</button>' +
          przyciskPodmiotu(z) +
          '<button class="btn sm danger atrapa" data-tip="W aplikacji docelowej">Oznacz do zakończenia współpracy</button>' +
        "</div>" +
      "</div></div>";
  }).join("");
}

/* ---------- Podmioty powracające ---------- */
function renderPowracajace() {
  var licz = {};
  STAN_10.lokalne.concat(ARCHIWUM).forEach(function (z) {
    if (!licz[z.podmiot]) licz[z.podmiot] = { n: 0, typ: z.typ };
    licz[z.podmiot].n++;
  });
  var rows = Object.keys(licz).map(function (p) { return { p: p, n: licz[p].n, typ: licz[p].typ }; })
    .filter(function (r) { return r.n > 1; })
    .sort(function (a, b) { return b.n - a.n; });

  document.getElementById("tbPowracajace").innerHTML = rows.length ? rows.map(function (r) {
    return "<tr" + (r.n >= 3 ? ' class="row-danger"' : "") + ">" +
      '<td class="strong">' + esc(r.p) + "</td>" +
      '<td class="small muted">' + esc(r.typ) + "</td>" +
      '<td class="num strong">' + r.n + "</td></tr>";
  }).join("") + '<tr><td colspan="3" class="small muted">Liczone razem z przykładowym archiwum z 2025.</td></tr>'
    : '<tr><td colspan="3" class="small muted">Żaden podmiot nie powtórzył się w rejestrze.</td></tr>';
}
