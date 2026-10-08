/* ============================================================================
   Silnik prowizji. Pelny opis i przypadki testowe: docs/07-silnik-prowizji.md.

   Cztery modele z realnych umow:
     A  kumulacja miesieczna, stawka od calosci obrotu okresu
     B  kumulacja roczna (od 1 stycznia), stawka od nadwyzki ponad prog
     C  kumulacja miesieczna, stawka od nadwyzki ponad prog
     D  stala stawka, bez progow
   (zgodnie z docs/07-silnik-prowizji.md, sekcje Model A - D)

   Pulapka implementacyjna modelu A: przekroczenie progu podnosi stawke dla
   CALEGO obrotu okresu, takze dla faktur juz wystawionych. Dlatego pojedyncza
   faktura nie wystarczy, trzeba przeliczyc caly okres, i sluzy do tego liczOkres().

   liczProwizje(warunki, obrotPrzed, kwotaFaktury) -> { kwota, stawka, rozbicie }
   liczOkres(warunki, faktury)                     -> { pozycje, suma, obrot, stawkaEfektywna }
   ============================================================================ */

(function (global) {
  "use strict";

  var STAWKA_DOMYSLNA = 20;

  function posortowaneProgi(warunki) {
    return (warunki.progi || []).slice().sort(function (a, b) { return a.od - b.od; });
  }

  function stawkaDla(progi, suma) {
    var s = progi[0].st;
    for (var i = 0; i < progi.length; i++) if (suma >= progi[i].od) s = progi[i].st;
    return s;
  }

  function bezProgow(warunki) {
    return warunki.sposob === "stala" || !warunki.progi || !warunki.progi.length;
  }

  /* Prowizja od jednej faktury, przy znanym obrocie narastajacym sprzed niej. */
  function liczProwizje(warunki, obrotPrzed, kwotaFaktury) {
    if (bezProgow(warunki)) {
      var stala = warunki.stala != null ? warunki.stala : STAWKA_DOMYSLNA;
      return { kwota: kwotaFaktury * stala / 100, stawka: stala,
               rozbicie: [{ kwota: kwotaFaktury, st: stala }] };
    }

    var progi = posortowaneProgi(warunki);

    /* Model A i B: jedna stawka dla calego obrotu, wyznaczona po jego sumie */
    if (warunki.sposob === "od_calosci") {
      var st = stawkaDla(progi, obrotPrzed + kwotaFaktury);
      return { kwota: kwotaFaktury * st / 100, stawka: st,
               rozbicie: [{ kwota: kwotaFaktury, st: st }] };
    }

    /* Model C: kazdy kawalek obrotu rozliczany stawka swojego progu */
    var pozycja = obrotPrzed, zostalo = kwotaFaktury, suma = 0, rozbicie = [];

    while (zostalo > 0.005) {
      var stawka = stawkaDla(progi, pozycja);
      var nastepny = progi.filter(function (p) { return p.od > pozycja; })[0];
      var doGranicy = nastepny ? Math.min(zostalo, nastepny.od - pozycja) : zostalo;
      suma += doGranicy * stawka / 100;
      rozbicie.push({ kwota: doGranicy, st: stawka });
      pozycja += doGranicy;
      zostalo -= doGranicy;
    }

    /* Faktura korygujaca: kwota ujemna zdejmuje obrot warstwa po warstwie, w dol.
       Bez tego korekta dawalaby zero prowizji zamiast zwrotu, a korekta zlozona
       z oryginalem nie sumowalaby sie do zera. Do ktorego okresu korekta nalezy,
       pozostaje pytaniem otwartym (P-04), ale kwota musi sie zgadzac. */
    while (zostalo < -0.005) {
      var ponizej = progi.filter(function (p) { return p.od < pozycja; });
      var poprzedni = ponizej.length ? ponizej[ponizej.length - 1] : null;
      var dolnaGranica = poprzedni ? poprzedni.od : 0;
      var stawkaDol = poprzedni ? poprzedni.st : progi[0].st;
      var doDolu = Math.max(zostalo, dolnaGranica - pozycja);
      if (doDolu > -0.005) break;           /* obrot zszedl do zera, nie ma co zdejmowac */
      suma += doDolu * stawkaDol / 100;
      rozbicie.push({ kwota: doDolu, st: stawkaDol });
      pozycja += doDolu;
      zostalo -= doDolu;
    }

    return { kwota: suma, stawka: kwotaFaktury ? (suma / kwotaFaktury * 100) : 0, rozbicie: rozbicie };
  }

  /* Rozliczenie calego okresu. Modele A i B wymagaja tej funkcji, bo stawka
     zalezy od sumy obrotu, a nie od kolejnosci wystawiania faktur. */
  function liczOkres(warunki, faktury) {
    var obrot = faktury.reduce(function (s, f) { return s + (f.kwota || 0); }, 0);

    if (bezProgow(warunki)) {
      var stala = warunki.stala != null ? warunki.stala : STAWKA_DOMYSLNA;
      var pozStale = faktury.map(function (f) {
        return { kwota: f.kwota, stawka: stala, prowizja: f.kwota * stala / 100,
                 rozbicie: [{ kwota: f.kwota, st: stala }] };
      });
      return { pozycje: pozStale, suma: pozStale.reduce(function (s, p) { return s + p.prowizja; }, 0),
               obrot: obrot, stawkaEfektywna: stala };
    }

    var progi = posortowaneProgi(warunki);

    if (warunki.sposob === "od_calosci") {
      var st = stawkaDla(progi, obrot);
      var pozCalosc = faktury.map(function (f) {
        return { kwota: f.kwota, stawka: st, prowizja: f.kwota * st / 100,
                 rozbicie: [{ kwota: f.kwota, st: st }] };
      });
      return { pozycje: pozCalosc, suma: pozCalosc.reduce(function (s, p) { return s + p.prowizja; }, 0),
               obrot: obrot, stawkaEfektywna: st };
    }

    var narastajaco = 0;
    var pozycje = faktury.map(function (f) {
      var r = liczProwizje(warunki, narastajaco, f.kwota || 0);
      narastajaco += (f.kwota || 0);
      return { kwota: f.kwota, stawka: r.stawka, prowizja: r.kwota, rozbicie: r.rozbicie };
    });
    var suma = pozycje.reduce(function (s, p) { return s + p.prowizja; }, 0);
    return { pozycje: pozycje, suma: suma, obrot: obrot,
             stawkaEfektywna: obrot ? suma / obrot * 100 : 0 };
  }

  /* ------------------ okresy rozliczeniowe i wersje warunkow ------------------ */

  function ProwizjaError(kod, komunikat) {
    this.name = "ProwizjaError"; this.kod = kod; this.message = komunikat;
  }
  ProwizjaError.prototype = Object.create(Error.prototype);
  ProwizjaError.prototype.constructor = ProwizjaError;

  /* Warunki obowiazujace w danym dniu. Nowa wersja dziala od swojej daty,
     nigdy wstecz (D-23, D-162). */
  function warunkiNaDzien(wersje, data) {
    var pasujace = wersje.filter(function (w) {
      return w.od <= data && (!w.do || w.do >= data);
    }).sort(function (a, b) { return a.od < b.od ? 1 : -1; });
    if (!pasujace.length) throw new ProwizjaError("brak_warunkow", "Brak warunków prowizyjnych na dzień " + data);
    return pasujace[0];
  }

  function kluczOkresu(wersja, data) {
    return wersja.kumulacja === "roczny" ? data.slice(0, 4) : data.slice(0, 7);
  }

  function prowizjaSegmentu(wersja, pozycje, obrotPrzed, obrotOkresu) {
    var narastajaco = obrotPrzed;
    return pozycje.map(function (p) {
      var r;
      if (bezProgow(wersja)) r = liczProwizje(wersja, 0, p.kwota);
      else if (wersja.sposob === "od_calosci") {
        var st = stawkaDla(posortowaneProgi(wersja), obrotOkresu);
        r = { kwota: p.kwota * st / 100, stawka: st };
      } else r = liczProwizje(wersja, narastajaco, p.kwota);
      narastajaco += p.kwota;
      return { id: p.id, data: p.data, kwota: p.kwota, stawka: r.stawka, prowizja: r.kwota,
               wersja: wersja.id, korekta: false };
    });
  }

  /* Rozliczenie wszystkich faktur instytucji na okresy.
       wersje:  [{ id, od, do, kumulacja, sposob, stala, progi }]
       faktury: [{ id, data, kwota, korygowana }]  korygowana = id faktury pierwotnej
     Faktura zwykla trafia do okresu swojej daty, po warunkach z tej daty.
     Faktura korygujaca trafia do okresu, w ktorym ja wystawiono (D-161), a nie
     do okresu faktury pierwotnej, wiec zamkniety okres sie nie zmienia (D-23).
     Zdejmuje prowizje ta sama stawka, ktora naliczyla faktura pierwotna, i nie
     zmienia obrotu nowego okresu, bo ten obrot nie zostal w nim wygenerowany. */
  function rozliczOkresy(wersje, faktury) {
    var zwykle = faktury.filter(function (f) { return !f.korygowana; })
      .slice().sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    var okresy = {}, kolejnosc = [];
    function okres(klucz) {
      if (!okresy[klucz]) { okresy[klucz] = { klucz: klucz, obrot: 0, pozycje: [] }; kolejnosc.push(klucz); }
      return okresy[klucz];
    }

    var grupy = {};
    zwykle.forEach(function (f) {
      var w = warunkiNaDzien(wersje, f.data);
      var k = kluczOkresu(w, f.data);
      (grupy[k] = grupy[k] || []).push({ f: f, w: w });
      okres(k).obrot += f.kwota;
    });

    var stawkaFaktury = {};
    Object.keys(grupy).forEach(function (k) {
      var narastajaco = 0, i = 0, lista = grupy[k];
      while (i < lista.length) {
        var w = lista[i].w, segment = [];
        while (i < lista.length && lista[i].w === w) { segment.push(lista[i].f); i++; }
        prowizjaSegmentu(w, segment, narastajaco, okresy[k].obrot).forEach(function (p) {
          stawkaFaktury[p.id] = p.stawka;
          okresy[k].pozycje.push(p);
        });
        narastajaco += segment.reduce(function (s, f) { return s + f.kwota; }, 0);
      }
    });

    faktury.filter(function (f) { return f.korygowana; }).forEach(function (f) {
      if (stawkaFaktury[f.korygowana] == null) {
        throw new ProwizjaError("brak_pierwotnej", "Korekta " + f.id + " wskazuje nieznaną fakturę " + f.korygowana);
      }
      var st = stawkaFaktury[f.korygowana];
      okres(kluczOkresu(warunkiNaDzien(wersje, f.data), f.data)).pozycje.push({
        id: f.id, data: f.data, kwota: f.kwota, stawka: st, prowizja: f.kwota * st / 100,
        wersja: null, korekta: true, korygowana: f.korygowana
      });
    });

    var lista = kolejnosc.sort().map(function (k) {
      var o = okresy[k];
      o.suma = o.pozycje.reduce(function (s, p) { return s + p.prowizja; }, 0);
      return o;
    });
    return { okresy: lista, suma: lista.reduce(function (s, o) { return s + o.suma; }, 0) };
  }

  global.liczProwizje = liczProwizje;
  global.liczOkres = liczOkres;
  global.Prowizja = { warunkiNaDzien: warunkiNaDzien, rozliczOkresy: rozliczOkresy, ProwizjaError: ProwizjaError };
})(window);
