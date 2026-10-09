/* ============================================================================
   Zmiany katalogu szkolen od instytucji (D-320). Instytucja dodaje, zmienia
   i wycofuje szkolenia oraz ich cennik (D-277), ale kazda operacja to propozycja
   w propozycje_zmian (tabela katalog_szkolen, operacja zmiana / dodanie / usuniecie),
   ktora LDIT zatwierdza albo odrzuca (D-204, D-224). Przed zatwierdzeniem katalog
   sie nie zmienia. Cennik jedzie w zmianach jako pole "ceny" (lista kwot).
   Uprawnienia sprawdza straznik zapisow (assets/straznik-wlasnosc.js).

   API:  AkceptacjeKatalog.POLA                         pola szkolenia z etykietami
         AkceptacjeKatalog.zglos(dane, kto)             dane: { operacja, instytucjaId, szkolenieId,
                                                         nowe: {pola, ceny: [kwoty]}, uzasadnienie } -> wiersz propozycji
         AkceptacjeKatalog.zatwierdz(p, kto)            stosuje zatwierdzona propozycje (wola akceptacje.js)
         AkceptacjeKatalog.ceny(szkolenieId)            obecny cennik (kwoty)
         AkceptacjeKatalog.oczekujaca(szkolenieId)      oczekujaca propozycja tego szkolenia albo null
   ============================================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var W = global.Akceptacje.wspolne;
  var POLA = {
    nazwa: "Nazwa", liczba_godzin: "Liczba godzin", liczba_dni: "Liczba dni", tryb: "Tryb",
    plan_szkolenia: "Program szkolenia", cel_szkolenia: "Cel szkolenia", grupa_docelowa: "Grupa docelowa",
    efekty_uczenia: "Efekty uczenia się", wymagania: "Wymagania wstępne", forma_zaliczenia: "Forma zaliczenia i certyfikat",
    ceny: "Cennik"
  };
  var LICZBOWE = ["liczba_godzin", "liczba_dni"];
  var OPERACJE = ["zmiana", "dodanie", "usuniecie"];

  function ceny(szkolenieId) {
    return S.query("SELECT cena FROM ceny_szkolen WHERE szkolenie_id = ? ORDER BY cena", [szkolenieId]).map(function (c) { return Number(c.cena); });
  }

  function oczekujaca(szkolenieId) {
    return S.one("SELECT * FROM propozycje_zmian WHERE tabela = 'katalog_szkolen' AND rekord_id = ? AND status = 'oczekuje'", [szkolenieId]) || null;
  }

  function wartosc(k, v) {
    if (v === "" || v == null) return null;
    if (LICZBOWE.indexOf(k) >= 0) return parseInt(v, 10);
    return String(v).trim();
  }

  function czystyCennik(lista) {
    var kwoty = (lista || []).map(Number);
    if (kwoty.some(function (c) { return !isFinite(c) || c < 0; })) W.blad("walidacja", "Cennik: kwoty muszą być nieujemne.");
    return kwoty.filter(function (c, i) { return kwoty.indexOf(c) === i; }).sort(function (a, b) { return a - b; });
  }

  /* Pola z wartosciami do porownania; ceny jako tekst listy, zeby roznice byly widoczne */
  function rozniceZmiany(obecny, nowe) {
    var zmiany = {};
    Object.keys(POLA).forEach(function (k) {
      if (!(k in nowe)) return;
      if (k === "ceny") {
        var przed = ceny(obecny.id), po = czystyCennik(nowe.ceny);
        if (przed.join(";") !== po.join(";")) zmiany.ceny = { przed: przed, po: po };
        return;
      }
      var p = wartosc(k, nowe[k]);
      if (String(obecny[k] == null ? "" : obecny[k]) !== String(p == null ? "" : p)) zmiany[k] = { przed: obecny[k], po: p };
    });
    return zmiany;
  }

  function wszystkiePola(wiersz, kierunek) {
    var zmiany = {};
    Object.keys(POLA).forEach(function (k) {
      var v = k === "ceny" ? (kierunek === "po" ? czystyCennik(wiersz.ceny) : ceny(wiersz.id)) : wartosc(k, wiersz[k]);
      if (v == null || (Array.isArray(v) && !v.length)) return;
      zmiany[k] = kierunek === "po" ? { przed: null, po: v } : { przed: v, po: null };
    });
    return zmiany;
  }

  /* Szkolenie uzyte we wnioskach albo terminach nie znika z katalogu: wnioski i terminy sie do niego odwoluja */
  function wUzyciu(szkolenieId) {
    var n = S.one("SELECT (SELECT COUNT(*) FROM wniosek_szkolenia WHERE szkolenie_id = ?) + (SELECT COUNT(*) FROM terminy WHERE szkolenie_id = ?) + " +
                  "(SELECT COUNT(*) FROM wnioski WHERE szkolenie_glowne_id = ?) AS n", [szkolenieId, szkolenieId, szkolenieId]);
    return n ? n.n : 0;
  }

  function zmianyDlaOperacji(d, szkolenie) {
    if (d.operacja === "dodanie") {
      if (!d.nowe || !String(d.nowe.nazwa || "").trim()) W.blad("brak_nazwy", "Podaj nazwę szkolenia.");
      return wszystkiePola(d.nowe, "po");
    }
    if (d.operacja === "usuniecie") {
      if (wUzyciu(szkolenie.id)) W.blad("w_uzyciu", "Szkolenie jest we wnioskach albo terminach, nie można go usunąć z katalogu.");
      return wszystkiePola(szkolenie, "przed");
    }
    if ("nazwa" in d.nowe && !String(d.nowe.nazwa || "").trim()) W.blad("brak_nazwy", "Nazwa szkolenia nie może być pusta.");
    return rozniceZmiany(szkolenie, d.nowe || {});
  }

  function zglos(d, kto) {
    if (OPERACJE.indexOf(d.operacja) < 0) W.blad("zla_operacja", "Nieznany rodzaj zmiany katalogu.");
    var szkolenie = null;
    if (d.operacja !== "dodanie") {
      szkolenie = S.find("katalog_szkolen", d.szkolenieId);
      if (!szkolenie) W.blad("nie_ma", "Nie znaleziono szkolenia " + d.szkolenieId + ".");
      if (oczekujaca(szkolenie.id)) W.blad("czeka", "Na to szkolenie czeka już zmiana do akceptacji LDIT.");
    }
    var zmiany = zmianyDlaOperacji(d, szkolenie);
    if (!Object.keys(zmiany).length) W.blad("brak_zmian", "Nic się nie zmieniło, nie ma czego zgłaszać.");
    var nowy = S.insert("propozycje_zmian", {
      instytucja_id: szkolenie ? szkolenie.instytucja_id : d.instytucjaId, tabela: "katalog_szkolen", operacja: d.operacja,
      rekord_id: szkolenie ? szkolenie.id : null, zmiany: JSON.stringify(zmiany), uzasadnienie: d.uzasadnienie || null,
      zglosil_id: kto.uzytkownik, zgloszono: kto.czas, status: "oczekuje"
    }, "PZ-");
    W.doRejestru(kto, "Zgłoszenie zmiany katalogu", szkolenie ? szkolenie.id : nowy.id, d.operacja + ": " + Object.keys(zmiany).join(", "), null, "do akceptacji " + nowy.id);
    return nowy;
  }

  /* Cennik po zatwierdzeniu: znikaja kwoty spoza listy, dochodza nowe jako ceny katalogowe */
  function ustawCeny(szkolenieId, instytucjaId, lista, kto) {
    S.query("SELECT id, cena FROM ceny_szkolen WHERE szkolenie_id = ?", [szkolenieId]).forEach(function (c) {
      if (lista.indexOf(Number(c.cena)) < 0) S.remove("ceny_szkolen", c.id);
    });
    var obecne = ceny(szkolenieId);
    lista.forEach(function (c) {
      if (obecne.indexOf(c) < 0) S.insert("ceny_szkolen", { szkolenie_id: szkolenieId, instytucja_id: instytucjaId, cena: c, zrodlo: "katalog",
                                                            dodano: kto.czas.slice(0, 10), dodal_id: kto.uzytkownik }, "CS-");
    });
  }

  function zatwierdz(p, kto) {
    var zmiany = JSON.parse(p.zmiany || "{}");
    var patch = {};
    Object.keys(zmiany).forEach(function (k) { if (k !== "ceny") patch[k] = zmiany[k].po; });
    if (p.operacja === "usuniecie") {
      ustawCeny(p.rekord_id, p.instytucja_id, [], kto);
      S.remove("katalog_szkolen", p.rekord_id);
      W.doRejestru(kto, "Zatwierdzenie zmiany katalogu", p.rekord_id, "Szkolenie", zmiany.nazwa ? zmiany.nazwa.przed : p.rekord_id, "usunięte z katalogu");
      return p.rekord_id;
    }
    var id = p.rekord_id;
    patch.zaktualizowano = kto.czas.slice(0, 10);
    if (p.operacja === "dodanie") id = S.insert("katalog_szkolen", Object.assign({ instytucja_id: p.instytucja_id }, patch), "SZ-").id;
    else S.update("katalog_szkolen", id, patch);
    if (zmiany.ceny) ustawCeny(id, p.instytucja_id, zmiany.ceny.po || [], kto);
    Object.keys(zmiany).forEach(function (k) {
      W.doRejestru(kto, "Zatwierdzenie zmiany katalogu", id, POLA[k] || k, zmiany[k].przed, zmiany[k].po);
    });
    return id;
  }

  global.AkceptacjeKatalog = { POLA: POLA, zglos: zglos, zatwierdz: zatwierdz, ceny: ceny, oczekujaca: oczekujaca, wUzyciu: wUzyciu };
})(window);
