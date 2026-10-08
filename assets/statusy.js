/* ============================================================================
   Statusy wniosku: jedno zrodlo prawdy dla list, karty wniosku i Bazy danych.

   Wniosek ma trzy kolumny statusu (skladanie, decyzja, rozliczenie) i etap
   procesu 1-10 (D-146). Zmieniaja sie zawsze razem: kazda akcja na wniosku
   (zmiana statusu w tabeli, przycisk na karcie, operacja masowa) daje pelny
   zestaw kolumn, dzieki czemu kolor wiersza, etap i przebieg sie nie rozjezdzaja.
   Uklad etapow odpowiada danym z Excela klienta: niezlozony 3, zlozony 5,
   negatywna 6, pozytywna 7, zafakturowany 9, rozliczony 10.

   API:  Statusy.LISTA                statusy do filtrow i edycji w komorce
         Statusy.wartosc(w)           status wniosku z adaptera DB (statusSkl, statusDec)
         Statusy.klasaWiersza(w)      kolor wiersza wg palety z Excela (D-01, D-158)
         Statusy.znacznik(w), znacznikRozliczenia(w)   znaczniki HTML do tabel
         Statusy.przedZlozeniem(w)    Niezlozony albo NW
         Statusy.wnioskiPoKlientach(wnioski)    { idKlienta: [wnioski] }
         Statusy.patch(w, akcja, dzis)          kolumny do zapisu dla akcji, StatusyError przy zlej akcji
         Statusy.zmien(w, akcja, kto)           zapis akcji z wpisem do przebiegu wniosku
         Statusy.akcjaDlaStatusu(status)        akcja odpowiadajaca wartosci z listy LISTA
         Statusy.ETAPY                nazwy etapow 1-10
   ============================================================================ */

