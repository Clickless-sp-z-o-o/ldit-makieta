/* ============================================================================
   Silnik bazy danych makiety: prawdziwe SQLite w przegladarce (sql.js).

   Struktura lezy w makieta/db/schema.sql, reguly wyliczen w views.sql, dane
   startowe w seed.sql. Do przegladarki trafia gotowe binarium (seed-db.js),
   zeby start byl natychmiastowy.

   Makieta dziala z dwukliku na index.html, bo binarium WebAssembly jest
   wklejone jako base64 (db/sql-wasm-data.js), a nie pobierane przez fetch,
   ktory na protokole file:// jest blokowany.

   Dwa tryby przechowywania stanu roboczego:
     przegladarka  makieta z dwukliku (file://): baza w localStorage
     serwer        makieta z node tools/serwer.mjs (http://): baza w pliku
                   makieta/db/kfs.sqlite na dysku, wspolna dla wszystkich kart
   KFS.tryb mowi, ktory dziala. KFS.reset() wraca do bazy startowej.

   API:  KFS.gotowa            Promise, spelniona gdy baza jest zaladowana
         KFS.db                obiekt bazy sql.js (po spelnieniu gotowa)
         KFS.zapisz()          zapis stanu do localStorage (z opoznieniem)
         KFS.zapiszTeraz()     zapis natychmiast, Promise; przed przejsciem na inna strone
         KFS.reset()           powrot do bazy startowej
         KFS.pobierzPlik()     pobranie pliku .sqlite na dysk
         KFS.tylkoOdczyt       true w powloce (index.html): zapis jest pomijany, bo jej
                               kopia bazy jest z chwili logowania (D-222)
   ============================================================================ */

