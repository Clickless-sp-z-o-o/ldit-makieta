/* ============================================================================
   Adapter widoku, czesc naborow i urzedow pracy. Wydzielone z db.js, ktory
   sklada z tego window.DB.

   Nabory maja dwa zrodla, ogloszone i prognozowane (D-271); liczbe dni liczy
   widok v_nabory. Urzad wystepuje raz, z najblizszym naborem ogloszonym
   i prognozowanym z widoku v_urzedy_nabory (D-272), wiec ekrany nie wybieraja
   naboru urzedu same.
   ============================================================================ */

(function (global) {
  "use strict";

  /* Stan naboru urzedu do list i filtrow: trwajacy albo oczekujacy nabor ogloszony,
     potem prognoza, na koncu ostatni zakonczony. null = brak informacji. */
  function stanUrzedu(u) {
    if (u.ogloszony_status === "trwa" || u.ogloszony_status === "oczekuje") return u.ogloszony_status;
    if (u.prognozowany_id) return "prognozowany";
    return u.ogloszony_status || null;
  }

  function pupyView(S) {
    return S.query("SELECT * FROM v_urzedy_nabory ORDER BY id").map(function (u) {
      return {
        id: u.id, nazwa: u.nazwa, woj: u.wojewodztwo, powiat: u.powiat, aliasy: JSON.parse(u.aliasy || "[]"),
        stan: stanUrzedu(u),
        nabor: u.ogloszony_id ? { id: u.ogloszony_id, status: u.ogloszony_status, od: u.ogloszony_data_od, do: u.ogloszony_data_do,
                                  dni: u.ogloszony_liczba_dni, srodki: u.ogloszony_srodki, link: u.ogloszony_link,
                                  podsumowanie: u.ogloszony_podsumowanie } : null,
        prognoza: u.prognozowany_id ? { id: u.prognozowany_id, od: u.prognozowany_data_od, do: u.prognozowany_data_do,
                                        opis: u.prognozowany_opis } : null
      };
    });
  }

  function naboryView(S) {
    return S.query("SELECT * FROM v_nabory").map(function (n) {
      return {
        id: n.id, pupId: n.pup_id, pup: n.urzad, woj: n.wojewodztwo, powiat: n.powiat,
        rodzaj: n.rodzaj, status: n.status, od: n.data_od, do: n.data_do, dni: n.liczba_dni,
        prognoza: n.prognoza_opis, deficytWoj: n.deficyt_wojewodzki, deficytPow: n.deficyt_powiatowy,
        weryfikacja: n.data_weryfikacji, srodki: n.srodki, link: n.link, podsumowanie: n.podsumowanie, zrodlo: n.zrodlo_id
      };
    });
  }

  global.DBNabory = { pupyView: pupyView, naboryView: naboryView, stanUrzedu: stanUrzedu };
})(window);
