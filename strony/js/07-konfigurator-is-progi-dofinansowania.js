/* Konfigurator instytucji: progi dofinansowania KFS i nowa wersja progow. Tylko deklaracje. */
/* ---------- Progi dofinansowania KFS (tabela progi_dofinansowania) ---------- */
function progiDofRender(dzis) {
  var wiersze = DB.PROGI_DOFINANSOWANIA.slice().sort(function (a, b) {
    var k = KOLEJNOSC_WIELKOSCI.indexOf(a.wielkosc) - KOLEJNOSC_WIELKOSCI.indexOf(b.wielkosc);
    return k || (a.obowiazuje_od < b.obowiazuje_od ? -1 : 1);
  });
  document.getElementById("progiInfo").textContent = wiersze.length + " wierszy";
  document.getElementById("progiDof").innerHTML = wiersze.map(function (r) {
    var obowiazuje = r.obowiazuje_od <= dzis && (!r.obowiazuje_do || r.obowiazuje_do >= dzis);
    return "<tr class='" + (obowiazuje ? "row-hl" : "") + "'><td class='strong'>" + esc(r.wielkosc.charAt(0).toUpperCase() + r.wielkosc.slice(1)) +
      (r.wielkosc === "mikro" ? " <span class='muted small'>(do 9 osób na umowie o pracę)</span>" : "") + "</td>" +
      "<td class='num'>" + DB.fmtPct(r.procent_dofinansowania) + "</td>" +
      "<td class='num'>" + DB.fmtPct(100 - r.procent_dofinansowania) + "</td>" +
      "<td class='mono'>" + esc(DB.fmtDate(r.obowiazuje_od)) + "</td>" +
      "<td class='mono'>" + (r.obowiazuje_do ? esc(DB.fmtDate(r.obowiazuje_do)) : "<span class='tag pos'>obowiązuje</span>") + "</td></tr>";
  }).join("");

  var forma = document.getElementById("formProgi");
  if (!STAN_07.mozeEdytowac) { forma.style.display = "none"; return; }
  var rok = parseInt(dzis.slice(0, 4), 10) + 1;
  document.getElementById("polaProgi").innerHTML = KOLEJNOSC_WIELKOSCI.map(function (w) {
    var akt = wiersze.filter(function (r) { return r.wielkosc === w && r.obowiazuje_od <= dzis; }).pop();
    return '<label class="small muted">' + esc(w) + ' %</label>' +
      '<input class="inp num" data-wielkosc="' + esc(w) + '" style="width:70px" value="' + (akt ? akt.procent_dofinansowania : "") + '">';
  }).join("") +
    '<label class="small muted" for="pdOd">obowiązuje od</label>' +
    '<input class="inp" type="date" id="pdOd" style="width:150px" min="' + dzis + '" value="' + rok + '-01-01">' +
    '<button class="btn primary" id="pdZapisz">Dodaj wersję progów</button>';
}

function dodajWersjeProgow() {
  var od = document.getElementById("pdOd").value;
  var dzis = dzisiaj();
  var nowe = {};
  var zle = false;
  document.querySelectorAll("#polaProgi input[data-wielkosc]").forEach(function (inp) {
    var v = parseFloat(inp.value);
    if (isNaN(v) || v < 0 || v > 100) zle = true;
    nowe[inp.dataset.wielkosc] = v;
  });
  var wiersze = DB.PROGI_DOFINANSOWANIA;
  var najnowszy = wiersze.reduce(function (m, r) { return r.obowiazuje_od > m ? r.obowiazuje_od : m; }, "");
  var powod = zle ? "Każdy procent musi być liczbą od 0 do 100."
    : (!od || od < dzis) ? "Nowe progi obowiązują od dziś albo od daty przyszłej, nigdy wstecz."
    : od <= najnowszy ? "Data musi być późniejsza niż początek najnowszej wersji progów (" + DB.fmtDate(najnowszy) + ")." : "";
  document.getElementById("bladProgi").textContent = powod;
  if (powod) return;

  KOLEJNOSC_WIELKOSCI.forEach(function (w) {
    wiersze.filter(function (r) { return r.wielkosc === w && (!r.obowiazuje_do || r.obowiazuje_do >= od); })
      .forEach(function (r) { Store.update("progi_dofinansowania", r.id, { obowiazuje_do: dzienPrzed(od) }); });
    Store.insert("progi_dofinansowania", { wielkosc: w, procent_dofinansowania: nowe[w],
      obowiazuje_od: od, obowiazuje_do: null }, "PD-");
  });
  logZmiana("Progi dofinansowania", "Nowa wersja od " + DB.fmtDate(od), "poprzednie progi",
    KOLEJNOSC_WIELKOSCI.map(function (w) { return w + " " + nowe[w] + "%"; }).join(", "));
  render07();
}
