/* Wysylka maili, zakladka 1: edytor szablonu (spotkanie 14.10.2026). LDIT sam zapisuje i edytuje
   szablony: nazwa, odbiorca, temat i tresc w szablony_maili (temat, tresc_html) przez Store, wiec
   straznik pilnuje edycji modulu Komunikacja. Przycisk "Wstaw zmienna" otwiera liste wszystkich
   danych klienta i wniosku (ZMIENNE_09) i wstawia zmienna w miejscu kursora. Tylko deklaracje. */

var POLE_ZMIENNEJ_09 = { id: "edTresc" };

function el09(id) { return document.getElementById(id); }

function znaneZmienne09() {
  return ZMIENNE_09.map(function (z) { return "{" + z[0] + "}"; })
    .concat(Object.keys(ALIASY_ZMIENNYCH_09).map(function (a) { return "{" + a + "}"; }));
}

/* Zmienne spoza katalogu (literowka) blokuja zapis: w wysylce zostalyby w mailu jako tekst */
function nieznaneZmienne09(tekst) {
  var znane = znaneZmienne09();
  return brakujaceZmienne09(tekst).filter(function (z) { return znane.indexOf(z) < 0; });
}

function walidujSzablon09(d) {
  if (!d.nazwa) return "Podaj nazwę szablonu.";
  if (!d.temat) return "Podaj temat maila.";
  if (!d.tresc) return "Wpisz treść maila.";
  if (!ODBIORCY_09[d.odbiorca]) return "Wybierz odbiorcę szablonu.";
  var nieznane = nieznaneZmienne09(d.temat + " " + d.tresc);
  return nieznane.length ? "Nieznane zmienne: " + nieznane.join(", ") + ". Wstaw je z listy przyciskiem Wstaw zmienną." : null;
}

function listaZmiennychHtml09(fraza) {
  var q = String(fraza || "").trim().toLowerCase(), html = "";
  GRUPY_ZMIENNYCH_09.forEach(function (g) {
    var w = zmienneKonta09().filter(function (z) {
      return z.grupa === g && (!q || (z.etykieta + " " + z.klucz).toLowerCase().indexOf(q) >= 0);
    });
    if (!w.length) return;
    html += '<div class="zm-grupa">' + esc(g) + "</div>" + w.map(function (z) {
      return '<button type="button" class="zm-poz" data-k="' + esc(z.klucz) + '"><span>' + esc(z.etykieta) + '</span><code>' + esc(z.klucz) + "</code></button>";
    }).join("");
  });
  return html || '<div class="small muted" style="padding:8px">Brak zmiennych dla tej frazy.</div>';
}

function rysujListeZmiennych09() {
  var lista = el09("listaZmiennych09");
  lista.innerHTML = listaZmiennychHtml09(el09("szukajZmiennej09").value);
  Array.prototype.forEach.call(lista.querySelectorAll(".zm-poz"), function (b) {
    b.addEventListener("click", function () { wstawZmienna09(b.getAttribute("data-k")); });
  });
}

function przelaczZmienne09() {
  var box = el09("zmienne09");
  box.hidden = !box.hidden;
  if (!box.hidden) { rysujListeZmiennych09(); el09("szukajZmiennej09").focus(); }
}

/* Wstawia zmienna w miejscu kursora ostatnio uzywanego pola (temat albo tresc) */
function wstawZmienna09(klucz) {
  var pole = el09(POLE_ZMIENNEJ_09.id) || el09("edTresc");
  var od = pole.selectionStart == null ? pole.value.length : pole.selectionStart;
  var dok = pole.selectionEnd == null ? od : pole.selectionEnd;
  pole.value = pole.value.slice(0, od) + klucz + pole.value.slice(dok);
  pole.focus();
  pole.selectionStart = pole.selectionEnd = od + klucz.length;
  el09("zmienne09").hidden = true;
}

