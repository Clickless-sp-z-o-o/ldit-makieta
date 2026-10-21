/* Panel instytucji: zakladki jak w panelu LDIT (spotkanie 14.10.2026) zamiast wszystkiego na jednej
   karcie: Klienci i projekty | Zlozone wnioski | Uczestnicy | Terminy szkolen | Konto instytucji |
   Katalog szkolen | Zgloszenia. Na zakladce Zgloszenia czerwony licznik nieprzeczytanych zgloszen od LDIT
   (powiadomienia instytucji, D-317), zeby instytucja ich nie przeoczyla. Zakladka w adresie (#konto),
   dzwonek z paska gornego otwiera #powiadomienia, czyli zakladke Zgloszenia. Tylko deklaracje. */

var WIDOKI_LISTY_16 = ["klienci", "zlozone", "uczestnicy"];
var ZAKLADKI_16 = ["klienci", "zlozone", "uczestnicy", "terminy", "konto", "katalog", "zgloszenia"];
var ALIASY_ZAKLADEK_16 = { powiadomienia: "zgloszenia" };

function panelZakladki16(widok) { return WIDOKI_LISTY_16.indexOf(widok) >= 0 ? "lista" : widok; }

/* Liczba zgloszen od LDIT nieprzeczytanych przez zalogowane konto */
function nieprzeczytaneZgloszenia16() { return Powiadomienia.nieprzeczytane().length; }

function licznikZgloszen16() {
  var n = nieprzeczytaneZgloszenia16();
  ["nZgloszen16", "nZgloszenKarta16"].forEach(function (id) {
    var b = el16(id);
    if (!b) return;
    b.textContent = n;
    b.hidden = !n;
    b.setAttribute("aria-label", n + " nieprzeczytanych zgłoszeń od LDIT");
  });
  return n;
}

/* Przelacza zakladke; widoki listy (klienci, zlozone, uczestnicy) dziela jedna tabele */
function przelaczWidok16(widok) {
  widok = ALIASY_ZAKLADEK_16[widok] || widok;
  if (ZAKLADKI_16.indexOf(widok) < 0) widok = "klienci";
  if (WIDOKI_LISTY_16.indexOf(widok) >= 0) STAN_16.widok = widok;
  STAN_16.zakladka = widok;
  Array.prototype.forEach.call(document.querySelectorAll("#zakladki16 a"), function (a) {
    var on = a.getAttribute("data-widok") === widok;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  var panel = panelZakladki16(widok);
  Array.prototype.forEach.call(document.querySelectorAll(".panel16"), function (s) {
    s.hidden = s.getAttribute("data-panel") !== panel;
  });
  if (panel === "lista") renderKlienci16();
  return widok;
}

function zakladkaZAdresu16() {
  var h = String(location.hash || "").replace(/^#/, "");
  return ALIASY_ZAKLADEK_16[h] || (ZAKLADKI_16.indexOf(h) >= 0 ? h : "klienci");
}

function podepnijZakladki16() {
  Array.prototype.forEach.call(document.querySelectorAll("#zakladki16 a"), function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var widok = przelaczWidok16(a.getAttribute("data-widok"));
      history.replaceState(null, "", location.pathname + location.search + "#" + widok);
      /* Powloka zapamietuje zakladke, wiec Wstecz z karty projektu (22) wraca na nia, np. na Uczestnikow */
      Nawigacja.zglosEkran();
    });
  });
  window.addEventListener("hashchange", function () { przelaczWidok16(zakladkaZAdresu16()); });
  window.addEventListener("db:changed", licznikZgloszen16);
  licznikZgloszen16();
  przelaczWidok16(zakladkaZAdresu16());
}
