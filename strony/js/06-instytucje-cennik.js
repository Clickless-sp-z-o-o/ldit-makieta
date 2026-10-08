/* Ekran Instytucje: cennik szkolenia, czyli lista cen do wyboru we wniosku (D-277). Katalog nie ma
   jednej ceny. W karcie planu ceny wpisuje sie po srednikach; zapis dopisuje nowe i usuwa skreslone.
   Ceny dopisane z wnioskow (zrodlo "wniosek") tez mozna tu skreslic. Tylko deklaracje. */

function cenyZTekstu06(tekst) {
  var wynik = [];
  String(tekst || "").split(/[;\n]/).forEach(function (t) {
    var k = t.replace(/\s/g, "").replace("zł", "").replace(",", ".");
    if (k === "") return;
    var n = /^\d+(\.\d{1,2})?$/.test(k) ? parseFloat(k) : null;
    wynik.push(n);
  });
  return wynik;
}

function tekstCennika06(szkolenieId) {
  return Store.query("SELECT cena FROM ceny_szkolen WHERE szkolenie_id = ? ORDER BY zrodlo, cena", [szkolenieId])
    .map(function (c) { return String(c.cena).replace(".", ","); }).join("; ");
}

/* Zwraca {ok} albo {ok:false, blad}; ceny niebedace kwota nie zmieniaja cennika */
function zapiszCennik06(szkolenieId, tekst) {
  var ceny = cenyZTekstu06(tekst);
  if (ceny.some(function (c) { return c === null; })) return { ok: false, blad: "Cennik: kwoty nieujemne rozdzielone średnikiem, np. 4500; 5200,50." };
  var szk = Store.find("katalog_szkolen", szkolenieId);
  var obecne = Store.query("SELECT id, cena FROM ceny_szkolen WHERE szkolenie_id = ?", [szkolenieId]);
  obecne.forEach(function (c) { if (ceny.indexOf(c.cena) < 0) Store.remove("ceny_szkolen", c.id); });
  ceny.forEach(function (c, i) {
    if (ceny.indexOf(c) !== i || obecne.some(function (o) { return o.cena === c; })) return;
    Store.insert("ceny_szkolen", { szkolenie_id: szkolenieId, instytucja_id: szk.instytucja_id, cena: c, zrodlo: "katalog",
                                   dodano: new Date().toISOString().slice(0, 10) }, "CS-");
  });
  return { ok: true };
}

function kopiujCennik06(zrodloId, celId) {
  zapiszCennik06(celId, tekstCennika06(zrodloId));
}