(function (global) {
  "use strict";

  var KLUCZ = "kfs_sqlite_v5";
  /* Podpis bazy startowej, z ktorej powstal zapisany stan. Nowa wersja makiety
     (inny schemat albo dane startowe) ma inny podpis, wiec stara kopia z
     przegladarki jest odrzucana, zamiast wywracac strony brakiem tabel. */
  var KLUCZ_PODPISU = "kfs_sqlite_podpis";
  var OPOZNIENIE_ZAPISU = 250;

  function base64NaBajty(b64) {
    var binarny = global.atob(b64);
    var bajty = new Uint8Array(binarny.length);
    for (var i = 0; i < binarny.length; i++) bajty[i] = binarny.charCodeAt(i);
    return bajty;
  }

  function bajtyNaBase64(bajty) {
    var kawalki = [], rozmiar = 0x8000;
    for (var i = 0; i < bajty.length; i += rozmiar) {
      kawalki.push(String.fromCharCode.apply(null, bajty.subarray(i, i + rozmiar)));
    }
    return global.btoa(kawalki.join(""));
  }

  /* FNV-1a z tekstu bazy startowej: szybki i zmienia sie przy kazdej przebudowie */
  function podpisBazyStartowej() {
    var tekst = global.KFS_SEED_DB || "", h = 0x811c9dc5;
    for (var i = 0; i < tekst.length; i++) {
      h ^= tekst.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return tekst.length + "-" + h.toString(16);
  }

  function wczytajZapisany() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KLUCZ);
      if (raw && global.localStorage.getItem(KLUCZ_PODPISU) !== podpisBazyStartowej()) {
        global.localStorage.removeItem(KLUCZ);
        return null;
      }
      return raw ? base64NaBajty(raw) : null;
    } catch (e) {
      /* localStorage bywa niedostepny na file:// w trybie prywatnym */
      return null;
    }
  }

  var ADRES_API = "/api/baza";
  var protokol = global.location && global.location.protocol;
  var zSerwera = protokol === "http:" || protokol === "https:";

  var KFS = {
    db: null,
    KLUCZ: KLUCZ,
    zapisany: false,
    tryb: zSerwera ? "serwer" : "przegladarka"
  };

  var timerZapisu = null;
  var wersjaSerwera = null;
  var zapisWToku = false, zapisCzeka = false;

  function zglos(nazwa, komunikat) {
    if (global.dispatchEvent && global.CustomEvent) {
      global.dispatchEvent(new global.CustomEvent(nazwa, { detail: { komunikat: komunikat } }));
    }
  }

  function zapiszLokalnie() {
    try {
      global.localStorage.setItem(KLUCZ, bajtyNaBase64(KFS.db.export()));
      global.localStorage.setItem(KLUCZ_PODPISU, podpisBazyStartowej());
      KFS.zapisany = true;
    } catch (e) {
      /* Przekroczony limit albo brak localStorage: pracujemy w pamieci sesji */
      KFS.zapisany = false;
    }
  }

  /* Jeden zapis naraz; kolejny czeka i wysyla najnowszy stan. Zwraca obietnice,
     ktora konczy sie dopiero po ostatnim zapisie z kolejki (potrzebne zapiszTeraz). */
  var kolejkaZapisu = Promise.resolve();
  function zapiszNaSerwerze() {
    if (zapisWToku) { zapisCzeka = true; return kolejkaZapisu; }
    zapisWToku = true;
    kolejkaZapisu = global.fetch(ADRES_API, {
      method: "PUT", body: KFS.db.export(),
      headers: { "Content-Type": "application/x-sqlite3", "X-Kfs-Wersja": String(wersjaSerwera) }
    }).then(function (r) {
      return r.json().then(function (j) {
        if (r.status === 409) { KFS.zapisany = false; zglos("kfs:konflikt", j.error.message); return; }
        if (!r.ok) { KFS.zapisany = false; zglos("kfs:blad-zapisu", j.error ? j.error.message : "Blad zapisu"); return; }
        wersjaSerwera = j.data.wersja;
        KFS.zapisany = true;
      });
    }).catch(function () {
      KFS.zapisany = false;
      zglos("kfs:blad-zapisu", "Serwer bazy nie odpowiada, zmiany nie zostaly zapisane na dysku.");
    }).then(function () {
      zapisWToku = false;
      if (zapisCzeka) { zapisCzeka = false; return zapiszNaSerwerze(); }
    });
    return kolejkaZapisu;
  }

  KFS.tylkoOdczyt = false;

  KFS.zapisz = function () {
    if (KFS.tylkoOdczyt) return;
    if (timerZapisu) global.clearTimeout(timerZapisu);
    timerZapisu = global.setTimeout(function () {
      timerZapisu = null;
      if (!KFS.db) return;
      if (KFS.tryb === "serwer") zapiszNaSerwerze();
      else zapiszLokalnie();
    }, OPOZNIENIE_ZAPISU);
  };

  /* Zapis natychmiast, bez opoznienia. Wolane przed przejsciem na inna strone
     (logowanie, wylogowanie): opozniony zapis ginie razem ze strona, a z nim sesja. */
  KFS.zapiszTeraz = function () {
    if (KFS.tylkoOdczyt) return Promise.resolve();
    if (timerZapisu) { global.clearTimeout(timerZapisu); timerZapisu = null; }
    if (!KFS.db) return Promise.resolve();
    if (KFS.tryb === "serwer") return zapiszNaSerwerze();
    zapiszLokalnie();
    return Promise.resolve();
  };

  KFS.reset = function () {
    if (KFS.tryb === "serwer") {
      global.fetch(ADRES_API, { method: "DELETE" }).then(function () { global.location.reload(); });
      return;
    }
    try { global.localStorage.removeItem(KLUCZ); } catch (e) { /* brak localStorage */ }
    global.location.reload();
  };

  KFS.pobierzPlik = function (nazwa) {
    var blob = new Blob([KFS.db.export()], { type: "application/x-sqlite3" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nazwa || "kfs.sqlite";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  };

  KFS.wczytajPlik = function (bajty) {
    KFS.db = new global.SQL.Database(new Uint8Array(bajty));
    KFS.zapisz();
  };

  KFS.gotowa = (function () {
    if (!global.initSqlJs) {
      return Promise.reject(new Error("Brak sql.js. Dolacz db/sql-wasm.js przed assets/sqlite.js"));
    }
    if (!global.SQL_WASM_BASE64) {
      return Promise.reject(new Error("Brak binarium WASM. Dolacz db/sql-wasm-data.js"));
    }
    return global.initSqlJs({ wasmBinary: base64NaBajty(global.SQL_WASM_BASE64) })
      .then(function (SQL) {
        global.SQL = SQL;
        if (KFS.tryb !== "serwer") return otworzLokalnie(SQL);
        return global.fetch(ADRES_API, { cache: "no-store" }).then(function (r) {
          if (!r.ok) throw new Error("Serwer bazy odpowiedzial " + r.status);
          wersjaSerwera = r.headers.get("X-Kfs-Wersja");
          return r.arrayBuffer();
        }).then(function (bufor) {
          KFS.db = new SQL.Database(new Uint8Array(bufor));
          KFS.zapisany = true;
          KFS.db.run("PRAGMA foreign_keys = ON");
          return KFS.db;
        }, function () {
          /* Strona z http, ale bez naszego serwera: wracamy do pamieci przegladarki */
          KFS.tryb = "przegladarka";
          return otworzLokalnie(SQL);
        });
      });
  })();

  function otworzLokalnie(SQL) {
    var zapisany = wczytajZapisany();
    if (zapisany) {
      KFS.db = new SQL.Database(zapisany);
      KFS.zapisany = true;
    } else {
      if (!global.KFS_SEED_DB) throw new Error("Brak bazy startowej. Dolacz db/seed-db.js");
      KFS.db = new SQL.Database(base64NaBajty(global.KFS_SEED_DB));
    }
    KFS.db.run("PRAGMA foreign_keys = ON");
    return KFS.db;
  }

  global.KFS = KFS;
})(window);
