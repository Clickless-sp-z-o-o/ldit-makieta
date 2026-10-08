/* ============================================================
   Tooltipy wyjasniajace kolumny i wskazniki.

   Feedback klienta po makiecie v2 (2026-09-04): "zrobmy tooltipy,
   po najechaniu wyswietla sie wieksza informacja, co dany wskaznik
   albo kolumna znaczy. Szczegolnie w dofinansowaniach instytucji."

   Dziala na dowolnym elemencie z atrybutem data-tip. Jeden ruchomy
   dymek dopinany do <body>, dzieki czemu nie jest przycinany przez
   kontenery z overflow (tabele w tbl-wrap, sticky naglowki).
   Zaladuj po tresci strony: <script src="../assets/tips.js"></script>
   ============================================================ */
(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc) return;

  var bubble = null;

  function ensure() {
    if (bubble) return bubble;
    bubble = doc.createElement("div");
    bubble.className = "tip-bubble";
    doc.body.appendChild(bubble);
    return bubble;
  }

  function pokaz(el) {
    var txt = el.getAttribute("data-tip");
    /* Bez numerow decyzji, gdy uwagi projektowe sa ukryte (assets/interfejs.js) */
    if (txt && global.Interfejs) txt = global.Interfejs.tekstPodpowiedzi(txt);
    if (!txt) return;
    var b = ensure();
    b.textContent = txt;
    b.classList.add("show");

    var r = el.getBoundingClientRect();
    var left = r.left + r.width / 2 - b.offsetWidth / 2;
    left = Math.max(8, Math.min(left, global.innerWidth - b.offsetWidth - 8));

    var top = r.top - b.offsetHeight - 8;
    var ponizej = top < 8;
    if (ponizej) top = r.bottom + 8;

    b.style.left = left + "px";
    b.style.top = top + "px";
    b.classList.toggle("below", ponizej);
  }

  function ukryj() {
    if (bubble) bubble.classList.remove("show");
  }

  doc.addEventListener("mouseover", function (e) {
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el) pokaz(el);
  });
  doc.addEventListener("mouseout", function (e) {
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el) ukryj();
  });
  /* Dymek jest pozycjonowany wzgledem viewportu, wiec przy scrollu chowamy */
  global.addEventListener("scroll", ukryj, true);
})(window);
