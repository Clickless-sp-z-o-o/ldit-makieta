/* Pliki Excel .xlsx bez zewnetrznych bibliotek (decyzja P-67): xlsx to archiwum zip z plikami XML.
   Odczyt: archiwum rozpakowuje wbudowany DecompressionStream("deflate-raw"), arkusz i teksty
   wspolne czyta DOMParser, wynik to wiersze tekstu zamienione na CSV dla parsera formularza
   (16-formularz-csv.js). Zapis: pusty szablon z naglowkami, archiwum bez kompresji, wszystkie
   kolumny w formacie tekstowym, zeby Excel nie gubil zer na poczatku PESEL i NIP.

   XlsxPlik.naCsv(arrayBuffer) -> Promise<string>      (blad: XlsxError)
   XlsxPlik.szablon(naglowki, wiersze, arkusz) -> Uint8Array pliku .xlsx (wiersze i nazwa arkusza opcjonalne)
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

  /* Pierwszy arkusz skoroszytu, z relacji workbook.xml; bez nich zwykle xl/worksheets/sheet1.xml */
  function sciezkaPierwszegoArkusza(skoroszyt, relacje) {
    var arkusz = skoroszyt && xml(skoroszyt).getElementsByTagName("sheet")[0];
    var id = arkusz && (arkusz.getAttribute("r:id") || arkusz.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"));
    var rel = id && relacje && Array.prototype.filter.call(xml(relacje).getElementsByTagName("Relationship"), function (x) { return x.getAttribute("Id") === id; })[0];
    if (!rel) return "xl/worksheets/sheet1.xml";
    var cel = rel.getAttribute("Target").replace(/^\//, "");
    return cel.indexOf("xl/") === 0 ? cel : "xl/" + cel;
  }

  function komorkaCsv(tekst) {
    var t = String(tekst);
    return /[;"\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }

  function naCsv(bufor) {
    var arch;
    try { arch = wpisyArchiwum(new Uint8Array(bufor)); } catch (e) { return Promise.reject(e); }
    return Promise.all(["xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/sharedStrings.xml"].map(function (n) { return tekstWpisu(arch, n); }))
      .then(function (t) {
        var wspolne = tekstyWspolne(t[2]);
        return tekstWpisu(arch, sciezkaPierwszegoArkusza(t[0], t[1])).then(function (arkusz) {
          if (!arkusz) throw new XlsxError("W pliku .xlsx nie ma arkusza z danymi.");
          return wierszeArkusza(arkusz, wspolne).map(function (w) { return w.map(komorkaCsv).join(";"); }).join("\r\n");
        });
      });
  }

  /* ------------------------------ archiwum zip: zapis szablonu ------------------------------ */
  var TABLICA_CRC = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) {
    var c = 0xffffffff;
    for (var i = 0; i < b.length; i++) c = TABLICA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /* Archiwum bez kompresji: naglowek lokalny + dane, potem katalog centralny i jego koniec */
  function zip(pliki) {
    var czesci = [], katalog = [], poz = 0;
    pliki.forEach(function (p) {
      var nazwa = new TextEncoder().encode(p.nazwa), dane = new TextEncoder().encode(p.tresc), crc = crc32(dane);
      var lok = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [14, crc, 4], [18, dane.length, 4], [22, dane.length, 4], [26, nazwa.length, 2]]
        .forEach(function (x) { if (x[2] === 4) lok.setUint32(x[0], x[1], true); else lok.setUint16(x[0], x[1], true); });
      var kat = new DataView(new ArrayBuffer(46));
      [[0, WPIS_KATALOGU, 4], [4, 20, 2], [6, 20, 2], [16, crc, 4], [20, dane.length, 4], [24, dane.length, 4], [28, nazwa.length, 2], [42, poz, 4]]
        .forEach(function (x) { if (x[2] === 4) kat.setUint32(x[0], x[1], true); else kat.setUint16(x[0], x[1], true); });
      czesci.push(new Uint8Array(lok.buffer), nazwa, dane);
      katalog.push(new Uint8Array(kat.buffer), nazwa);
      poz += 30 + nazwa.length + dane.length;
    });
    var dlKatalogu = katalog.reduce(function (s, c) { return s + c.length; }, 0);
    var kon = new DataView(new ArrayBuffer(22));
    kon.setUint32(0, KONIEC_KATALOGU, true); kon.setUint16(8, pliki.length, true); kon.setUint16(10, pliki.length, true);
    kon.setUint32(12, dlKatalogu, true); kon.setUint32(16, poz, true);
    var wszystko = czesci.concat(katalog, [new Uint8Array(kon.buffer)]);
    var wynik = new Uint8Array(wszystko.reduce(function (s, c) { return s + c.length; }, 0)), o = 0;
    wszystko.forEach(function (c) { wynik.set(c, o); o += c.length; });
    return wynik;
  }

  function escXml(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  var NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  var REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  function wierszXml(wartosci, nr) {
    return '<row r="' + nr + '">' + wartosci.map(function (n) { return '<c t="inlineStr" s="1"><is><t>' + escXml(n) + "</t></is></c>"; }).join("") + "</row>";
  }

  /* Nazwa arkusza w Excelu: do 31 znakow, bez znakow zabronionych \ / ? * [ ] : */
  function nazwaArkusza(arkusz) {
    var n = String(arkusz || "Formularz").replace(/[\\\/?*\[\]:]/g, " ").trim().slice(0, 31);
    return n || "Arkusz";
  }

  /* wiersze: opcjonalne wiersze danych pod naglowkiem (tablice tekstow), arkusz: nazwa arkusza */
  function szablon(naglowki, wiersze, arkusz) {
    var komorki = [naglowki].concat(wiersze || []).map(function (w, i) { return wierszXml(w, i + 1); }).join("");
    var pliki = [
      { nazwa: "[Content_Types].xml", tresc: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { nazwa: "_rels/.rels", tresc: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { nazwa: "xl/workbook.xml", tresc: '<?xml version="1.0" encoding="UTF-8"?><workbook ' + NS + ' xmlns:r="' + REL + '"><sheets><sheet name="' + escXml(nazwaArkusza(arkusz)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { nazwa: "xl/_rels/workbook.xml.rels", tresc: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="' + REL + '/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + REL + '/styles" Target="styles.xml"/></Relationships>' },
      /* Styl 1 = format tekstowy (numFmtId 49): PESEL i NIP zostaja tekstem */
      { nazwa: "xl/styles.xml", tresc: '<?xml version="1.0" encoding="UTF-8"?><styleSheet ' + NS + '><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders>' +
        '<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf numFmtId="49" applyNumberFormat="1"/></cellXfs></styleSheet>' },
      { nazwa: "xl/worksheets/sheet1.xml", tresc: '<?xml version="1.0" encoding="UTF-8"?><worksheet ' + NS + '><cols><col min="1" max="' + naglowki.length +
        '" width="24" style="1" customWidth="1"/></cols><sheetData>' + komorki + "</sheetData></worksheet>" }
    ];
    return zip(pliki);
  }

  global.XlsxPlik = { naCsv: naCsv, szablon: szablon, XlsxError: XlsxError, kolumna: kolumna };
})(window);
