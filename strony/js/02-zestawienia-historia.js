/* Ekran 02, czesc 11: panel Historia nad tabela (spotkanie 14.10.2026). Pokazuje przebieg wniosku
   z HistoriaWniosku.pozycje (02-zestawienia-historia-dane.js): co i kiedy sie dzialo, od najstarszego.
   Przycisk Historia jest w pierwszej kolumnie obok Szczegolow. Panel ma fokus po otwarciu,
   Zamknij i Escape oddaja fokus przyciskowi Historia. Same deklaracje. */

var ETYKIETY_HISTORII_02 = {
  wniosek: ["Wniosek", "mute"], status: ["Status", "info"], etap: ["Etap", "info"], wpis: ["Wpis", "pos"],
  zadanie: ["Zadanie", "warn"], mail: ["Mail", "mute"]
};
var HISTORIA_02 = { otwartyId: "" };

function dzisIso02() { return terazStr().slice(0, 10); }

function pozycjaHistorii02(p) {
  var e = ETYKIETY_HISTORII_02[p.rodzaj] || ["Zdarzenie", "mute"];
  var meta = [p.opis, p.kto ? "kto: " + p.kto : ""].filter(Boolean).join(" · ");
  return '<li class="tl-item' + (p.zaplanowane ? " hist-plan" : " done") + '">' +
    '<div class="t"><span class="hist-czas">' + esc(DB.fmtDate(p.czas)) + '</span>' +
    '<span class="tag ' + e[1] + '">' + esc(p.zaplanowane ? e[0] + ", zaplanowane" : e[0]) + '</span>' + esc(p.tytul) + '</div>' +
    (meta ? '<div class="m">' + esc(meta) + '</div>' : '') + '</li>';
}

function trescHistorii02(w) {
  var pozycje = HistoriaWniosku.pozycje(w, dzisIso02());
  var naglowek = '<div class="hist-naglowek"><h2 class="hist-tytul" id="histTytul" tabindex="-1">Historia wniosku ' + esc(w.nr) +
    ' · ' + esc(w.klNazwa) + '</h2><span class="small muted">przebieg wniosku od najstarszego zdarzenia</span>' +
    '<span class="sp"></span><a class="btn xs" href="' + esc(adresKarty02(w.id)) + '">Przebieg na karcie wniosku</a>' +
    '<button type="button" class="btn xs" id="btnZamknijHist">Zamknij</button></div>';
  if (!pozycje.length) {
    return naglowek + '<div class="muted small">Brak zapisanych zdarzeń. Przebieg uzupełnia się przy zmianie statusu, ' +
      'wpisach i zadaniach z terminem na karcie wniosku.</div>';
  }
  return naglowek + '<ol class="timeline hist-lista">' + pozycje.map(pozycjaHistorii02).join("") + '</ol>';
}

function zamknijHistorie02(przywrocFokus) {
  var panel = document.getElementById("histPanel");
  panel.style.display = "none";
  var id = HISTORIA_02.otwartyId;
  HISTORIA_02.otwartyId = "";
  var przycisk = id ? document.querySelector('#body [data-historia="' + id + '"]') : null;
  if (przycisk) {
    przycisk.setAttribute("aria-expanded", "false");
    if (przywrocFokus) przycisk.focus();
  }
}

function pokazHistorie(id) {
  var w = znajdzWniosek(id);
  if (!w) return;
  var panel = document.getElementById("histPanel");
  panel.innerHTML = trescHistorii02(w);
  panel.style.display = "block";
  panel.scrollTop = 0;
  HISTORIA_02.otwartyId = id;
  Array.prototype.forEach.call(document.querySelectorAll("#body [data-historia]"), function (b) {
    b.setAttribute("aria-expanded", String(b.getAttribute("data-historia") === id));
  });
  document.getElementById("btnZamknijHist").addEventListener("click", function () { zamknijHistorie02(true); });
  document.getElementById("histTytul").focus();
}

function podlaczHistorie02() {
  document.getElementById("body").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-historia]");
    if (!btn) return;
    if (HISTORIA_02.otwartyId === btn.dataset.historia) zamknijHistorie02(true);
    else pokazHistorie(btn.dataset.historia);
  });
  document.getElementById("histPanel").addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); zamknijHistorie02(true); }
  });
}
