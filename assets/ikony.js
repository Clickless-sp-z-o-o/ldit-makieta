/* ============================================================================
   Ikony interfejsu: menu modulow i gorny pasek. Rysunki z zestawu Lucide
   (lucide-static 1.57.0, licencja ISC, Copyright (c) Lucide Icons and Contributors),
   wklejone jako tresc SVG, bo makieta dziala z dysku bez sieci. Ikona dziedziczy
   kolor tekstu (stroke: currentColor), rozmiar ustawia CSS (.ikona).
   Ikony.svg(nazwa) zwraca znacznik <svg> albo pusty tekst dla nieznanej nazwy.
   ============================================================================ */
(function (global) {
  var RYSUNKI = {
    dash: "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
    dofin: "<path d=\"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17\"/> <path d=\"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9\"/> <path d=\"m2 16 6 6\"/> <circle cx=\"16\" cy=\"9\" r=\"2.9\"/> <circle cx=\"6\" cy=\"5\" r=\"3\"/>",
    baza: "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/> <path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/> <path d=\"M3 12A9 3 0 0 0 21 12\"/>",
    nabory: "<path d=\"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z\"/> <path d=\"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14\"/> <path d=\"M8 6v8\"/>",
    zadania: "<path d=\"M13 5h8\"/> <path d=\"M13 12h8\"/> <path d=\"M13 19h8\"/> <path d=\"m3 17 2 2 4-4\"/> <path d=\"m3 7 2 2 4-4\"/>",
    formularz: "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"/> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\"/> <path d=\"M9 15h6\"/> <path d=\"M12 18v-6\"/>",
    akcept: "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/> <path d=\"m9 14 2 2 4-4\"/>",
    inst: "<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"/> <path d=\"M22 10v6\"/> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"/>",
    komun: "<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\"/> <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/>",
    admin: "<path d=\"M10 18v-7\"/> <path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\"/> <path d=\"M14 18v-7\"/> <path d=\"M18 18v-7\"/> <path d=\"M3 22h18\"/> <path d=\"M6 18v-7\"/>",
    zglo: "<path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\"/>",
    ustaw: "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>",
    panelIS: "<path d=\"M10 12h4\"/> <path d=\"M10 8h4\"/> <path d=\"M14 21v-3a2 2 0 0 0-4 0v3\"/> <path d=\"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2\"/> <path d=\"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16\"/>",
    terminy: "<path d=\"M8 2v3\"/> <path d=\"M16 2v3\"/> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/> <path d=\"M3 9h18\"/> <path d=\"M8 13h.01\"/> <path d=\"M12 13h.01\"/> <path d=\"M16 13h.01\"/> <path d=\"M8 17h.01\"/> <path d=\"M12 17h.01\"/> <path d=\"M16 17h.01\"/>",
    szukaj: "<path d=\"m21 21-4.34-4.34\"/> <circle cx=\"11\" cy=\"11\" r=\"8\"/>",
    skrzynka: "<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"/> <path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/>",
    zwin: "<path d=\"m11 17-5-5 5-5\"/> <path d=\"m18 17-5-5 5-5\"/>",
    menu: "<path d=\"M4 5h16\"/> <path d=\"M4 12h16\"/> <path d=\"M4 19h16\"/>",
    dzwonek: "<path d=\"M10.268 21a2 2 0 0 0 3.464 0\"/> <path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\"/>",
    wstecz: "<path d=\"m12 19-7-7 7-7\"/> <path d=\"M19 12H5\"/>"
  };

  function svg(nazwa) {
    var tresc = RYSUNKI[nazwa];
    if (!tresc) return "";
    return '<svg class="ikona" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + tresc + '</svg>';
  }

  /* Wstawia ikony w elementy z atrybutem data-ikona (statyczne miejsca powloki) */
  function wstaw(korzen) {
    (korzen || document).querySelectorAll("[data-ikona]").forEach(function (el) {
      if (!el.querySelector("svg.ikona")) el.innerHTML = svg(el.getAttribute("data-ikona"));
    });
  }

  global.Ikony = { svg: svg, wstaw: wstaw, ma: function (nazwa) { return !!RYSUNKI[nazwa]; } };
  /* Skrypt jest na koncu strony, wiec statyczne miejsca na ikony juz istnieja */
  if (global.document) wstaw(global.document);
})(window);
