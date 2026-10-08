/* ============================================================================
   Start strony makiety.

   Baza SQLite laduje sie asynchronicznie (WebAssembly), a kod stron jest pisany
   tak, jakby dane byly dostepne od razu. Boot rozwiazuje to tak: skrypt strony
   siedzi w bloku <script type="text/kfs-strona"> i zostaje uruchomiony dopiero,
   gdy baza jest gotowa. Uruchomienie idzie przez eval w zasiegu globalnym, wiec
   funkcje strony nadal sa globalne i atrybuty onclick w HTML dzialaja.

   Przy okazji boot pilnuje bramy dostepu: strona deklaruje swoj modul
   atrybutem data-modul, a boot sprawdza w bazie, czy zalogowana rola ma do
   niego prawo (D-36). Brak sesji na stronie otwartej bezposrednio przenosi
   na ekran logowania.

   Uzycie na stronie modulu:
     <script src="../assets/boot.js" data-modul="dofin"></script>
     <script type="text/kfs-strona"> ...kod strony... </script>
   ============================================================================ */

(function (global) {
  "use strict";

  var wlasnySkrypt = document.currentScript;
  var modul = wlasnySkrypt ? wlasnySkrypt.getAttribute("data-modul") : null;
  var wymagaSesji = !wlasnySkrypt || wlasnySkrypt.getAttribute("data-publiczna") !== "tak";
  var katalog = wlasnySkrypt ? wlasnySkrypt.src.replace(/assets\/boot\.js.*$/, "") : "";

  function wDomu() { return global.top === global.self; }

  function poDom(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function bladStartu(tresc) {
    poDom(function () {
      document.body.innerHTML =
        '<div class="blokada-dostepu"><div class="blokada-ikona">&#9888;</div>' +
        '<h2>Baza danych nie wstala</h2><p>' + tresc + '</p></div>';
    });
  }

  function uruchomSkryptyStrony() {
    var bloki = document.querySelectorAll('script[type="text/kfs-strona"]');
    for (var i = 0; i < bloki.length; i++) {
      var kod = bloki[i].textContent + "\n//# sourceURL=" + location.pathname + "#strona" + i;
      /* eval posredni: deklaracje var i function trafiaja do zasiegu globalnego,
         dzieki czemu atrybuty onclick w HTML widza funkcje strony */
      (0, eval)(kod);
    }
  }

  /* Zapis odrzucony przez straznika (assets/straznik.js) nie jest awaria strony,
     tylko odmowa. Pokazujemy ja uzytkownikowi zamiast cichego bledu w konsoli. */
  function pokazOdmowe(komunikat) {
    poDom(function () {
      var el = document.getElementById("kfsOdmowa");
      if (!el) {
        el = document.createElement("div");
        el.id = "kfsOdmowa";
        el.setAttribute("role", "alert");
        el.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:380px;padding:12px 14px;" +
          "background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;font:13px system-ui;" +
          "box-shadow:0 6px 18px rgba(0,0,0,.12)";
        document.body.appendChild(el);
      }
      el.textContent = "Zapis odrzucony: " + komunikat;
      el.style.display = "block";
      global.clearTimeout(pokazOdmowe.timer);
      pokazOdmowe.timer = global.setTimeout(function () { el.style.display = "none"; }, CZAS_KOMUNIKATU_MS);
    });
  }
  var CZAS_KOMUNIKATU_MS = 6000;
  function czyOdmowa(e) { return e && e.name === "StraznikError"; }
  global.addEventListener("error", function (ev) {
    if (czyOdmowa(ev.error)) { ev.preventDefault(); pokazOdmowe(ev.error.message); }
  });
  /* Tryb serwera: zapis odrzucony, bo inne okno zapisalo nowsza wersje bazy */
  global.addEventListener("kfs:konflikt", function (ev) { pokazOdmowe(ev.detail.komunikat); });
  global.addEventListener("kfs:blad-zapisu", function (ev) { pokazOdmowe(ev.detail.komunikat); });
  global.addEventListener("unhandledrejection", function (ev) {
    if (czyOdmowa(ev.reason)) { ev.preventDefault(); pokazOdmowe(ev.reason.message); }
  });

  var czekajacy = [];
  var gotowe = false;

  /* KFS.gotowe(fn) dla kodu, ktory nie siedzi w bloku kfs-strona (np. powloka) */
  function gotoweWywolaj(fn) {
    if (gotowe) fn();
    else czekajacy.push(fn);
  }

  if (!global.KFS || !global.KFS.gotowa) {
    bladStartu("Brak assets/sqlite.js. Sprawdz kolejnosc skryptow na stronie.");
    return;
  }

  global.KFS.gotowe = gotoweWywolaj;

  global.KFS.gotowa
    .then(function () {
      if (global.DB && global.DB.przebuduj) global.DB.przebuduj();
      return new Promise(function (res) { poDom(res); });
    })
    .then(function () {
      var Auth = global.Auth;

      if (wymagaSesji && Auth && !Auth.zalogowany()) {
        if (wDomu()) {
          global.location.replace(katalog + "login.html");
          return;
        }
        Auth.pokazBlokade("Sesja wygasla",
          "Zaloguj sie ponownie, zeby zobaczyc te strone.");
        return;
      }

      if (modul && Auth && !Auth.widziModul(modul)) {
        var s = Auth.sesja();
        Auth.pokazBlokade("Brak dostepu",
          "Rola <b>" + s.rola_nazwa + "</b> nie ma tego modulu w swoim zakresie. " +
          "Uprawnienia nadawane sa per rola, nie per osoba (D-35, D-36).");
        return;
      }

      gotowe = true;
      /* Nawigacja (assets/nawigacja.js): pasek zakladek bez modulow spoza roli,
         a powloka dowiaduje sie, jaki ekran jest w ramce, takze po zmianie danych */
      global.Nawigacja.ukryjNiedostepneZakladki(Auth);
      /* Filtry z wyborem wielokrotnym (assets/wielowybor.js) przed skryptem strony,
         zeby ekran dopisywal opcje i wczytywal filtry z adresu juz do nich */
      global.Wielowybor.zamienWszystkie(document);
      uruchomSkryptyStrony();
      global.Nawigacja.zglosEkran();
      global.addEventListener("db:changed", global.Nawigacja.zglosEkran);
      czekajacy.forEach(function (fn) { fn(); });
      czekajacy.length = 0;
      document.documentElement.classList.add("kfs-gotowa");
    })
    .catch(function (e) {
      bladStartu(String(e && e.message ? e.message : e));
    });
})(window);
