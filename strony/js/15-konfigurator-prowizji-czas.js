/* Konfigurator prowizji: korekty i zmiana warunkow w czasie (D-161, D-162). Tylko deklaracje. */
var czasFaktury = [];
var DATA_POCZATKU_WARUNKOW = "1900-01-01";

function dzienPrzed(data) {
  var d = new Date(data + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function wersjeCzasu() {
  var b = warunki();
  var pierwsza = { id: "W1", od: DATA_POCZATKU_WARUNKOW, do: null, kumulacja: b.kumulacja,
                   sposob: b.sposob, stala: b.stala, progi: b.progi };
  var klucz = document.getElementById("nowyPreset").value;
  var od = document.getElementById("nowaOd").value;
  if (!klucz || !od) return [pierwsza];
  var p = PRESETY[klucz];
  pierwsza.do = dzienPrzed(od);
  return [pierwsza, { id: "W2", od: od, do: null, kumulacja: p.kumulacja, sposob: p.sposob,
                      stala: p.stala, progi: p.progi }];
}

function renderCzasFaktury() {
  document.getElementById("czasFaktury").innerHTML = czasFaktury.map(function (f, i) {
    var opcje = '<option value="">-</option>' + czasFaktury.slice(0, i).filter(function (x) { return !x.korygowana; })
      .map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === f.korygowana ? " selected" : "") + ">" + esc(x.id) + "</option>";
      }).join("");
    return '<tr><td class="strong">' + esc(f.id) + '</td>' +
      '<td><input class="inp" type="date" value="' + esc(f.data) + '" onchange="czasFaktury[' + i + '].data=this.value;przeliczCzas()"></td>' +
      '<td class="num"><input class="inp num" style="width:110px" value="' + esc(f.kwota) + '" onchange="czasFaktury[' + i + '].kwota=parseFloat(this.value)||0;przeliczCzas()"></td>' +
      '<td>' + (f.korekta ? '<select class="inp" style="width:auto" onchange="czasFaktury[' + i + '].korygowana=this.value;przeliczCzas()">' + opcje + '</select>' : '<span class="muted">zwykła</span>') + '</td>' +
      '<td class="right"><button class="btn xs danger" onclick="czasFaktury.splice(' + i + ',1);renderCzasFaktury();przeliczCzas()">&times;</button></td></tr>';
  }).join("");
}

function dodajFakturaCzas(korekta) {
  var nr = czasFaktury.length + 1;
  czasFaktury.push({ id: (korekta ? "K" : "F") + nr, data: "", kwota: korekta ? -10000 : 10000, korekta: korekta, korygowana: "" });
  renderCzasFaktury(); przeliczCzas();
}

function liczCzas() {
  var poprawne = czasFaktury.filter(function (f) { return f.data && (!f.korekta || f.korygowana); });
  return Prowizja.rozliczOkresy(wersjeCzasu(), poprawne.map(function (f) {
    return { id: f.id, data: f.data, kwota: f.kwota, korygowana: f.korekta ? f.korygowana : null };
  }));
}

function wierszCzasu(p) {
  return '<tr' + (p.korekta ? ' class="row-danger"' : "") + '><td class="strong">' + esc(p.id) + '</td><td class="mono">' + esc(p.data) + '</td>' +
    '<td class="num">' + DB.fmtPLN2(p.kwota) + '</td>' +
    '<td class="num">' + DB.fmtPct(Math.round(p.stawka * 100) / 100) + '</td>' +
    '<td class="num strong">' + DB.fmtPLN2(p.prowizja) + '</td>' +
    '<td>' + (p.korekta ? '<span class="tag neg">korekta do ' + esc(p.korygowana) + '</span>' : '<span class="tag mute">' + esc(p.wersja) + '</span>') + '</td></tr>';
}

function przeliczCzas() {
  var cel = document.getElementById("czasWynik");
  var wynik;
  try { wynik = liczCzas(); }
  catch (e) {
    if (!(e instanceof Prowizja.ProwizjaError)) throw e;
    cel.innerHTML = '<div class="note warn mb0">' + esc(e.message) + "</div>";
    return;
  }
  if (!wynik.okresy.length) { cel.innerHTML = '<div class="small muted">Dodaj faktury z datami.</div>'; return; }
  cel.innerHTML = wynik.okresy.map(function (o) {
    return '<div class="small" style="margin:10px 0 4px"><b>Okres ' + esc(o.klucz) + '</b>, obrót ' + DB.fmtPLN2(o.obrot) +
      ', prowizja okresu <b>' + DB.fmtPLN2(o.suma) + '</b></div>' +
      '<table class="tbl"><thead><tr><th>Id</th><th>Data</th><th class="num">Kwota</th><th class="num">Stawka</th><th class="num">Prowizja</th><th>Wersja</th></tr></thead><tbody>' +
      o.pozycje.map(wierszCzasu).join("") + '</tbody></table>';
  }).join("") + '<div class="small" style="margin-top:10px"><b>Razem: ' + DB.fmtPLN2(wynik.suma) + '</b></div>';
}

function ustawWarunkiPreset(klucz) {
  document.getElementById("preset").value = klucz;
  document.getElementById("preset").dispatchEvent(new Event("change"));
}

function scenariuszKorekty() {
  ustawWarunkiPreset("A");
  document.getElementById("nowyPreset").value = "";
  czasFaktury = [
    { id: "F1", data: "2026-01-10", kwota: 26000, korekta: false, korygowana: "" },
    { id: "F2", data: "2026-01-20", kwota: 25000, korekta: false, korygowana: "" },
    { id: "K3", data: "2026-02-12", kwota: -10000, korekta: true, korygowana: "F1" }
  ];
  document.getElementById("czasOczekiwane").innerHTML =
    "Oczekiwane: styczeń 6 120,00 zł (obrót 51 000 zł, obie faktury po 12%), luty -1 200,00 zł (korekta po 12% faktury F1, obrót lutego bez zmian), razem 4 920,00 zł.";
  renderCzasFaktury(); przeliczCzas();
}

function scenariuszZmianyWarunkow() {
  ustawWarunkiPreset("A");
  document.getElementById("nowyPreset").value = "D";
  document.getElementById("nowaOd").value = "2027-01-01";
  czasFaktury = [
    { id: "F1", data: "2026-12-10", kwota: 26000, korekta: false, korygowana: "" },
    { id: "F2", data: "2026-12-20", kwota: 25000, korekta: false, korygowana: "" },
    { id: "F3", data: "2027-01-15", kwota: 51000, korekta: false, korygowana: "" }
  ];
  document.getElementById("czasOczekiwane").innerHTML =
    "Oczekiwane: grudzień 6 120,00 zł (model A, bez przeliczania po zmianie), styczeń 2027 10 200,00 zł (od 2027-01-01 model D, 20%).";
  renderCzasFaktury(); przeliczCzas();
}
