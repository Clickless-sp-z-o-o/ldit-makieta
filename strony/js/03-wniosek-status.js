/* Ekran Wniosek: status i etap wniosku. Akcja przestawia status skladania, decyzje,
   rozliczenie i etap razem (assets/statusy.js), a zmiana etapu trafia do przebiegu.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

var AKCJE_STATUSU = ["niezlozony", "nw", "zlozony", "pozytywna", "negatywna", "rezygnacja"];
var AKCJE_ROZLICZENIA = ["zafakturowany", "rozliczony"];

/* Akcja odpowiadajaca obecnemu stanowi wniosku jest zaznaczona i nieaktywna */
function akcjaBiezaca(w) {
  if (w.rozliczenie === "Rozliczone") return "rozliczony";
  if (w.rozliczenie === "Zafakturowany") return "zafakturowany";
  return Statusy.akcjaDlaStatusu(Statusy.wartosc(w));
}

function przyciskAkcji(akcja, biezaca) {
  var on = akcja === biezaca;
  return '<button class="btn xs' + (on ? " primary" : "") + '"' + (on ? " disabled" : "") +
    ' onclick="zmienStatusWniosku(\'' + akcja + '\')">' + esc(Statusy.AKCJE[akcja].etykieta) + '</button>';
}

function renderStatus() {
  var w = STAN_03.w;
  var biezaca = akcjaBiezaca(w);
  var akcje = STAN_03.mozeEdytowac
    ? '<div class="btn-row" style="flex-wrap:wrap;margin-top:10px">' +
        AKCJE_STATUSU.map(function (a) { return przyciskAkcji(a, biezaca); }).join("") + '</div>' +
      (w.statusDec === "Pozytywna"
        ? '<div class="small muted" style="margin-top:10px">Rozliczenie</div><div class="btn-row" style="margin-top:4px">' +
          AKCJE_ROZLICZENIA.map(function (a) { return przyciskAkcji(a, biezaca); }).join("") + '</div>'
        : "")
    : '<div class="small muted" style="margin-top:8px">Podgląd: zmiana statusu wymaga uprawnienia do edycji.</div>';
  el("statusWniosku").innerHTML =
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + Statusy.znacznik(w) + Statusy.znacznikRozliczenia(w) +
    '<span class="small muted">etap <b>' + esc(w.etap) + '</b> z ' + ETAPOW + ': ' + esc(Statusy.ETAPY[w.etap] || "") + '</span></div>' +
    akcje;
}

function zmienStatusWniosku(akcja) {
  var w = STAN_03.w;
  var przed = Statusy.wartosc(w) + (w.rozliczenie && w.rozliczenie !== "Brak" ? ", " + w.rozliczenie : "");
  try {
    Statusy.zmien(w, akcja, { czas: teraz(), uzytkownik: Auth.sesja().uzytkownik_id });
  } catch (e) {
    if (!(e instanceof Statusy.StatusyError)) throw e;
    komunikat(e.message);
    return;
  }
  wpiszDoRejestru("Zmiana statusu", "Status", przed, Statusy.AKCJE[akcja].etykieta);
  wczytaj();
  renderWszystko();
  komunikat("Status zmieniony: " + Statusy.AKCJE[akcja].etykieta);
}
