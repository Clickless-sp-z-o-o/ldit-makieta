/* ============================================================================
   Bezpieczne wstawianie danych do HTML.

   Kazdy tekst z bazy (nazwa firmy, miejsce szkolenia, opis zgloszenia, dane
   z publicznego formularza) moze zawierac znaczniki. Wstawiony przez innerHTML
   bez zamiany wykonalby sie u kazdego, kto otworzy ekran, takze u innej
   instytucji albo u administratora LDIT (XSS). Dlatego dane wstawiamy
   wylacznie przez esc() albo przez textContent.

   API:  esc(tekst)        tekst bezpieczny w tresci i w atrybucie w cudzyslowie
         escJs(tekst)      tekst bezpieczny w literale '...' wewnatrz onclick="..."
   ============================================================================ */

(function (global) {
  "use strict";

  var ZAMIANY = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

  function esc(tekst) {
    if (tekst === null || tekst === undefined) return "";
    return String(tekst).replace(/[&<>"'`]/g, function (z) { return ZAMIANY[z]; });
  }

  /* Do onclick="fn('...')": najpierw ucieczka JS, potem HTML, bo atrybut
     jest dekodowany przez parser HTML zanim trafi do JavaScriptu. */
  function escJs(tekst) {
    var js = String(tekst === null || tekst === undefined ? "" : tekst)
      .replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, "\\n").replace(/</g, "\\x3c");
    return esc(js);
  }

  global.esc = esc;
  global.escJs = escJs;
})(window);