(function (global) {
  "use strict";

  var LISTA = ["Niezłożony", "NW", "Czekamy", "Pozytywna", "Negatywna", "Rezygnacja"];
  var PRZED_ZLOZENIEM = ["Niezłożony", "NW"];
  var BRAK_ROZLICZENIA = "Brak";

  var ETAPY = ["", "Przekazanie klienta", "Akceptacja formularza", "Przygotowanie wniosku", "Złożenie wniosku",
               "Oczekiwanie na decyzję", "Decyzja urzędu", "Ustalenie terminu szkolenia", "Realizacja szkolenia",
               "Rozliczenie", "Proces zakończony"];

  /* Akcja -> kolumny wniosku z tabeli akcje_statusow (D-296): slownik dozwolonych przejsc w bazie,
     nie stala w kodzie. status_skladania NULL = zostaw, ustawia_decyzje 0 = zostaw decyzje,
     rozliczenie_start = Oczekuje, gdy wniosek jeszcze nie byl rozliczany. */
  function akcje() {
    var m = {};
    global.Store.query("SELECT * FROM akcje_statusow ORDER BY kolejnosc").forEach(function (r) {
      m[r.akcja] = { etykieta: r.etykieta, skl: r.status_skladania, dec: r.status_decyzji, ustawiaDec: r.ustawia_decyzje === 1,
                     rozl: r.rozliczenie_start ? "start" : r.status_rozliczenia, etap: r.etap,
                     tylkoPozytywna: r.tylko_pozytywna === 1, dataWniosku: r.data_wniosku === 1 };
    });
    return m;
  }

  var AKCJA_DLA_STATUSU = { "Niezłożony": "niezlozony", NW: "nw", Czekamy: "zlozony", Pozytywna: "pozytywna",
                            Negatywna: "negatywna", Rezygnacja: "rezygnacja" };

  function StatusyError(kod, komunikat) {
    this.name = "StatusyError";
    this.kod = kod;
    this.message = komunikat;
  }
  StatusyError.prototype = Object.create(Error.prototype);
  StatusyError.prototype.constructor = StatusyError;

  function wartosc(w) {
    if (w.statusDec === "Pozytywna") return "Pozytywna";
    if (w.statusDec === "Negatywna") return "Negatywna";
    if (w.statusSkl === "Złożony") return "Czekamy";
    if (w.statusSkl === "NW") return "NW";
    if (w.statusSkl === "Rezygnacja") return "Rezygnacja";
    return "Niezłożony";
  }

  /* Rozliczone ma pierwszenstwo, nastepnie decyzja, potem rezygnacja i "czekamy" */
  function klasaWiersza(w) {
    if (w.rozliczenie === "Rozliczone") return "row-set";
    if (w.statusDec === "Pozytywna") return "row-pos";
    if (w.statusDec === "Negatywna") return "row-neg";
    if (w.statusSkl === "Rezygnacja") return "row-rez";
    if (w.statusSkl === "Złożony") return "row-czekamy";
    return "";
  }

  /* Znaczniki do tabel. Tresc to stale nazwy statusow, nie dane z formularzy. */
  var KLASA_ZNACZNIKA = { Pozytywna: "st-poz", Negatywna: "st-neg", Czekamy: "st-czekamy", NW: "warn",
                          Rezygnacja: "st-rez", "Niezłożony": "mute" };
  function znacznik(w) {
    var v = wartosc(w);
    return '<span class="tag ' + KLASA_ZNACZNIKA[v] + ' dot">' + v + '</span>';
  }
  function znacznikRozliczenia(w) {
    if (w.rozliczenie === "Rozliczone") return '<span class="tag st-set">Rozliczone</span>';
    if (w.rozliczenie === "Zafakturowany") return '<span class="tag info">Zafakturowany</span>';
    if (w.rozliczenie === "Oczekuje") return '<span class="tag mute">Oczekuje</span>';
    return '<span class="muted small">&mdash;</span>';
  }

  function przedZlozeniem(w) { return PRZED_ZLOZENIEM.indexOf(wartosc(w)) >= 0; }

  /* { idKlienta: [wnioski] } ze wszystkich lat (D-128) */
  function wnioskiPoKlientach(wnioski) {
    var mapa = {};
    wnioski.forEach(function (w) { (mapa[w.klient] = mapa[w.klient] || []).push(w); });
    return mapa;
  }

  function patch(w, akcja, dzis) {
    var a = akcje()[akcja];
    if (!a) throw new StatusyError("nieznana_akcja", "Nieznana akcja na wniosku: " + akcja);
    if (a.tylkoPozytywna && w.statusDec !== "Pozytywna") {
      throw new StatusyError("wymaga_pozytywnej", "Rozliczenie jest możliwe dopiero po decyzji pozytywnej.");
    }
    var p = { etap: a.etap };
    if (a.skl) p.status_skladania = a.skl;
    if (a.ustawiaDec) p.status_decyzji = a.dec;
    if (a.rozl === "start") {
      /* Wniosek juz pozytywny zostaje na swoim etapie i rozliczeniu, niczego nie cofamy */
      var bylPozytywny = w.statusDec === "Pozytywna";
      p.status_finansowy = bylPozytywny && w.rozliczenie && w.rozliczenie !== BRAK_ROZLICZENIA ? w.rozliczenie : "Oczekuje";
      if (bylPozytywny && w.etap > p.etap) p.etap = w.etap;
    } else if (a.rozl) {
      p.status_finansowy = a.rozl;
    }
    if (a.dataWniosku && !w.dataWniosku) p.data_wniosku = dzis;
    return p;
  }

  /* Zapis akcji: kolumny wniosku i, gdy zmienia sie etap, wpis do przebiegu wniosku
     (widac go na karcie). kto = { czas: "RRRR-MM-DD GG:MM", uzytkownik: id konta }.
     Wpis do rejestru aktywnosci robi ekran, bo tam jest opis zmiany. */
  function zmien(w, akcja, kto) {
    var p = patch(w, akcja, kto.czas.slice(0, 10));
    p.data_aktualizacji = kto.czas.slice(0, 10);
    global.Store.update("wnioski", w.id, p);
    if (p.etap !== w.etap) {
      global.Store.insert("przebieg_wniosku", {
        wniosek_id: w.id, instytucja_id: w.is, rodzaj: "automatyczny", czas: kto.czas, etap_z: w.etap, etap_do: p.etap,
        komentarz: akcje()[akcja].etykieta, uzytkownik_id: kto.uzytkownik
      }, "PRZ-");
    }
    return p;
  }

  function akcjaDlaStatusu(status) {
    var akcja = AKCJA_DLA_STATUSU[status];
    if (!akcja) throw new StatusyError("nieznany_status", "Nieznany status wniosku: " + status);
    return akcja;
  }

  global.Statusy = {
    LISTA: LISTA, ETAPY: ETAPY, PRZED_ZLOZENIEM: PRZED_ZLOZENIEM,
    wartosc: wartosc, klasaWiersza: klasaWiersza, znacznik: znacznik, znacznikRozliczenia: znacznikRozliczenia,
    przedZlozeniem: przedZlozeniem,
    wnioskiPoKlientach: wnioskiPoKlientach, patch: patch, zmien: zmien, akcjaDlaStatusu: akcjaDlaStatusu,
    StatusyError: StatusyError
  };
  /* Akcje czytane z bazy przy kazdym uzyciu, zeby zmiana slownika dzialala od razu */
  Object.defineProperty(global.Statusy, "AKCJE", { get: akcje, enumerable: true });
})(window);
