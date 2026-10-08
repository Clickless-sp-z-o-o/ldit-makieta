/* Konfigurator instytucji: widok warunkow obowiazujacych, historii i rozliczen wg wersji. Tylko deklaracje. */
function warunkiHtml(p) {
  if (!p) {
    return '<div class="note open mb0">Brak warunków prowizyjnych dla tej instytucji. ' +
      "Prowizja nie jest naliczana, dopóki nie zostanie dodana pierwsza wersja warunków.</div>";
  }
  var progi = p.progi.length
    ? '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl">' +
      "<thead><tr><th>Od kwoty obrotu</th><th class='num'>Stawka</th><th>Zastosowanie</th></tr></thead><tbody>" +
      p.progi.map(function (x, i) {
        var nast = p.progi[i + 1];
        return "<tr><td class='strong'>" + DB.fmtPLN(x.od) + "</td>" +
          "<td class='num strong'>" + DB.fmtPct(x.st) + "</td>" +
          "<td class='muted small'>" + (nast ? "do " + DB.fmtPLN(nast.od) : "powyżej, bez górnej granicy") + "</td></tr>";
      }).join("") + "</tbody></table></div>"
    : '<div class="note mb0" style="margin-top:12px">Brak progów. Stawka jest stała niezależnie od obrotu.</div>';

  return '<dl class="dl">' +
    "<dt>Model</dt><dd><span class='pill k'>" + esc(p.model) + "</span> " + OPIS_MODELU[p.model] + "</dd>" +
    "<dt>Rodzaj kumulacji</dt><dd>" + OPIS_KUMULACJI[p.kumulacja] + "</dd>" +
    "<dt>Sposób liczenia</dt><dd>" + OPIS_SPOSOBU[p.sposob] + "</dd>" +
    "<dt>Stawka stała</dt><dd>" + (p.stala != null ? "<b>" + DB.fmtPct(p.stala) + "</b>" : "<span class='muted'>nie dotyczy, warunki progowe</span>") + "</dd>" +
    "<dt>Liczba progów</dt><dd>" + p.progi.length + "</dd>" +
    "</dl>" + progi;
}

function historiaHtml(wersje, dzis) {
  if (!wersje.length) return '<div class="small muted">Brak wersji warunków.</div>';
  return wersje.slice().reverse().map(function (v) {
    var stan = stanWersji(v, dzis);
    var cls = stan === "aktualna" ? "now" : stan === "archiwalna" ? "done" : "";
    var tag = stan === "aktualna" ? '<span class="tag pos">aktualne</span>'
            : stan === "planowana" ? '<span class="tag info">planowane</span>'
            : '<span class="tag mute">archiwalne</span>';
    var okres = v.do ? "obowiązywało " + esc(DB.fmtDate(v.od)) + " do " + esc(DB.fmtDate(v.do)) : "obowiązuje od " + esc(DB.fmtDate(v.od));
    var usun = stan === "planowana" && STAN_07.mozeEdytowac
      ? '<div class="btn-row" style="margin-top:7px"><button class="btn xs danger" data-usun="' + esc(v.id) + '">Usuń wersję</button></div>' : "";
    return '<div class="tl-item ' + cls + '"><div class="t">' + okres + " " + tag + "</div>" +
      '<div class="m">' + OPIS_KUMULACJI[v.kumulacja] + " kumulacja, " + OPIS_SPOSOBU[v.sposob] +
      "<br>" + trescProgow(v) + "</div>" + usun + "</div>";
  }).join("");
}

/* Rozliczenia wg wersji: ile projektow (pozytywnych, z data faktury) przypada na ktora wersje.
   Prowizja naliczona jest w module Administracja (jedno zrodlo liczb). */
function rozliczeniaHtml(wersje, projekty) {
  var licz = {}, bezWarunkow = { n: 0, podstawa: 0 };
  projekty.forEach(function (w) {
    var v = wersjaNaDzien(wersje, w.dataFaktury);
    var cel = v ? (licz[v.id] = licz[v.id] || { n: 0, podstawa: 0 }) : bezWarunkow;
    cel.n++;
    cel.podstawa += w.podstawaProwizji;
  });
  var dzis = dzisiaj();
  var wiersze = wersje.slice().reverse().map(function (v) {
    var r = licz[v.id] || { n: 0, podstawa: 0 };
    var stan = stanWersji(v, dzis);
    var znacznik = stan === "aktualna" ? "<span class='tag pos'>aktualna</span>"
      : stan === "planowana" ? "<span class='tag info'>planowana</span>" : "<span class='tag mute'>zamknięta</span>";
    return "<tr><td class='strong'>od " + esc(DB.fmtDate(v.od)) + "</td><td>" + (v.do ? esc(DB.fmtDate(v.od)) + " do " + esc(DB.fmtDate(v.do)) : stan === "planowana" ? "od " + esc(DB.fmtDate(v.od)) : esc(DB.fmtDate(v.od)) + " do dziś") + " " + znacznik + "</td>" +
      "<td class='muted'>" + OPIS_SPOSOBU[v.sposob] + "</td>" +
      "<td class='num'>" + r.n + "</td><td class='num'>" + DB.fmtPLN(r.podstawa) + "</td></tr>";
  }).join("");
  if (bezWarunkow.n) {
    wiersze += "<tr class='row-danger'><td class='strong'>brak warunków</td><td class='muted'>data faktury przed pierwszą wersją</td><td></td>" +
      "<td class='num'>" + bezWarunkow.n + "</td><td class='num'>" + DB.fmtPLN(bezWarunkow.podstawa) + "</td></tr>";
  }
  return wiersze || "<tr><td colspan='5'><div class='empty'><div class='et'>Brak wersji warunków</div></div></td></tr>";
}
