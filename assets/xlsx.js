/* Pliki Excel .xlsx bez zewnetrznych bibliotek (decyzja P-67): xlsx to archiwum zip z plikami XML.
   Odczyt: archiwum rozpakowuje wbudowany DecompressionStream("deflate-raw"), arkusz i teksty
   wspolne czyta DOMParser, wynik to wiersze tekstu zamienione na CSV dla parsera formularza
   (16-formularz-csv.js). Zapis jest w assets/xlsx-zapis.js.

   XlsxPlik.naCsv(arrayBuffer) -> Promise<string>      (pierwszy arkusz; blad: XlsxError)
   XlsxPlik.arkusze(arrayBuffer) -> Promise<[{ nazwa, wiersze }]>   (wszystkie arkusze, D-327)
   Wspolny dla formularzy (21) i eksportow (assets/eksport.js), dlatego lezy w assets. */
(function (global) {
  "use strict";

  function XlsxError(komunikat) { this.name = "XlsxError"; this.message = komunikat; }
  XlsxError.prototype = Object.create(Error.prototype);

  var KONIEC_KATALOGU = 0x06054b50, WPIS_KATALOGU = 0x02014b50;
  var BEZ_KOMPRESJI = 0, DEFLATE = 8;

  /* ------------------------------ archiwum zip: odczyt ------------------------------ */
  function wpisyArchiwum(bajty) {
    var widok = new DataView(bajty.buffer, bajty.byteOffset, bajty.byteLength);
    var koniec = -1;
    for (var i = bajty.length - 22; i >= 0; i--) { if (widok.getUint32(i, true) === KONIEC_KATALOGU) { koniec = i; break; } }
    if (koniec < 0) throw new XlsxError("To nie jest plik Excel .xlsx (brak struktury archiwum).");
    var liczba = widok.getUint16(koniec + 10, true), poz = widok.getUint32(koniec + 16, true), wpisy = {};
    for (var n = 0; n < liczba; n++) {
      if (widok.getUint32(poz, true) !== WPIS_KATALOGU) throw new XlsxError("Uszkodzony plik .xlsx.");
      var dlNazwy = widok.getUint16(poz + 28, true), dlDodatkow = widok.getUint16(poz + 30, true), dlKomentarza = widok.getUint16(poz + 32, true);
      var nazwa = new TextDecoder().decode(bajty.subarray(poz + 46, poz + 46 + dlNazwy));
      wpisy[nazwa] = { metoda: widok.getUint16(poz + 10, true), rozmiar: widok.getUint32(poz + 20, true), naglowek: widok.getUint32(poz + 42, true) };
      poz += 46 + dlNazwy + dlDodatkow + dlKomentarza;
    }
    return { wpisy: wpisy, widok: widok, bajty: bajty };
  }

  function tekstWpisu(arch, nazwa) {
    var w = arch.wpisy[nazwa];
    if (!w) return Promise.resolve(null);
    var start = w.naglowek + 30 + arch.widok.getUint16(w.naglowek + 26, true) + arch.widok.getUint16(w.naglowek + 28, true);
    var dane = arch.bajty.subarray(start, start + w.rozmiar);
    if (w.metoda === BEZ_KOMPRESJI) return Promise.resolve(new TextDecoder().decode(dane));
    if (w.metoda !== DEFLATE) return Promise.reject(new XlsxError("Nieobsługiwana kompresja w pliku .xlsx."));
    var strumien = new Blob([dane]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(strumien).text();
  }

  /* ------------------------------ arkusz ------------------------------ */
  function xml(tekst) { return new DOMParser().parseFromString(tekst, "application/xml"); }

  function tekstyWspolne(tekst) {
    if (!tekst) return [];
    return Array.prototype.map.call(xml(tekst).getElementsByTagName("si"), function (si) {
      return Array.prototype.map.call(si.getElementsByTagName("t"), function (t) { return t.textContent; }).join("");
    });
  }

  /* "AB12" -> 27 (kolumny od zera) */
  function kolumna(adres) {
    var litery = String(adres || "").replace(/\d+/g, ""), n = 0;
    for (var i = 0; i < litery.length; i++) n = n * 26 + litery.charCodeAt(i) - 64;
    return n - 1;
  }

  function wartoscKomorki(c, wspolne) {
    var typ = c.getAttribute("t"), v = c.getElementsByTagName("v")[0];
    if (typ === "inlineStr") return Array.prototype.map.call(c.getElementsByTagName("t"), function (t) { return t.textContent; }).join("");
    if (!v) return "";
    if (typ === "s") return wspolne[parseInt(v.textContent, 10)] || "";
    if (typ === "b") return v.textContent === "1" ? "TAK" : "NIE";
    return v.textContent;
  }

  function wierszeArkusza(tekst, wspolne) {
    return Array.prototype.map.call(xml(tekst).getElementsByTagName("row"), function (r) {
      var wiersz = [];
      Array.prototype.forEach.call(r.getElementsByTagName("c"), function (c, i) {
        var k = c.getAttribute("r") ? kolumna(c.getAttribute("r")) : i;
        while (wiersz.length < k) wiersz.push("");
        wiersz[k] = wartoscKomorki(c, wspolne);
      });
      return wiersz;
    });
  }

  var NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  /* Arkusze skoroszytu w kolejnosci z workbook.xml: [{ nazwa, sciezka }]; bez opisu skoroszytu
     zwykle jest jeden arkusz xl/worksheets/sheet1.xml */
  function listaArkuszy(skoroszyt, relacje) {
    var arkusze = skoroszyt ? Array.prototype.slice.call(xml(skoroszyt).getElementsByTagName("sheet")) : [];
    var rel = relacje ? Array.prototype.slice.call(xml(relacje).getElementsByTagName("Relationship")) : [];
    var lista = arkusze.map(function (a) {
      var id = a.getAttribute("r:id") || a.getAttributeNS(NS_REL, "id");
      var r = rel.filter(function (x) { return x.getAttribute("Id") === id; })[0];
      if (!r) return null;
      var cel = r.getAttribute("Target").replace(/^\//, "");
      return { nazwa: a.getAttribute("name") || "", sciezka: cel.indexOf("xl/") === 0 ? cel : "xl/" + cel };
    }).filter(Boolean);
    return lista.length ? lista : [{ nazwa: "", sciezka: "xl/worksheets/sheet1.xml" }];
  }

  function komorkaCsv(tekst) {
    var t = String(tekst);
    return /[;"\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }

  /* Wszystkie arkusze: Promise<[{ nazwa, wiersze: [[tekst]] }]>; pierwszy arkusz musi istniec */
  function arkusze(bufor) {
    var arch;
    try { arch = wpisyArchiwum(new Uint8Array(bufor)); } catch (e) { return Promise.reject(e); }
    return Promise.all(["xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/sharedStrings.xml"].map(function (n) { return tekstWpisu(arch, n); }))
      .then(function (t) {
        var wspolne = tekstyWspolne(t[2]), lista = listaArkuszy(t[0], t[1]);
        return Promise.all(lista.map(function (a) { return tekstWpisu(arch, a.sciezka); })).then(function (tresci) {
          if (!tresci[0]) throw new XlsxError("W pliku .xlsx nie ma arkusza z danymi.");
          return lista.map(function (a, i) { return tresci[i] ? { nazwa: a.nazwa, wiersze: wierszeArkusza(tresci[i], wspolne) } : null; }).filter(Boolean);
        });
      });
  }

  /* Pierwszy arkusz jako tekst CSV ze srednikiem */
  function naCsv(bufor) {
    return arkusze(bufor).then(function (a) {
      return a[0].wiersze.map(function (w) { return w.map(komorkaCsv).join(";"); }).join("\r\n");
    });
  }

  global.XlsxPlik = { naCsv: naCsv, arkusze: arkusze, XlsxError: XlsxError, kolumna: kolumna };
})(window);
