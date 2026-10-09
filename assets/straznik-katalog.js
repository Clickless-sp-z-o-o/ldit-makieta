/* ============================================================================
   Strażnik zapisów: katalog szkoleń przez akceptację (D-320). Wydzielone ze straznik.js.

   Propozycja zmiany katalogu (propozycje_zmian, tabela katalog_szkolen) od instytucji:
   tylko konto z zakresem całej instytucji (Administrator IS), nie handlowiec, tylko
   własny katalog i tylko znane pola. Bezpośrednio do katalog_szkolen i ceny_szkolen
   instytucja nie pisze (to sprawdza moduł "inst" w straznik.js).
   Zatwierdzający LDIT bez edycji modułu Instytucje wprowadza wyłącznie to, na co
   czeka propozycja: zmiana i usunięcie tego szkolenia, cennik tego szkolenia, nowe
   szkolenie o nazwie z oczekującej propozycji dodania.

   API:  StraznikKatalog.propozycjaPozwala(dane, odmowa)
         StraznikKatalog.zatwierdzeniePozwala(operacja, tabela, dane, id) -> true, gdy zapis to zatwierdzenie
   ============================================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var POLA = ["nazwa", "liczba_godzin", "liczba_dni", "tryb", "plan_szkolenia", "cel_szkolenia", "grupa_docelowa",
              "efekty_uczenia", "wymagania", "forma_zaliczenia", "ceny"];

  function propozycjaPozwala(dane, odmowa) {
    var Auth = global.Auth, s = Auth.sesja();
    if (s.instytucja_id) {
      if (Auth.handlowiec() || !Auth.moze("zakres.cala_instytucja")) odmowa("brak_uprawnien", "Katalog szkoleń zmienia administrator instytucji.");
      if (dane.instytucja_id !== s.instytucja_id) odmowa("poza_zakresem", "Instytucja zgłasza zmiany tylko własnego katalogu.");
    }
    if (dane.rekord_id) {
      var szk = S.one("SELECT instytucja_id FROM katalog_szkolen WHERE id = ?", [dane.rekord_id]);
      if (!szk || szk.instytucja_id !== dane.instytucja_id) odmowa("poza_zakresem", "To szkolenie należy do innej instytucji.");
    }
    var pola = Object.keys(JSON.parse(dane.zmiany || "{}"));
    if (!pola.length || pola.some(function (k) { return POLA.indexOf(k) < 0; })) odmowa("pole_chronione", "Tych pól katalogu nie można zgłosić.");
  }

  function oczekujace(sql, parametry) {
    return S.query("SELECT * FROM propozycje_zmian WHERE tabela = 'katalog_szkolen' AND status = 'oczekuje' AND " + sql, parametry);
  }

  /* Dla ceny przy usuwaniu znamy tylko id wiersza, wiec szkolenie bierzemy z bazy */
  function szkolenieCeny(dane, id) {
    if (dane && dane.szkolenie_id) return dane.szkolenie_id;
    var r = id ? S.one("SELECT szkolenie_id FROM ceny_szkolen WHERE id = ?", [id]) : null;
    return r ? r.szkolenie_id : null;
  }

  function zatwierdzeniePozwala(operacja, tabela, dane, id) {
    if ((tabela !== "katalog_szkolen" && tabela !== "ceny_szkolen") || !global.Auth.moze("zmiany.zatwierdzanie")) return false;
    if (tabela === "ceny_szkolen") {
      var szk = szkolenieCeny(dane, id);
      var inst = (dane && dane.instytucja_id) || (S.one("SELECT instytucja_id FROM katalog_szkolen WHERE id = ?", [szk]) || {}).instytucja_id;
      return oczekujace("rekord_id = ?", [szk]).length > 0 || oczekujace("operacja = 'dodanie' AND instytucja_id = ?", [inst]).length > 0;
    }
    if (operacja === "insert") {
      return oczekujace("operacja = 'dodanie' AND instytucja_id = ?", [dane.instytucja_id]).some(function (p) {
        var z = JSON.parse(p.zmiany || "{}");
        return z.nazwa && z.nazwa.po === dane.nazwa;
      });
    }
    return oczekujace("rekord_id = ? AND operacja = ?", [id, operacja === "remove" ? "usuniecie" : "zmiana"]).length > 0;
  }

  global.StraznikKatalog = { propozycjaPozwala: propozycjaPozwala, zatwierdzeniePozwala: zatwierdzeniePozwala };
})(window);
