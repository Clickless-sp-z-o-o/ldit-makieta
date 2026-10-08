/* ============================================================================
   Filtry z wyborem wielokrotnym.

   Kazdy filtr listy (select z atrybutem data-wielo) zamienia sie w przycisk
   z lista pol wyboru. Pod spodem zostaje ten sam <select multiple>, wiec
   nasluchy "change" na ekranach dzialaja bez zmian, a wartosci czyta sie
   przez Wielowybor.wartosci(el). Pierwsza opcja z pustą wartoscia (np.
   "Wszystkie instytucje") jest etykieta stanu "nic nie wybrano = wszystko".

   Opcje moga byc dopisywane przez ekran pozniej (np. lista instytucji z bazy):
   lista pol wyboru buduje sie od nowa przy kazdym otwarciu.

   W adresie wiele wartosci zapisuje sie po przecinku: inst=IS-01,IS-02.

   API:  Wielowybor.zamienWszystkie(korzen)  zamiana select[data-wielo]
         Wielowybor.wartosci(el)            wybrane wartosci (tablica, bez pustej)
         Wielowybor.tekst(el)               wartosc do adresu (po przecinku)
         Wielowybor.ustaw(el, wartosci)     ustawienie wyboru (tablica albo tekst z przecinkami)
         Wielowybor.pasuje(wybrane, v)      true, gdy nic nie wybrano albo v jest wsrod wybranych
         Wielowybor.zTekstu(t), naTekst(a)  zamiana tekstu z adresu na tablice i z powrotem
   ============================================================================ */

