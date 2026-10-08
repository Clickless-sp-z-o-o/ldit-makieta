/* Ekran Instytucje: lista katalogu szkolen i dodawanie planu. Szczegolowa edycja planu
   i pliki sa na karcie planu (06-instytucje-plan.js). Tylko deklaracje. */
/* ---------- Szczegol: katalog szkolen ---------- */
function tagTryb(t) {
  return "<span class='tag " + (t === "Online" ? "info" : t === "Stacjonarne" ? "mute" : "warn") + "'>" + esc(t) + "</span>";
}
function liczbaPlikow(idSzkolenia) {
  return Store.one("SELECT COUNT(*) AS n FROM pliki WHERE szkolenie_id = ?", [idSzkolenia]).n;
}
function przyciskiPlanu(s) {
  var usun = moznaEdytowac() ? '<button class="btn xs" title="Usuń plan" onclick="usunPlan(\'' + escJs(s.id) + '\')">&times;</button>' : "";
  return '<div class="btn-row" style="justify-content:flex-end">' +
    '<button class="btn xs" onclick="otworzKartePlanu(\'' + escJs(s.id) + '\')">&#9998; Karta planu</button>' + usun + '</div>';
}
function wierszPlanu(s, realizacje, plan) {
  var pliki = liczbaPlikow(s.id);
  return "<tr" + (s.id === STAN_06.edytowanyPlan ? ' class="row-nabor"' : "") + ">" +
    '<td class="strong">' + esc(s.nazwa) + '<div class="small muted mono">' + esc(s.id) + "</div>" +
      (plan ? '<div class="small muted tnij w" style="font-weight:400" title="' + esc(plan) + '">' + esc(plan) + "</div>" : "") + "</td>" +
    '<td class="num">' + esc(s.godz) + "</td>" +
    '<td class="num">' + esc(s.dni) + "</td>" +
    "<td>" + tagTryb(s.tryb) + "</td>" +
    '<td class="num strong">' + (s.ceny.length ? s.ceny.map(DB.fmtPLN).join("<br>") : '<span class="muted">brak</span>') + "</td>" +
    '<td class="num">' + realizacje + "</td>" +
    '<td class="c">' + (pliki ? '<span class="tag info">' + pliki + '</span>' : '<span class="muted">0</span>') + "</td>" +
    '<td class="right">' + przyciskiPlanu(s) + "</td></tr>";
}
function renderKatalog(i) {
  var szk = szkoleniaIS(i.id), wnioski = wnioski2026(), plany = {};
  Store.query("SELECT id, plan_szkolenia FROM katalog_szkolen WHERE instytucja_id = ?", [i.id])
    .forEach(function (r) { plany[r.id] = r.plan_szkolenia; });
  el("katSub").textContent = szk.length + " programów instytucji " + i.nazwa + ".";
  el("notkaKatalogIS").style.display = jestInstytucja() ? "" : "none";
  pokazTylkoGdyEdycja("btnDodajPlan");
  el("katalog").innerHTML = szk.length ? szk.map(function (s) {
    var real = wnioski.filter(function (w) { return w.szkId === s.id; }).length;
    return wierszPlanu(s, real, plany[s.id]);
  }).join("") : '<tr><td colspan="8"><div class="empty"><div class="ei">&#9723;</div>' +
    '<div class="et">Brak programów</div>Instytucja nie wprowadziła jeszcze planów szkoleń.</div></td></tr>';
  renderKartaPlanu();
}

function liczba(id) { return parseInt(el(id).value, 10) || 0; }
function opcjeTryb(sel) {
  return ["Online", "Stacjonarne", "Mieszane"].map(function (t) {
    return "<option" + (sel === t ? " selected" : "") + ">" + t + "</option>";
  }).join("");
}

/* ---- Nowy plan: krotki formularz, szczegoly uzupelnia sie na karcie planu ---- */
function pokazPlanForm() {
  var f = el("planForm");
  f.innerHTML =
    '<div class="small strong" style="margin-bottom:8px">Nowy plan szkolenia dla: ' + esc((aktualnaIS() || {}).nazwa) + '</div>' +
    '<div class="toolbar" style="flex-wrap:wrap;gap:8px;padding:0">' +
      '<input class="inp" id="npNazwa" placeholder="Nazwa szkolenia" style="min-width:240px">' +
      '<input class="inp" id="npGodz" type="number" min="1" placeholder="Godziny" style="width:92px" title="Godziny">' +
      '<input class="inp" id="npDni" type="number" min="1" placeholder="Dni" style="width:72px" title="Dni">' +
      '<select class="inp" id="npTryb">' + opcjeTryb("Online") + '</select>' +
      '<input class="inp" id="npCena" placeholder="Ceny: 4500; 5200" style="width:140px" title="Cennik szkolenia: ceny do wyboru we wniosku, rozdzielone średnikiem (D-277)">' +
      '<button class="btn primary sm" onclick="zapiszNowyPlan()">Zapisz i otwórz kartę planu</button>' +
      '<button class="btn sm" onclick="ukryjPlanForm()">Anuluj</button>' +
    '</div>';
  f.style.display = "block";
}
function ukryjPlanForm() { var f = el("planForm"); f.style.display = "none"; f.innerHTML = ""; }
function zapiszNowyPlan() {
  var nazwa = el("npNazwa").value.trim();
  if (!nazwa) { el("npNazwa").focus(); return; }
  var nowy = Store.insert("katalog_szkolen", {
    instytucja_id: STAN_06.wybrana, nazwa: nazwa,
    liczba_godzin: liczba("npGodz"), liczba_dni: liczba("npDni"),
    tryb: el("npTryb").value, zaktualizowano: new Date().toISOString().slice(0, 10)
  }, "SZ-");
  zapiszCennik06(nowy.id, el("npCena").value);
  ukryjPlanForm();
  otworzKartePlanu(nowy.id);
}
function liczbaUzyc(id) {
  return Store.one("SELECT COUNT(*) AS n FROM wniosek_szkolenia WHERE szkolenie_id = ?", [id]).n +
    Store.one("SELECT COUNT(*) AS n FROM terminy WHERE szkolenie_id = ?", [id]).n +
    Store.one("SELECT COUNT(*) AS n FROM wnioski WHERE szkolenie_glowne_id = ?", [id]).n;
}
function usunPlan(id) {
  var uzycia = liczbaUzyc(id);
  if (uzycia > 0) {
    window.alert("Nie można usunąć planu " + id + ": jest użyty we wnioskach, terminach lub u uczestników (" + uzycia + " powiązań).");
    return;
  }
  if (window.confirm("Usunąć plan szkolenia " + id + " z katalogu razem z jego plikami?")) Store.remove("katalog_szkolen", id);
}
