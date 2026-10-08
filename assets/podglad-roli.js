/* ============================================================================
   Podglad roli i konta (D-268): administrator sprawdza, co zobaczy konto lub
   rola, zanim je udostepni. Tylko odczyt, nikt sie nie loguje.

   Obliczenia biora te same zrodla co aplikacja: nadania z role_funkcje przez
   Funkcje.pasuje (jak Auth.poziom i Auth.moze), katalog z tabel moduly i
   funkcje, zakres z v_zakres_uzytkownika i instytucja klienta (jak
   Auth.instytucje, Auth.klienciWZakresie i Auth.handlowiec).

   API:  PodgladRoli.opiszKonto(login)  {ok, konto, menu, pola, zakres} albo {ok:false, blad}
         PodgladRoli.opiszRole(rolaId)  {ok, rola, menu, pola} albo {ok:false, blad}
   ============================================================================ */

(function (global) {
  "use strict";

  var S = global.Store;
  var F = global.Funkcje;
  if (!S || !F) throw new Error("Brak Store albo Funkcje. Dolacz podglad-roli.js po funkcje.js");

  var TYP_INSTYTUCJI = "instytucja";
  var FEATURE_CALA_INSTYTUCJA = "zakres.cala_instytucja";

  function poziomModulu(nadania, modulId) {
    if (F.pasuje(nadania, modulId + ".manage")) return "edycja";
    return F.pasuje(nadania, modulId + ".view") ? "podglad" : "brak";
  }

  /* Moduly w kolejnosci menu, z poziomem dostepu roli (tak jak Auth.moduly) */
  function menuRoli(nadania) {
    return S.query("SELECT id, nazwa, plik, grupa FROM moduly ORDER BY kolejnosc").map(function (m) {
      return { id: m.id, nazwa: m.nazwa, plik: m.plik, grupa: m.grupa, poziom: poziomModulu(nadania, m.id) };
    }).filter(function (m) { return m.poziom !== "brak"; });
  }

  /* Features pol z katalogu, z informacja czy rola je ma */
  function poleRoli(nadania) {
    return S.query("SELECT id, opis FROM funkcje WHERE rodzaj = 'pole' ORDER BY id").map(function (f) {
      return { id: f.id, opis: f.opis, ma: F.pasuje(nadania, f.id) };
    });
  }

  function znajdzRole(rolaId) {
    return S.one("SELECT id, nazwa, opis, typ FROM role WHERE id = ?", [rolaId]);
  }

  function opiszRole(rolaId) {
    var rola = znajdzRole(rolaId);
    if (!rola) return { ok: false, blad: "Nie ma roli: " + rolaId };
    var nadania = F.nadania(rolaId);
    return { ok: true, rola: rola, menu: menuRoli(nadania), pola: poleRoli(nadania) };
  }

  function instytucjeKonta(u) {
    if (u.wszystkie_instytucje) return null;
    return S.query("SELECT i.id, i.nazwa FROM instytucje i WHERE i.id IN " +
      "(SELECT instytucja_id FROM v_zakres_uzytkownika WHERE uzytkownik_id = ?) ORDER BY i.id", [u.id]);
  }

  function placeholdery(lista) {
    return lista.map(function () { return "?"; }).join(", ");
  }

  function policz(sql, params) {
    return S.one(sql, params).n;
  }

  function policzKlientow(instytucje, handlowiec) {
    if (instytucje === null) return policz("SELECT COUNT(*) AS n FROM klienci", []);
    if (!instytucje.length) return 0;
    var ids = instytucje.map(function (i) { return i.id; });
    return policz("SELECT COUNT(*) AS n FROM klienci WHERE instytucja_id IN (" +
      placeholdery(ids) + ")" + (handlowiec ? " AND handlowiec_id = ?" : ""),
      handlowiec ? ids.concat([handlowiec]) : ids);
  }

  function policzWnioski(instytucje, handlowiec) {
    var warunki = ["usuniety = 0"], params = [];
    if (instytucje !== null) {
      if (!instytucje.length) return 0;
      warunki.push("instytucja_id IN (" + placeholdery(instytucje) + ")");
      params = instytucje.map(function (i) { return i.id; });
    }
    if (handlowiec) { warunki.push("handlowiec_id = ?"); params.push(handlowiec); }
    return policz("SELECT COUNT(*) AS n FROM wnioski WHERE " + warunki.join(" AND "), params);
  }

  /* Handlowiec: konto instytucji bez feature zakres.cala_instytucja (D-210) */
  function czyHandlowiec(rola, nadania) {
    return rola.typ === TYP_INSTYTUCJI && !F.pasuje(nadania, FEATURE_CALA_INSTYTUCJA);
  }

  function zakresKonta(u, rola, nadania) {
    var instytucje = instytucjeKonta(u);
    var handlowiec = czyHandlowiec(rola, nadania);
    var kluczHandlowca = handlowiec ? u.id : null;
    return {
      wszystkieInstytucje: instytucje === null,
      instytucje: instytucje,
      handlowiec: handlowiec,
      klienci: policzKlientow(instytucje, kluczHandlowca),
      wnioski: policzWnioski(instytucje, kluczHandlowca)
    };
  }

  function opiszKonto(login) {
    var u = S.one("SELECT id, login, imie_nazwisko, rola_id, instytucja_id, wszystkie_instytucje, zablokowane " +
      "FROM uzytkownicy WHERE login = ?", [login]);
    if (!u) return { ok: false, blad: "Nie ma konta: " + login };
    var opis = opiszRole(u.rola_id);
    if (!opis.ok) return opis;
    var nadania = F.nadania(u.rola_id);
    return {
      ok: true,
      konto: { login: u.login, imie: u.imie_nazwisko, zablokowane: !!u.zablokowane },
      rola: opis.rola, menu: opis.menu, pola: opis.pola,
      zakres: zakresKonta(u, opis.rola, nadania)
    };
  }

  global.PodgladRoli = { opiszKonto: opiszKonto, opiszRole: opiszRole };
})(window);
