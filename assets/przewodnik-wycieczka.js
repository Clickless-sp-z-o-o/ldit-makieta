/* ============================================================================
   Wycieczka przewodnika w powloce makiety (index.html), jak Wycieczka.tsx w aplikacji:
   przyciemnienie z wycieciem na element, okienko z opisem, Dalej, Wstecz, Zakoncz,
   strzalki i Escape. Krok, ktorego elementu nie ma na ekranie, jest pomijany.

   Kotwica data-przewodnik jest w powloce (menu, pasek) albo w ekranie w ramce.
   Ekran w ramce pyta sie komunikatami (assets/przewodnik-ramka.js), bo na file://
   powloka nie ma dostepu do jego dokumentu.

   PrzewodnikWycieczka.start({ kroki, teksty, ramka, wiecej, koniec, brak })
     wiecej  funkcja przycisku "Wiecej w przewodniku" w ostatnim kroku (albo null)
     koniec  wywolywana po zakonczeniu, brak: gdy zaden krok nie jest widoczny
   ============================================================================ */

(function (global) {
  "use strict";

  var L = global.PrzewodnikLogika;
  var CZAS_ODPOWIEDZI_MS = 800;
  var FOKUSOWALNE = "button:not([disabled]), a[href]";
  var licznikZapytan = 0;
  var trwa = null;

  function cel() { return global.location.origin && global.location.origin !== "null" ? global.location.origin : "*"; }

  function wRamce(ramka, tresc) {
    if (ramka && ramka.contentWindow) ramka.contentWindow.postMessage(tresc, cel());
  }

  /* Element kotwicy w powloce, gdy jest widoczny (schowane menu na telefonie to brak elementu) */
  function wPowloce(kotwica) {
    return Array.prototype.filter.call(document.querySelectorAll("[data-przewodnik]"), function (x) {
      if (x.getAttribute("data-przewodnik") !== kotwica || x.closest(".wycieczka")) return false;
      if (typeof x.checkVisibility === "function" && !x.checkVisibility()) return false;
      var r = x.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < global.innerWidth;
    })[0] || null;
  }

  /* Kotwice widoczne w ramce: odpowiedz na komunikat albo pusta lista po czasie (np. ekran z blokada dostepu) */
  function widoczneWRamce(ramka, kotwice) {
    return new Promise(function (gotowe) {
      if (!kotwice.length || !ramka || !ramka.contentWindow) { gotowe([]); return; }
      var nr = ++licznikZapytan;
      var zegar = global.setTimeout(function () { global.removeEventListener("message", odbierz); gotowe([]); }, CZAS_ODPOWIEDZI_MS);
      function odbierz(ev) {
        if (ev.source !== ramka.contentWindow || !ev.data || ev.data.typ !== "kfs:przewodnik-widoczne" || ev.data.nr !== nr) return;
        global.clearTimeout(zegar);
        global.removeEventListener("message", odbierz);
        gotowe(Array.isArray(ev.data.widoczne) ? ev.data.widoczne : []);
      }
      global.addEventListener("message", odbierz);
      wRamce(ramka, { typ: "kfs:przewodnik", akcja: "sprawdz", nr: nr, kotwice: kotwice });
    });
  }

  function okno() { return { left: 0, top: 0, width: global.innerWidth, height: global.innerHeight }; }

  function ustaw(t, cel, obszar) {
    var p = L.prostokatPodswietlenia(cel, obszar);
    if (p.width <= 0 || p.height <= 0) return false;
    var s = t.podswietlenie.style;
    s.left = p.left + "px"; s.top = p.top + "px"; s.width = p.width + "px"; s.height = p.height + "px";
    var o = L.pozycjaOkienka(p, { szerokosc: t.okienko.offsetWidth, wysokosc: t.okienko.offsetHeight },
      { szerokosc: global.innerWidth, wysokosc: global.innerHeight });
    t.okienko.style.left = o.left + "px";
    t.okienko.style.top = o.top + "px";
    return true;
  }

  function przycisk(tekst, klasa, akcja) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn sm" + (klasa ? " " + klasa : "");
    b.textContent = tekst;
    b.addEventListener("click", akcja);
    return b;
  }

  /* Tresc okienka kroku: licznik, tytul, opis i przyciski */
  function wypelnijOkienko(t) {
    var T = function (k, p) { return L.tekst(t.teksty, k, p); };
    var kotwica = t.kroki[t.indeks];
    var ostatni = t.indeks === t.kroki.length - 1;
    t.licznik.textContent = T("ldit.panel.przewodnik.wycieczka.licznik", { numer: t.indeks + 1, liczba: t.kroki.length });
    t.tytul.textContent = T(L.kluczKotwicy(kotwica, "tytul"));
    t.opis.textContent = T(L.kluczKotwicy(kotwica, "opis"));
    t.przyciski.innerHTML = "";
    var wstecz = przycisk(T("ldit.panel.przewodnik.wycieczka.wstecz"), "", function () { przejdz(-1); });
    wstecz.disabled = t.indeks === 0;
    var dalej = przycisk(T(ostatni ? "ldit.panel.przewodnik.wycieczka.gotowe" : "ldit.panel.przewodnik.wycieczka.dalej"), "primary", function () { przejdz(1); });
    t.przyciski.appendChild(wstecz);
    t.przyciski.appendChild(dalej);
    if (ostatni && t.wiecej) t.przyciski.appendChild(przycisk(T("ldit.panel.przewodnik.wycieczka.wiecej"), "", function () { zakoncz(t.wiecej); }));
    t.przyciski.appendChild(przycisk(T("ldit.panel.przewodnik.wycieczka.zakoncz"), "ghost", function () { zakoncz(); }));
    dalej.focus();
  }

  /* Pokazuje krok indeks; element, ktorego juz nie ma, przechodzi dalej w tym samym kierunku */
  function pokazKrok(kierunek) {
    var t = trwa;
    wypelnijOkienko(t);
    var kotwica = t.kroki[t.indeks];
    var el = wPowloce(kotwica);
    t.nr = ++licznikZapytan;
    if (el) {
      wRamce(t.ramka, { typ: "kfs:przewodnik", akcja: "zakoncz" });
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      t.odswiez = function () { var e = wPowloce(kotwica); return e ? ustaw(t, e.getBoundingClientRect(), okno()) : false; };
      if (!t.odswiez()) przejdz(kierunek);
      return;
    }
    t.odswiez = function () { wRamce(t.ramka, { typ: "kfs:przewodnik", akcja: "podswietl", kotwica: kotwica, nr: t.nr }); };
    t.odswiez();
  }

  /* Prostokat kotwicy z ramki (po przewinieciu i kolejne aktualizacje), we wspolrzednych okna powloki */
  function prostokatZRamki(ev) {
    var t = trwa;
    if (!t || ev.source !== (t.ramka && t.ramka.contentWindow) || !ev.data || ev.data.typ !== "kfs:przewodnik-prostokat" || ev.data.nr !== t.nr) return;
    var r = ev.data.prostokat;
    var ramka = t.ramka.getBoundingClientRect();
    var obszar = { left: ramka.left, top: ramka.top, width: ramka.width, height: ramka.height };
    if (!r || !ustaw(t, { left: ramka.left + r.left, top: ramka.top + r.top, width: r.width, height: r.height }, obszar)) {
      t.nr = -1;
      przejdz(t.kierunek);
    }
  }

  function przejdz(kierunek) {
    var t = trwa;
    if (!t) return;
    var nastepny = t.indeks + kierunek;
    if (nastepny < 0) return;
    if (nastepny >= t.kroki.length) { zakoncz(); return; }
    t.indeks = nastepny;
    t.kierunek = kierunek;
    pokazKrok(kierunek);
  }

  function klawisz(e) {
    if (!trwa) return;
    if (e.key === "Escape") { e.preventDefault(); zakoncz(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); przejdz(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); przejdz(-1); }
    else if (e.key === "Tab") zawinFokus(e);
  }

  /* Tab i Shift+Tab kraza po przyciskach okienka */
  function zawinFokus(e) {
    var elementy = trwa.okienko.querySelectorAll(FOKUSOWALNE);
    if (!elementy.length) return;
    var pierwszy = elementy[0];
    var ostatni = elementy[elementy.length - 1];
    var aktywny = document.activeElement;
    var poza = !trwa.okienko.contains(aktywny);
    if (!poza && aktywny !== (e.shiftKey ? pierwszy : ostatni)) return;
    e.preventDefault();
    (e.shiftKey ? ostatni : pierwszy).focus();
  }

  function zmianaOkna() { if (trwa && trwa.odswiez) trwa.odswiez(); }

  function zakoncz(potem) {
    var t = trwa;
    if (!t) return;
    trwa = null;
    wRamce(t.ramka, { typ: "kfs:przewodnik", akcja: "zakoncz" });
    t.wezel.remove();
    document.removeEventListener("keydown", klawisz, true);
    global.removeEventListener("message", prostokatZRamki);
    global.removeEventListener("resize", zmianaOkna);
    global.removeEventListener("scroll", zmianaOkna, true);
    if (typeof potem === "function") potem(); else if (t.koniec) t.koniec();
  }

  function zbudujWezel(t) {
    var wezel = document.createElement("div");
    wezel.className = "wycieczka";
    t.podswietlenie = document.createElement("div");
    t.podswietlenie.className = "wycieczka-podswietlenie";
    t.podswietlenie.setAttribute("aria-hidden", "true");
    t.okienko = document.createElement("div");
    t.okienko.className = "wycieczka-okienko";
    t.okienko.setAttribute("role", "dialog");
    t.okienko.setAttribute("aria-modal", "true");
    t.okienko.setAttribute("aria-labelledby", "wycieczka-tytul");
    t.okienko.setAttribute("aria-describedby", "wycieczka-opis");
    t.licznik = document.createElement("div");
    t.licznik.className = "small muted";
    t.licznik.setAttribute("aria-live", "polite");
    t.tytul = document.createElement("h2");
    t.tytul.id = "wycieczka-tytul";
    t.opis = document.createElement("p");
    t.opis.id = "wycieczka-opis";
    t.przyciski = document.createElement("div");
    t.przyciski.className = "btn-row";
    [t.licznik, t.tytul, t.opis, t.przyciski].forEach(function (x) { t.okienko.appendChild(x); });
    wezel.appendChild(t.podswietlenie);
    wezel.appendChild(t.okienko);
    return wezel;
  }

  /* Start: najpierw sprawdzenie, ktore kroki sa widoczne (w powloce od razu, w ramce komunikatem) */
  function start(opcje) {
    if (trwa) zakoncz();
    var wPowloceWidoczne = opcje.kroki.filter(function (k) { return wPowloce(k) !== null; });
    var reszta = opcje.kroki.filter(function (k) { return wPowloceWidoczne.indexOf(k) < 0; });
    return widoczneWRamce(opcje.ramka, reszta).then(function (zRamki) {
      var kroki = opcje.kroki.filter(function (k) { return wPowloceWidoczne.indexOf(k) >= 0 || zRamki.indexOf(k) >= 0; });
      if (!kroki.length) { if (opcje.brak) opcje.brak(); return false; }
      var t = { kroki: kroki, indeks: 0, kierunek: 1, teksty: opcje.teksty, ramka: opcje.ramka,
                wiecej: opcje.wiecej || null, koniec: opcje.koniec || null, nr: 0, odswiez: null };
      t.wezel = zbudujWezel(t);
      document.body.appendChild(t.wezel);
      trwa = t;
      document.addEventListener("keydown", klawisz, true);
      global.addEventListener("message", prostokatZRamki);
      global.addEventListener("resize", zmianaOkna);
      global.addEventListener("scroll", zmianaOkna, true);
      pokazKrok(1);
      return true;
    });
  }

  global.PrzewodnikWycieczka = { start: start, zakoncz: function () { zakoncz(); }, trwa: function () { return trwa !== null; } };
})(window);
