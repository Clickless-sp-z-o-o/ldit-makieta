/* Ekran Instytucje: karta planu szkolenia (D-225). Szczegolowa edycja planu (cel, grupa
   docelowa, program, efekty, wymagania, forma zaliczenia) i pliki planu: program,
   harmonogram, materialy. Plik w makiecie lezy w bazie jako base64 (wspolna tabela pliki, D-278),
   dlatego jest limit rozmiaru; w aplikacji docelowej trafi do magazynu plikow.
   Tylko deklaracje. */

var MAX_ROZMIAR_PLIKU = 1024 * 1024;   /* 1 MB: baza makiety w przegladarce ma ok. 5 MB miejsca */
var RODZAJE_PLIKOW = { program: "Program szkolenia", harmonogram: "Harmonogram", materialy: "Materiały", inny: "Inny" };
var POLA_PLANU = [
  ["cel_szkolenia", "Cel szkolenia"], ["grupa_docelowa", "Grupa docelowa"],
  ["plan_szkolenia", "Program szkolenia (moduły, tematy)"], ["efekty_uczenia", "Efekty uczenia się"],
  ["wymagania", "Wymagania wstępne"], ["forma_zaliczenia", "Forma zaliczenia i certyfikat"]
];

/* Karta planu to osobny widok ekranu (uwagi z 08.10.2026), nie blok pod lista programow */
function otworzKartePlanu(id) {
  STAN_06.edytowanyPlan = id;
  pokazWidok06("plan");
  renderSzczegol();
  zapiszStan06();
}
function zamknijKartePlanu() {
  STAN_06.edytowanyPlan = null;
  STAN_06.zakladka = "p-katalog";
  pokazWidok06("konfig");
  renderSzczegol();
  aktywujTab(STAN_06.zakladka);
  zapiszStan06();
}

function poleTekstPlanu(k, etykieta, wartosc, edycja) {
  return '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">' + etykieta + '</span>' +
    '<textarea class="inp" id="kp_' + k + '" rows="' + (k === "plan_szkolenia" ? 6 : 2) + '"' + (edycja ? "" : " readonly") + '>' +
    esc(wartosc) + '</textarea></label>';
}

function formularzPlanu(s, edycja) {
  var ro = edycja ? "" : " readonly";
  return '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Nazwa</span><input class="inp" id="kp_nazwa" value="' + esc(s.nazwa) + '"' + ro + '></label>' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Godziny</span><input class="inp" id="kp_godz" type="number" min="1" value="' + esc(s.liczba_godzin) + '"' + ro + '></label>' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Dni</span><input class="inp" id="kp_dni" type="number" min="1" value="' + esc(s.liczba_dni) + '"' + ro + '></label>' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Tryb</span><select class="inp" id="kp_tryb"' + (edycja ? "" : " disabled") + '>' + opcjeTryb(s.tryb) + '</select></label>' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Cennik (ceny po średniku)</span><input class="inp" id="kp_ceny" value="' + esc(tekstCennika06(s.id)) + '"' + ro + '></label>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      POLA_PLANU.map(function (p) { return poleTekstPlanu(p[0], p[1], s[p[0]], edycja); }).join("") +
    '</div>';
}

function wierszPliku(p, edycja) {
  return '<tr><td class="strong">' + esc(p.nazwa) + '</td><td>' + esc(RODZAJE_PLIKOW[p.rodzaj] || p.rodzaj) + '</td>' +
    '<td class="num small">' + Math.max(1, Math.round(p.rozmiar / 1024)) + ' KB</td><td class="small nowrap">' + esc(DB.fmtDate(p.dodano)) + '</td>' +
    '<td class="right"><div class="btn-row" style="justify-content:flex-end">' +
      '<button class="btn xs" onclick="pobierzPlik(\'' + escJs(p.id) + '\')">Pobierz</button>' +
      (edycja ? '<button class="btn xs" title="Usuń plik" onclick="usunPlik(\'' + escJs(p.id) + '\')">&times;</button>' : "") +
    '</div></td></tr>';
}

function sekcjaPlikow(s, edycja) {
  var pliki = Store.query("SELECT id, nazwa, rodzaj, rozmiar, dodano FROM pliki WHERE szkolenie_id = ? ORDER BY dodano", [s.id]);
  var wgrywanie = edycja
    ? '<div class="toolbar" style="padding:8px 0;gap:8px"><select class="inp" id="kpRodzaj">' +
        Object.keys(RODZAJE_PLIKOW).map(function (k) { return '<option value="' + k + '">' + RODZAJE_PLIKOW[k] + '</option>'; }).join("") +
      '</select><input type="file" id="kpPlik" multiple>' +
      '<span class="small muted">do ' + Math.round(MAX_ROZMIAR_PLIKU / 1024) + ' KB na plik (PDF, DOCX, XLSX, obrazy)</span></div>'
    : "";
  return '<div class="small strong" style="margin:14px 0 4px">Pliki planu</div>' + wgrywanie +
    '<div class="small" id="kpKomunikat" role="status"></div>' +
    '<table class="tbl"><thead><tr><th>Plik</th><th>Rodzaj</th><th class="num">Rozmiar</th><th>Dodano</th><th></th></tr></thead><tbody>' +
    (pliki.length ? pliki.map(function (p) { return wierszPliku(p, edycja); }).join("")
      : '<tr><td colspan="5" class="small muted">Brak plików. Wgraj program, harmonogram albo materiały.</td></tr>') +
    '</tbody></table>';
}

