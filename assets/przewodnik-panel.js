/* ============================================================================
   Panel Przewodnik w powloce makiety, jak PanelPrzewodnika.tsx w aplikacji:
   wysuwany z prawej, zakladki "Na tym ekranie" i "Spis tresci" (wyszukiwarka,
   tematy, najczestsze pytania, ekrany konta z linkami), na dole "Pokaz przewodnik
   po systemie". Tresci budowane przez textContent, bez wstawiania HTML.

   PrzewodnikPanel.zbuduj(kontekst, zakladka, akcje) zwraca { tlo, panel }
     kontekst: { teksty, dane, grupa, biezacy ({ ekran, kroki } albo null), ekrany }
     akcje:    { zamknij, zakladka(z), pokazEkran, pokazSystem, przejdz(adres) }
   ============================================================================ */

(function (global) {
  "use strict";

  var L = global.PrzewodnikLogika;
  var DLUGOSC_ZAJAWKI = 160;
  var ZAKLADKI = ["ekran", "spis"];
  var FOKUSOWALNE = "a[href], button:not([disabled]), input:not([disabled]), summary";

  function el(tag, klasa, tekst) {
    var e = document.createElement(tag);
    if (klasa) e.className = klasa;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  }

  function przycisk(tekst, klasa, akcja) {
    var b = el("button", "btn sm" + (klasa ? " " + klasa : ""), tekst);
    b.type = "button";
    b.addEventListener("click", akcja);
    return b;
  }

  /* Linie tekstu jako lista numerowana albo punktowana, z naglowkiem; pusty tekst nic nie dodaje */
  function lista(rodzic, naglowek, tekst, numerowana) {
    var pozycje = L.linie(tekst);
    if (!pozycje.length) return;
    if (naglowek) rodzic.appendChild(el("h4", "", naglowek));
    var l = el(numerowana ? "ol" : "ul");
    pozycje.forEach(function (p) { l.appendChild(el("li", "", p)); });
    rodzic.appendChild(l);
  }

  function ogolnaPomoc(k, akcje) {
    var T = function (klucz) { return L.tekst(k.teksty, klucz); };
    var s = el("section", "przewodnik-ekran");
    s.appendChild(el("h3", "", T("ldit.panel.przewodnik.ogolna.tytul")));
    s.appendChild(el("p", "", T("ldit.panel.przewodnik.ogolna.opis")));
    lista(s, T("ldit.panel.przewodnik.naglowek.kroki"), T("ldit.panel.przewodnik.ogolna." + k.grupa + ".kroki"), true);
    s.appendChild(przycisk(T("ldit.panel.przewodnik.otworzSpis"), "", function () { akcje.zakladka("spis"); }));
    return s;
  }

  /* "Na tym ekranie": opis, blok Pokaz na ekranie (gdy ekran ma wycieczke), kroki, wskazowki i czego tu nie widac */
  function naTymEkranie(k, akcje) {
    if (!k.biezacy) return ogolnaPomoc(k, akcje);
    var T = function (klucz, p) { return L.tekst(k.teksty, klucz, p); };
    var pole = function (p) { return T(L.kluczEkranu(k.biezacy.ekran.id, k.grupa, p)); };
    var s = el("section", "przewodnik-ekran");
    s.appendChild(el("h3", "", pole("tytul")));
    s.appendChild(el("p", "", pole("opis")));
    var liczba = k.biezacy.kroki.length;
    if (liczba > 0) {
      var pokaz = el("div", "przewodnik-pokaz");
      var opis = el("div");
      opis.appendChild(el("b", "", T("ldit.panel.przewodnik.pokaz.tytul")));
      opis.appendChild(el("span", "small muted", T("ldit.panel.przewodnik.pokaz.opis", { liczba: liczba })));
      pokaz.appendChild(opis);
      pokaz.appendChild(przycisk(T("ldit.panel.przewodnik.pokaz.przycisk"), "primary", akcje.pokazEkran));
      s.appendChild(pokaz);
    }
    lista(s, T("ldit.panel.przewodnik.naglowek.kroki"), pole("kroki"), true);
    lista(s, T("ldit.panel.przewodnik.naglowek.wskazowki"), pole("wskazowki"), false);
    lista(s, T("ldit.panel.przewodnik.naglowek.niewidac"), pole("niewidac"), false);
    return s;
  }

  /* Wszystko, co konto moze przeczytac: ekrany konta, tematy i pytania jego grupy rol */
  function wpisy(k) {
    var T = function (klucz) { return L.tekst(k.teksty, klucz); };
    var ekrany = k.ekrany.map(function (x) {
      return { klucz: "ekran-" + x.ekran.id, tytul: T(L.kluczEkranu(x.ekran.id, k.grupa, "tytul")), adres: x.adres,
               tresc: ["opis", "kroki", "wskazowki", "niewidac"].map(function (p) { return T(L.kluczEkranu(x.ekran.id, k.grupa, p)); }).join("\n") };
    });
    var tematy = k.dane.tematy.filter(function (m) { return m.grupy.indexOf(k.grupa) >= 0; }).map(function (m) {
      return { klucz: "temat-" + m.id, tytul: T("ldit.panel.przewodnik.temat." + m.id + ".tytul"),
               tresc: T("ldit.panel.przewodnik.temat." + m.id + "." + k.grupa + ".tresc"), adres: null };
    });
    var pytania = (k.dane.pytania[k.grupa] || []).map(function (id) {
      return { klucz: "faq-" + id, tytul: T("ldit.panel.przewodnik.faq." + id + ".pytanie"),
               tresc: T("ldit.panel.przewodnik.faq." + id + ".odpowiedz"), adres: null };
    });
    return ekrany.concat(tematy, pytania);
  }

  function tytulWpisu(w, akcje) {
    if (!w.adres) return el("b", "", w.tytul);
    var a = el("a", "", w.tytul);
    a.href = "strony/" + w.adres;
    a.addEventListener("click", function (e) { e.preventDefault(); akcje.przejdz(w.adres); });
    return a;
  }

  function pozycjaListy(w, zajawka, akcje) {
    var li = el("li");
    li.appendChild(tytulWpisu(w, akcje));
    li.appendChild(el("span", "small muted", zajawka));
    return li;
  }

  function tematy(k, rodzic) {
    var T = function (klucz) { return L.tekst(k.teksty, klucz); };
    k.dane.tematy.filter(function (m) { return m.grupy.indexOf(k.grupa) >= 0; }).forEach(function (m) {
      var d = el("details", "przewodnik-temat");
      d.appendChild(el("summary", "", T("ldit.panel.przewodnik.temat." + m.id + ".tytul")));
      lista(d, null, T("ldit.panel.przewodnik.temat." + m.id + "." + k.grupa + ".tresc"), Boolean(m.numerowana));
      rodzic.appendChild(d);
    });
    var faq = el("details", "przewodnik-temat");
    faq.appendChild(el("summary", "", T("ldit.panel.przewodnik.faq.tytul")));
    var dl = el("dl");
    (k.dane.pytania[k.grupa] || []).forEach(function (id) {
      dl.appendChild(el("dt", "", T("ldit.panel.przewodnik.faq." + id + ".pytanie")));
      dl.appendChild(el("dd", "", T("ldit.panel.przewodnik.faq." + id + ".odpowiedz")));
    });
    faq.appendChild(dl);
    rodzic.appendChild(faq);
  }

  /* "Spis tresci": wyszukiwarka; bez frazy tematy, pytania i ekrany konta, z fraza wyniki */
  function spisTresci(k, akcje) {
    var T = function (klucz, p) { return L.tekst(k.teksty, klucz, p); };
    var s = el("section", "przewodnik-spis");
    var pole = el("input", "inp");
    pole.type = "search";
    pole.setAttribute("aria-label", T("ldit.panel.przewodnik.szukaj.etykieta"));
    pole.placeholder = T("ldit.panel.przewodnik.szukaj.podpowiedz");
    var tresc = el("div");
    var wszystkie = wpisy(k);
    function rysuj() {
      tresc.innerHTML = "";
      if (pole.value.trim()) {
        var wyniki = L.szukaj(wszystkie, pole.value);
        var w = el("div", "przewodnik-wyniki");
        var stan = el("p", "small muted", T("ldit.panel.przewodnik.szukaj.wynik", { liczba: wyniki.length }));
        stan.setAttribute("role", "status");
        w.appendChild(stan);
        var ul = el("ul");
        wyniki.forEach(function (x) { ul.appendChild(pozycjaListy(x, x.tresc.replace(/\n/g, " ").slice(0, DLUGOSC_ZAJAWKI), akcje)); });
        w.appendChild(ul);
        tresc.appendChild(w);
        return;
      }
      tematy(k, tresc);
      tresc.appendChild(el("h4", "", T("ldit.panel.przewodnik.ekrany.tytul")));
      var lista = el("ul", "przewodnik-ekrany");
      wszystkie.filter(function (x) { return x.klucz.indexOf("ekran-") === 0; })
        .forEach(function (x) { lista.appendChild(pozycjaListy(x, x.tresc.split("\n")[0], akcje)); });
      tresc.appendChild(lista);
    }
    pole.addEventListener("input", rysuj);
    s.appendChild(pole);
    s.appendChild(tresc);
    rysuj();
    return s;
  }

  function zakladki(k, zakladka, akcje) {
    var T = function (klucz) { return L.tekst(k.teksty, klucz); };
    var pasek = el("div", "tabs");
    pasek.setAttribute("role", "tablist");
    pasek.setAttribute("aria-label", T("ldit.panel.przewodnik.tytul"));
    ZAKLADKI.forEach(function (z) {
      var b = el("button", "tab" + (z === zakladka ? " on" : ""), T("ldit.panel.przewodnik.zakladka." + z));
      b.type = "button";
      b.id = "przewodnik-zakladka-" + z;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(z === zakladka));
      b.setAttribute("aria-controls", "przewodnik-tresc-" + z);
      b.addEventListener("click", function () { akcje.zakladka(z); });
      pasek.appendChild(b);
    });
    return pasek;
  }

  /* Pulapka fokusu: Tab i Shift+Tab kraza po elementach panelu */
  function zawinFokus(panel, e) {
    if (e.key !== "Tab") return;
    var elementy = panel.querySelectorAll(FOKUSOWALNE);
    if (!elementy.length) return;
    var pierwszy = elementy[0];
    var ostatni = elementy[elementy.length - 1];
    var aktywny = document.activeElement;
    if (panel.contains(aktywny) && aktywny !== (e.shiftKey ? pierwszy : ostatni) && aktywny !== panel) return;
    e.preventDefault();
    (e.shiftKey ? ostatni : pierwszy).focus();
  }

  function zbuduj(k, zakladka, akcje) {
    var T = function (klucz) { return L.tekst(k.teksty, klucz); };
    var tlo = el("div", "przewodnik-tlo");
    tlo.setAttribute("aria-hidden", "true");
    tlo.addEventListener("click", akcje.zamknij);
    var panel = el("aside", "przewodnik-panel");
    panel.id = "panel-przewodnika";
    panel.tabIndex = -1;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "panel-przewodnika-tytul");
    panel.addEventListener("keydown", function (e) { zawinFokus(panel, e); });

    var glowa = el("div", "przewodnik-glowa");
    var h2 = el("h2", "", T("ldit.panel.przewodnik.tytul"));
    h2.id = "panel-przewodnika-tytul";
    var zamknij = przycisk("×", "ghost", akcje.zamknij);
    zamknij.setAttribute("aria-label", T("ldit.panel.przewodnik.zamknij"));
    glowa.appendChild(h2);
    glowa.appendChild(zamknij);

    var tresc = el("div", "przewodnik-tresc");
    tresc.id = "przewodnik-tresc-" + zakladka;
    tresc.setAttribute("role", "tabpanel");
    tresc.setAttribute("aria-labelledby", "przewodnik-zakladka-" + zakladka);
    tresc.appendChild(zakladka === "ekran" ? naTymEkranie(k, akcje) : spisTresci(k, akcje));

    var stopka = el("div", "przewodnik-stopka");
    stopka.appendChild(przycisk(T("ldit.panel.przewodnik.pokazSystem"), "", akcje.pokazSystem));
    stopka.appendChild(el("span", "small muted", T("ldit.panel.przewodnik.skroty")));

    [glowa, zakladki(k, zakladka, akcje), tresc, stopka].forEach(function (x) { panel.appendChild(x); });
    return { tlo: tlo, panel: panel };
  }

  global.PrzewodnikPanel = { zbuduj: zbuduj };
})(window);
