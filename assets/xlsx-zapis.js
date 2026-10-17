/* Zapis plikow Excel .xlsx bez zewnetrznych bibliotek (decyzja P-67): archiwum zip bez kompresji
   z plikami XML. Wszystkie komorki w formacie tekstowym, zeby Excel nie gubil zer na poczatku PESEL i NIP.
   Odczyt jest w assets/xlsx.js; ten plik dopisuje do XlsxPlik funkcje zapisu, wiec laduje sie po nim.

   XlsxPlik.szablon(naglowki, wiersze, arkusz) -> Uint8Array   (jeden arkusz: naglowek i wiersze, eksporty)
   XlsxPlik.skoroszyt(arkusze) -> Uint8Array                   (wiele arkuszy ze stylami, D-327)
     arkusz: { nazwa, kolumny: [szerokosc], wiersze: [[komorka]], scalenia: ["A1:B1"], zamroz: liczba wierszy,
               wysokosci: { indeks wiersza od 0: wysokosc w punktach } }
     komorka: tekst (styl TEKST) albo { t: tekst, s: XlsxPlik.STYL.* }
   XlsxPlik.STYL: identyfikatory stylow komorek z styles.xml */
(function (global) {
  "use strict";

  var WPIS_KATALOGU = 0x02014b50, KONIEC_KATALOGU = 0x06054b50;
  var NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  var REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  var MAKS_NAZWA_ARKUSZA = 31;
  var SZEROKOSC_EKSPORTU = 24;

  /* ------------------------------ archiwum zip ------------------------------ */
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

  function zapiszPola(widok, pola) {
    pola.forEach(function (x) { if (x[2] === 4) widok.setUint32(x[0], x[1], true); else widok.setUint16(x[0], x[1], true); });
  }

  /* Archiwum bez kompresji: naglowek lokalny + dane, potem katalog centralny i jego koniec */
  function zip(pliki) {
    var czesci = [], katalog = [], poz = 0;
    pliki.forEach(function (p) {
      var nazwa = new TextEncoder().encode(p.nazwa), dane = new TextEncoder().encode(p.tresc), crc = crc32(dane);
      var lok = new DataView(new ArrayBuffer(30)), kat = new DataView(new ArrayBuffer(46));
      zapiszPola(lok, [[0, 0x04034b50, 4], [4, 20, 2], [14, crc, 4], [18, dane.length, 4], [22, dane.length, 4], [26, nazwa.length, 2]]);
      zapiszPola(kat, [[0, WPIS_KATALOGU, 4], [4, 20, 2], [6, 20, 2], [16, crc, 4], [20, dane.length, 4], [24, dane.length, 4], [28, nazwa.length, 2], [42, poz, 4]]);
      czesci.push(new Uint8Array(lok.buffer), nazwa, dane);
      katalog.push(new Uint8Array(kat.buffer), nazwa);
      poz += 30 + nazwa.length + dane.length;
    });
    var dlKatalogu = katalog.reduce(function (s, c) { return s + c.length; }, 0);
    var kon = new DataView(new ArrayBuffer(22));
    zapiszPola(kon, [[0, KONIEC_KATALOGU, 4], [8, pliki.length, 2], [10, pliki.length, 2], [12, dlKatalogu, 4], [16, poz, 4]]);
    var wszystko = czesci.concat(katalog, [new Uint8Array(kon.buffer)]);
    var wynik = new Uint8Array(wszystko.reduce(function (s, c) { return s + c.length; }, 0)), o = 0;
    wszystko.forEach(function (c) { wynik.set(c, o); o += c.length; });
    return wynik;
  }

  function escXml(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ------------------------------ style ------------------------------ */
  /* Kolory: granat sekcji, jasne tlo nazw pol, czerwien pol wymaganych, niebieski naglowek tabeli */
  var STYL = { DOMYSLNY: 0, TEKST: 1, SEKCJA: 2, POLE: 3, WARTOSC: 4, WYMAGANE: 5, NAGLOWEK: 6, TYTUL: 7, UWAGA: 8 };
  var STYLE_XML = '<?xml version="1.0" encoding="UTF-8"?><styleSheet ' + NS + '>' +
    '<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF1F3A5F"/><name val="Calibri"/></font>' +
    '<font><i/><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFB42318"/><name val="Calibri"/></font></fonts>' +
    '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F3A5F"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFDECEA"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF2F5D8A"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border/><border><left style="thin"><color rgb="FFBFC7D5"/></left><right style="thin"><color rgb="FFBFC7D5"/></right>' +
    '<top style="thin"><color rgb="FFBFC7D5"/></top><bottom style="thin"><color rgb="FFBFC7D5"/></bottom></border></borders>' +
    '<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="9"><xf/>' +
    '<xf numFmtId="49" applyNumberFormat="1"/>' +
    '<xf numFmtId="49" fontId="2" fillId="2" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="49" fillId="3" borderId="1" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="49" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="49" fontId="5" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="49" fontId="2" fillId="5" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="49" fontId="3" applyNumberFormat="1" applyFont="1"/>' +
    '<xf numFmtId="49" fontId="4" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  /* ------------------------------ arkusze ------------------------------ */
  /* 0 -> "A", 27 -> "AB" */
  function literaKolumny(n) {
    var s = "";
    for (n = n + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
    return s;
  }

  /* Pusta komorka bez stylu jest pomijana; komorka ze stylem zostaje (ramka pola do wpisania) */
  function komorkaXml(k, kol, nr) {
    var obiekt = k !== null && typeof k === "object";
    var tekst = obiekt ? k.t : k, styl = obiekt && k.s !== undefined ? k.s : STYL.TEKST;
    var adres = literaKolumny(kol) + nr;
    if (tekst === undefined || tekst === null || tekst === "") return obiekt ? '<c r="' + adres + '" s="' + styl + '"/>' : "";
    return '<c r="' + adres + '" t="inlineStr" s="' + styl + '"><is><t xml:space="preserve">' + escXml(tekst) + "</t></is></c>";
  }

  function arkuszXml(a) {
    var kolumny = (a.kolumny || []).map(function (szer, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + szer + '" style="' + STYL.TEKST + '" customWidth="1"/>';
    }).join("");
    var zamroz = a.zamroz ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + a.zamroz + '" topLeftCell="A' + (a.zamroz + 1) +
      '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "";
    var wiersze = a.wiersze.map(function (w, i) {
      var wys = a.wysokosci && a.wysokosci[i] ? ' ht="' + a.wysokosci[i] + '" customHeight="1"' : "";
      return '<row r="' + (i + 1) + '"' + wys + ">" + w.map(function (k, kol) { return komorkaXml(k, kol, i + 1); }).join("") + "</row>";
    }).join("");
    var scalenia = (a.scalenia || []).length ? '<mergeCells count="' + a.scalenia.length + '">' +
      a.scalenia.map(function (z) { return '<mergeCell ref="' + z + '"/>'; }).join("") + "</mergeCells>" : "";
    return '<?xml version="1.0" encoding="UTF-8"?><worksheet ' + NS + ">" + zamroz + (kolumny ? "<cols>" + kolumny + "</cols>" : "") +
      "<sheetData>" + wiersze + "</sheetData>" + scalenia + "</worksheet>";
  }

  /* Nazwa arkusza w Excelu: do 31 znakow, bez znakow zabronionych \ / ? * [ ] : */
  function nazwaArkusza(arkusz) {
    var n = String(arkusz || "Formularz").replace(/[\\\/?*\[\]:]/g, " ").trim().slice(0, MAKS_NAZWA_ARKUSZA);
    return n || "Arkusz";
  }

  function skoroszyt(arkusze) {
    if (!arkusze || !arkusze.length) throw new global.XlsxPlik.XlsxError("Skoroszyt musi mieć co najmniej jeden arkusz.");
    var typy = arkusze.map(function (a, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join("");
    var listaArkuszy = arkusze.map(function (a, i) { return '<sheet name="' + escXml(nazwaArkusza(a.nazwa)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("");
    var relacje = arkusze.map(function (a, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + REL + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("");
    var pliki = [
      { nazwa: "[Content_Types].xml", tresc: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + typy +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { nazwa: "_rels/.rels", tresc: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { nazwa: "xl/workbook.xml", tresc: '<?xml version="1.0" encoding="UTF-8"?><workbook ' + NS + ' xmlns:r="' + REL + '"><sheets>' + listaArkuszy + "</sheets></workbook>" },
      { nazwa: "xl/_rels/workbook.xml.rels", tresc: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        relacje + '<Relationship Id="rId' + (arkusze.length + 1) + '" Type="' + REL + '/styles" Target="styles.xml"/></Relationships>' },
      { nazwa: "xl/styles.xml", tresc: STYLE_XML }
    ].concat(arkusze.map(function (a, i) { return { nazwa: "xl/worksheets/sheet" + (i + 1) + ".xml", tresc: arkuszXml(a) }; }));
    return zip(pliki);
  }

  /* wiersze: opcjonalne wiersze danych pod naglowkiem (tablice tekstow), arkusz: nazwa arkusza */
  function szablon(naglowki, wiersze, arkusz) {
    return skoroszyt([{ nazwa: arkusz, kolumny: naglowki.map(function () { return SZEROKOSC_EKSPORTU; }), wiersze: [naglowki].concat(wiersze || []) }]);
  }

  global.XlsxPlik.szablon = szablon;
  global.XlsxPlik.skoroszyt = skoroszyt;
  global.XlsxPlik.STYL = STYL;
})(window);