(function (global) {
  "use strict";

  var STYL = ".wielo{position:relative;display:inline-block}" +
    ".wielo-btn{display:inline-flex;align-items:center;gap:6px;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;text-align:left}" +
    ".wielo-btn::after{content:'\\25BE';margin-left:auto;color:var(--ink-3)}" +
    ".wielo-btn.ma{border-color:var(--gold-dark,#a8864f);background:var(--accent-soft)}" +
    ".wielo-panel{position:absolute;z-index:40;top:calc(100% + 4px);left:0;min-width:230px;max-height:320px;overflow:auto;" +
    "background:#fff;border:1px solid var(--line-strong);border-radius:8px;box-shadow:var(--shadow-lg);padding:6px}" +
    ".wielo-panel label{display:flex;gap:8px;align-items:center;padding:4px 6px;border-radius:5px;font-size:12.5px;cursor:pointer;white-space:nowrap}" +
    ".wielo-panel label:hover{background:var(--surface-2)}" +
    ".wielo-panel .wielo-akcje{display:flex;gap:6px;justify-content:space-between;border-top:1px solid var(--line);margin-top:4px;padding:6px 4px 2px}" +
    ".wielo-panel input[type=search]{width:100%;margin-bottom:4px}";

  function zTekstu(t) { return String(t || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
  function naTekst(a) { return (a || []).join(","); }

  function wartosci(el) {
    if (!el.multiple) return el.value ? [el.value] : [];
    return Array.prototype.filter.call(el.options, function (o) { return o.selected && o.value; })
      .map(function (o) { return o.value; });
  }

  /* Wartosc pola do adresu: filtr wielokrotny po przecinku, zwykle pole bez zmian */
  function tekst(el) { return el.multiple ? naTekst(wartosci(el)) : el.value; }

  function pasuje(wybrane, v) { return !wybrane.length || wybrane.indexOf(v) >= 0; }

  function ustaw(el, lista) {
    var w = Array.isArray(lista) ? lista : zTekstu(lista);
    Array.prototype.forEach.call(el.options, function (o) { o.selected = !!o.value && w.indexOf(o.value) >= 0; });
    odswiezPrzycisk(el);
  }

  function etykietaPusta(el) { return el.getAttribute("data-pusty") || "Wszystkie"; }

  function odswiezPrzycisk(el) {
    var btn = el._wieloBtn;
    if (!btn) return;
    var wybrane = Array.prototype.filter.call(el.options, function (o) { return o.selected && o.value; });
    btn.textContent = !wybrane.length ? etykietaPusta(el)
      : wybrane.length === 1 ? wybrane[0].textContent
      : etykietaPusta(el).replace(/^Wszystkie\s*|^Wszyscy\s*/i, "") + ": " + wybrane.length + " wybrane";
    btn.classList.toggle("ma", wybrane.length > 0);
    btn.title = wybrane.map(function (o) { return o.textContent; }).join(", ") || etykietaPusta(el);
  }

  function zglosZmiane(el) {
    odswiezPrzycisk(el);
    el.dispatchEvent(new global.Event("change", { bubbles: true }));
  }

  function zamknijWszystkie(pozaTym) {
    document.querySelectorAll(".wielo-panel").forEach(function (p) { if (p !== pozaTym) p.remove(); });
  }

  function budujPanel(el, opakowanie) {
    var panel = document.createElement("div");
    panel.className = "wielo-panel";
    var opcje = Array.prototype.filter.call(el.options, function (o) { return o.value; });
    if (opcje.length > 12) {
      var szukaj = document.createElement("input");
      szukaj.type = "search"; szukaj.className = "inp"; szukaj.placeholder = "Szukaj...";
      szukaj.addEventListener("input", function () {
        var q = szukaj.value.toLowerCase();
        panel.querySelectorAll("label").forEach(function (l) { l.style.display = l.textContent.toLowerCase().indexOf(q) >= 0 ? "" : "none"; });
      });
      panel.appendChild(szukaj);
    }
    opcje.forEach(function (o) {
      var lab = document.createElement("label");
      var chk = document.createElement("input");
      chk.type = "checkbox"; chk.checked = o.selected;
      chk.addEventListener("change", function () { o.selected = chk.checked; zglosZmiane(el); });
      lab.appendChild(chk);
      lab.appendChild(document.createTextNode(o.textContent));
      panel.appendChild(lab);
    });
    var akcje = document.createElement("div");
    akcje.className = "wielo-akcje";
    akcje.innerHTML = '<button type="button" class="btn xs" data-a="wszystko">Zaznacz widoczne</button>' +
      '<button type="button" class="btn xs" data-a="nic">Wyczyść</button>';
    akcje.addEventListener("click", function (e) {
      var a = e.target.getAttribute("data-a");
      if (!a) return;
      panel.querySelectorAll("label").forEach(function (l) {
        if (a === "wszystko" && l.style.display === "none") return;
        var chk = l.querySelector("input");
        chk.checked = a === "wszystko";
        opcje[Array.prototype.indexOf.call(panel.querySelectorAll("label"), l)].selected = chk.checked;
      });
      zglosZmiane(el);
    });
    panel.appendChild(akcje);
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    opakowanie.appendChild(panel);
  }

  function zamien(el) {
    if (el._wieloBtn) return;
    var pusta = el.options.length && !el.options[0].value ? el.options[0] : null;
    /* Wybor odczytany przed usunieciem pustej opcji: po jej usunieciu przegladarka
       sama zaznaczylaby pierwsza pozostala opcje zwyklego selecta */
    var wybrane = wartosci(el);
    if (pusta) { el.setAttribute("data-pusty", pusta.textContent); pusta.remove(); }
    el.multiple = true;
    ustawBezZdarzenia(el, wybrane);
    var opakowanie = document.createElement("span");
    opakowanie.className = "wielo";
    el.parentNode.insertBefore(opakowanie, el);
    opakowanie.appendChild(el);
    el.style.display = "none";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inp wielo-btn";
    if (el.getAttribute("data-tip")) btn.setAttribute("data-tip", el.getAttribute("data-tip"));
    opakowanie.insertBefore(btn, el);
    el._wieloBtn = btn;
    el.addEventListener("change", function () { odswiezPrzycisk(el); });
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var otwarty = opakowanie.querySelector(".wielo-panel");
      zamknijWszystkie(null);
      if (!otwarty) budujPanel(el, opakowanie);
    });
    odswiezPrzycisk(el);
  }

  function ustawBezZdarzenia(el, lista) {
    Array.prototype.forEach.call(el.options, function (o) { o.selected = lista.indexOf(o.value) >= 0; });
  }

  /* Ukrycie filtra (np. instytucja wymuszona z menu) ukrywa tez jego przycisk */
  function ukryj(el) { if (el._wieloBtn) el._wieloBtn.parentNode.style.display = "none"; else el.style.display = "none"; }

  function zamienWszystkie(korzen) {
    if (!document.getElementById("wieloStyl")) {
      var s = document.createElement("style");
      s.id = "wieloStyl"; s.textContent = STYL;
      document.head.appendChild(s);
    }
    (korzen || document).querySelectorAll("select[data-wielo]").forEach(zamien);
  }

  if (global.document) {
    global.document.addEventListener("click", function () { zamknijWszystkie(null); });
  }

  global.Wielowybor = {
    zamienWszystkie: zamienWszystkie, wartosci: wartosci, tekst: tekst, ustaw: ustaw, pasuje: pasuje, ukryj: ukryj,
    zTekstu: zTekstu, naTekst: naTekst, odswiez: odswiezPrzycisk
  };
})(window);