function formularzSzablonu09(s) {
  var odb = s ? s.odbiorca : "Klient końcowy";
  return '<div class="small strong" style="margin-bottom:10px">' + (s ? "Edycja szablonu " + esc(s.id) : "Nowy szablon LDIT") + "</div>" +
    '<div class="grid g2" style="gap:10px"><label class="small fld09"><span class="muted">Nazwa szablonu</span><input class="inp" id="edNazwa" value="' + esc(s ? s.nazwa : "") + '"></label>' +
    '<label class="small fld09"><span class="muted">Odbiorca</span><select class="inp" id="edOdbiorca">' + Object.keys(ODBIORCY_09).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === odb ? " selected" : "") + ">" + esc(ODBIORCY_09[k].etykieta) + "</option>";
    }).join("") + "</select></label></div>" +
    '<label class="small fld09" style="margin-top:10px"><span class="muted">Temat</span><input class="inp" id="edTemat" value="' + esc(s ? s.temat : "") + '"></label>' +
    '<div class="zm-pasek"><span class="small muted">Treść</span><span class="sp"></span>' +
      '<button type="button" class="btn xs" id="btnWstawZmienna" onclick="przelaczZmienne09()" aria-expanded="false">{ } Wstaw zmienną</button></div>' +
    '<div class="zm-okno" id="zmienne09" hidden><input class="inp" id="szukajZmiennej09" placeholder="Szukaj: telefon, NIP, termin..." aria-label="Szukaj zmiennej">' +
      '<div class="zm-lista" id="listaZmiennych09"></div></div>' +
    '<textarea class="inp" id="edTresc" rows="14" style="width:100%;box-sizing:border-box;font-family:inherit">' + esc(s ? s.tresc : "") + "</textarea>" +
    '<div class="small muted" style="margin-top:6px">Zmienna wstawia się w miejscu kursora, w temacie albo w treści. ' +
      "Do uczestników szkoleń nic nie wysyłamy, adresatem jest zawsze firma, instytucja albo zespół LDIT.</div>" +
    '<div class="small" id="edBlad" role="status" style="margin-top:6px;color:var(--neg-ink)"></div>' +
    '<div class="btn-row mt16"><button class="btn primary sm" id="btnZapiszSzablon" onclick="zapiszSzablon09()">Zapisz szablon</button>' +
    '<button class="btn sm" onclick="pokaz(STAN_09.wybranySzablon)">Anuluj</button></div>';
}

function otworzEdytor09(s) {
  if (!Auth.edytujeModul("komun")) return;
  STAN_09.edytowany = s ? s.id : "";
  el09("podgTytul").textContent = s ? "Edycja: " + s.nazwa : "Nowy szablon";
  el09("podglad").innerHTML = "";
  el09("podgMeta").innerHTML = "";
  var ed = el09("edytor09");
  ed.innerHTML = formularzSzablonu09(s);
  ed.hidden = false;
  ["edTemat", "edTresc"].forEach(function (id) {
    el09(id).addEventListener("focus", function () { POLE_ZMIENNEJ_09.id = id; });
  });
  POLE_ZMIENNEJ_09.id = "edTresc";
  el09("szukajZmiennej09").addEventListener("input", rysujListeZmiennych09);
  el09("edNazwa").focus();
}

function edytujSzablon09(id) { otworzEdytor09(szablon09(id || STAN_09.wybranySzablon)); }
function nowySzablon09() { otworzEdytor09(null); }

function zamknijEdytor09() {
  STAN_09.edytowany = null;
  var ed = el09("edytor09");
  if (ed) { ed.hidden = true; ed.innerHTML = ""; }
}

function czasRejestru09() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Zapis: nowy wiersz albo zmiana istniejacego, z wpisem do rejestru aktywnosci */
function zapiszSzablon09() {
  var d = { nazwa: el09("edNazwa").value.trim(), odbiorca: el09("edOdbiorca").value,
            temat: el09("edTemat").value.trim(), tresc: el09("edTresc").value.replace(/\s+$/, "") };
  var blad = walidujSzablon09(d);
  el09("edBlad").textContent = blad || "";
  if (blad) return null;
  var dane = { nazwa: d.nazwa, odbiorca: d.odbiorca, temat: d.temat, tresc_html: d.tresc };
  var id = STAN_09.edytowany, przed = id ? szablon09(id) : null;
  if (id) Store.update("szablony_maili", id, dane);
  else id = Store.insert("szablony_maili", Object.assign({ autor: "LDIT", uzyc: 0 }, dane), "SZB-").id;
  Store.insert("rejestr_aktywnosci", { czas: czasRejestru09(), kto: Auth.sesja().imie, typ: "Szablon maila", obiekt: id,
    pole: przed ? "Treść szablonu" : "Nowy szablon", przed: przed ? przed.temat : "", po: d.temat, tabela: "szablony_maili", rekord_id: id }, "AKT-");
  STAN_09.wybranySzablon = id;
  inicjujBiblioteke09();
  odswiezSzablonyWysylki09();
  return id;
}