function renderKartaPlanu() {
  var karta = el("planKarta");
  var s = STAN_06.edytowanyPlan ? Store.find("katalog_szkolen", STAN_06.edytowanyPlan) : null;
  if (!s || s.instytucja_id !== STAN_06.wybrana) { karta.style.display = "none"; karta.innerHTML = ""; return; }
  var edycja = moznaEdytowac();
  el("powrotPlanu").innerHTML = "&larr; Programy: " + esc((aktualnaIS() || {}).nazwa || "");
  karta.style.display = "";
  karta.innerHTML = '<div class="card-head"><h3>Karta planu: ' + esc(s.nazwa) + '</h3><span class="sub mono">' + esc(s.id) +
      (s.zaktualizowano ? " · zmieniono " + esc(DB.fmtDate(s.zaktualizowano)) : "") + '</span>' +
      '<div class="ch-actions">' + (edycja ? '<button class="btn sm" onclick="kopiujProgram(\'' + escJs(s.id) + '\')">Kopiuj program</button>' : '') +
        '</div></div>' +
    '<div class="card-body">' + formularzPlanu(s, edycja) +
      (edycja ? '<div class="btn-row" style="margin-top:10px"><button class="btn primary sm" onclick="zapiszKartePlanu()">Zapisz plan</button></div>' : "") +
      sekcjaPlikow(s, edycja) + '</div>';
  if (edycja) el("kpPlik").addEventListener("change", wgrajPliki);
}

function zapiszKartePlanu() {
  var patch = { nazwa: el("kp_nazwa").value.trim() || "(bez nazwy)", liczba_godzin: liczba("kp_godz"), liczba_dni: liczba("kp_dni"),
                tryb: el("kp_tryb").value, zaktualizowano: new Date().toISOString().slice(0, 10) };
  POLA_PLANU.forEach(function (p) { patch[p[0]] = el("kp_" + p[0]).value.trim() || null; });
  var cennik = zapiszCennik06(STAN_06.edytowanyPlan, el("kp_ceny").value);
  if (!cennik.ok) { komunikatPliku(cennik.blad, true); return; }
  Store.update("katalog_szkolen", STAN_06.edytowanyPlan, patch);
}

function komunikatPliku(tekst, blad) {
  var k = el("kpKomunikat");
  k.textContent = tekst;
  k.style.color = blad ? "var(--neg-ink)" : "var(--pos-ink)";
}

/* Wgrywanie: kazdy plik osobno, za duzy jest pomijany z komunikatem, reszta sie zapisuje */
function wgrajPliki(e) {
  var pliki = Array.prototype.slice.call(e.target.files);
  var rodzaj = el("kpRodzaj").value, idPlanu = STAN_06.edytowanyPlan;
  var zaDuze = pliki.filter(function (f) { return f.size > MAX_ROZMIAR_PLIKU; }).map(function (f) { return f.name; });
  var doZapisu = pliki.filter(function (f) { return f.size <= MAX_ROZMIAR_PLIKU; });
  Promise.all(doZapisu.map(czytajPlik)).then(function (wyniki) {
    wyniki.forEach(function (w) {
      Store.insert("pliki", { szkolenie_id: idPlanu, instytucja_id: Store.find("katalog_szkolen", idPlanu).instytucja_id, nazwa: w.nazwa, typ: w.typ, rozmiar: w.rozmiar, rodzaj: rodzaj,
                                      dodano: new Date().toISOString().slice(0, 10), dodal_id: Auth.sesja().uzytkownik_id, tresc: w.tresc }, "PL-");
    });
    komunikatPliku((wyniki.length ? "Wgrano: " + wyniki.length + ". " : "") +
      (zaDuze.length ? "Pominięto, za duże: " + zaDuze.join(", ") : ""), zaDuze.length > 0);
  });
}

function czytajPlik(plik) {
  return new Promise(function (ok, blad) {
    var r = new FileReader();
    r.onload = function () { ok({ nazwa: plik.name, typ: plik.type, rozmiar: plik.size, tresc: String(r.result).split(",")[1] || "" }); };
    r.onerror = function () { blad(r.error); };
    r.readAsDataURL(plik);
  });
}

function pobierzPlik(id) {
  var p = Store.find("pliki", id);
  var bajty = Uint8Array.from(atob(p.tresc), function (c) { return c.charCodeAt(0); });
  var url = URL.createObjectURL(new Blob([bajty], { type: p.typ || "application/octet-stream" }));
  var a = document.createElement("a");
  a.href = url; a.download = p.nazwa;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function usunPlik(id) {
  var p = Store.find("pliki", id);
  if (window.confirm("Usunąć plik " + p.nazwa + " z planu?")) Store.remove("pliki", id);
}
