/* Formularz zgloszeniowy klienta (D-244, D-245): wspolny dla panelu instytucji (16), Nowy formularz (21)
   i ekranu Do akceptacji (20). Trzy sposoby wprowadzenia: recznie, plik CSV, zalacznik PDF.
   Uklad jak formularz LDIT w Excelu (spotkanie 14.10): dane firmy w wierszach (etykieta | wartosc),
   uczestnicy w tabeli (osoba w wierszu), wszystko na jednej stronie.
   Klient koncowy nie wypelnia formularzy, wprowadza LDIT albo instytucja.
   Parser CSV: 16-formularz-csv.js. Zapis: Akceptacje.zglosFormularz (assets/akceptacje.js). */

var RODZAJE_ZF = [["umowa_o_prace", "umowa o pracę"], ["umowa_zlecenie", "umowa zlecenie"], ["umowa_o_dzielo", "umowa o dzieło"],
                  ["wlasciciel", "właściciel / JDG"], ["inna", "inna"]];
var WIELKOSCI_ZF = ["mikro", "mały", "średni", "duży", "inny"];
var KOLUMNY_UCZESTNIKA_ZF = [["imie_nazwisko", "Imię i nazwisko"], ["rodzaj_zatrudnienia", "Rodzaj zatrudnienia"],
                             ["wyksztalcenie", "Wykształcenie"], ["zawod", "Zawód"], ["pesel", "PESEL"]];
var OPIS_PDF_ZF = "W makiecie PDF nie jest odczytywany automatycznie: plik zostaje załączony do formularza, a dane z niego przepisz w polach poniżej. Docelowo system odczyta PDF o stałej strukturze (D-269).";
var KOMUNIKAT_XLS_ZF = "W makiecie obsługiwany jest plik CSV zapisany z Excela (Plik, Zapisz jako, CSV). Zapisz arkusz w tym formacie i wczytaj ponownie.";

var NAZWA_SZABLONU_ZF = "szablon-formularza-klienta.csv";

var ZF = { opcje: null, zrodlo: "reczny", plik: null, uczestnicy: [] };

function zfEl(id) { return document.getElementById(id); }

/* ------------------------------ uklad jak formularz LDIT w Excelu (spotkanie 14.10) ------------------------------ */

/* Arkusz stylow formularza (assets/style-formularz-1410.css): strony 19 i 21 maja go w naglowku,
   panel instytucji i Do akceptacji dostaja go przy pierwszym rysowaniu formularza */
function zfWczytajStyl() {
  if (document.querySelector('link[href$="style-formularz-1410.css"]')) return;
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "../assets/style-formularz-1410.css";
  document.head.appendChild(link);
}

/* Jeden wiersz: etykieta po lewej, wartosc po prawej. o: { wymagane, dodatek (html za polem), podpowiedz,
   idWiersza, ukryty }. Bez id (podglad) etykieta nie wskazuje pola. */
function zfWiersz(id, etykieta, wartosc, o) {
  o = o || {};
  var etyk = esc(etykieta) + (o.wymagane ? ' <span class="zf-wym" aria-hidden="true">*</span>' : "");
  return '<div class="zf-wiersz"' + (o.idWiersza ? ' id="' + o.idWiersza + '"' : "") + (o.ukryty ? " hidden" : "") + '>' +
    (id ? '<label class="zf-etyk" for="' + id + '">' + etyk + '</label>' : '<div class="zf-etyk">' + etyk + '</div>') +
    '<div class="zf-wart">' + wartosc + (o.dodatek || "") + '</div></div>';
}

function zfPole(id, etykieta, wartosc, typ, o) {
  var podpowiedz = o && o.podpowiedz ? ' placeholder="' + esc(o.podpowiedz) + '"' : "";
  var wymagane = o && o.wymagane ? ' aria-required="true"' : "";
  return zfWiersz(id, etykieta, typ === "textarea" ? '<textarea class="inp" id="' + id + '" rows="2">' + esc(wartosc) + '</textarea>'
    : '<input class="inp" id="' + id + '" value="' + esc(wartosc) + '"' + (typ ? ' type="' + typ + '"' : "") + podpowiedz + wymagane + '>', o);
}

function zfWybor(id, etykieta, opcje, wybrana, bezPustej, o) {
  return zfWiersz(id, etykieta, '<select class="inp" id="' + id + '">' + (bezPustej ? "" : '<option value="">wybierz</option>') + opcje.map(function (op) {
    return '<option value="' + esc(op[0]) + '"' + (op[0] === wybrana ? " selected" : "") + '>' + esc(op[1]) + '</option>';
  }).join("") + '</select>', o);
}

/* Sekcja formularza: granatowy pasek z nazwa i wiersze pol, jak w Excelu LDIT */
function zfArkusz(tytul, wiersze) {
  return '<div class="zf-arkusz">' + (tytul ? '<div class="zf-sekcja">' + esc(tytul) + '</div>' : "") + wiersze.join("") + '</div>';
}

/* ------------------------------ uczestnicy: tabela, osoba w wierszu ------------------------------ */

function zfPoleUczestnika(u, i, kolumna) {
  var k = kolumna[0];
  var wspolne = ' class="inp zf-u" data-i="' + i + '" data-k="' + k + '" aria-label="' + esc(kolumna[1] + ", uczestnik " + (i + 1)) + '"';
  if (k === "rodzaj_zatrudnienia") {
    return '<select' + wspolne + '><option value="">wybierz</option>' + RODZAJE_ZF.map(function (r) {
      return '<option value="' + r[0] + '"' + (u[k] === r[0] ? " selected" : "") + '>' + r[1] + '</option>';
    }).join("") + '</select>';
  }
  return '<input' + wspolne + ' value="' + esc(u[k] || "") + '">';
}

function zfWierszUczestnika(u, i) {
  return '<tr><td class="num muted">' + (i + 1) + '</td>' +
    KOLUMNY_UCZESTNIKA_ZF.map(function (k) { return "<td>" + zfPoleUczestnika(u, i, k) + "</td>"; }).join("") +
    '<td><button type="button" class="btn xs" onclick="zfUsunUczestnika(' + i + ')" aria-label="Usuń uczestnika ' + (i + 1) + '">Usuń</button></td></tr>';
}

function zfTabelaUczestnikow() {
  return '<div class="zf-arkusz zf-arkusz-tab"><div class="zf-sekcja">Uczestnicy <span class="zf-sekcja-opis">jedna osoba w wierszu</span></div>' +
    '<div class="zf-tab-ramka"><table class="zf-tab"><thead><tr><th class="num">Lp.</th>' +
    KOLUMNY_UCZESTNIKA_ZF.map(function (k) { return "<th>" + esc(k[1]) + "</th>"; }).join("") +
    '<th><span class="sr-only">Akcje</span></th></tr></thead><tbody id="zfUczestnicy"></tbody></table></div></div>';
}

function zfZbierzUczestnikow() {
  var lista = [];
  Array.prototype.forEach.call(document.querySelectorAll("#zfUczestnicy .zf-u"), function (p) {
    var i = parseInt(p.getAttribute("data-i"), 10);
    lista[i] = lista[i] || {};
    lista[i][p.getAttribute("data-k")] = p.value.trim();
  });
  return lista.filter(Boolean);
}

function zfRenderUczestnikow() {
  zfEl("zfUczestnicy").innerHTML = ZF.uczestnicy.length ? ZF.uczestnicy.map(zfWierszUczestnika).join("")
    : '<tr><td colspan="' + (KOLUMNY_UCZESTNIKA_ZF.length + 2) + '" class="small muted">Brak uczestników. Formularz bez uczestników zostanie przyjęty z komunikatem o brakach.</td></tr>';
}

function zfDodajUczestnika() {
  ZF.uczestnicy = zfZbierzUczestnikow().concat([{}]);
  zfRenderUczestnikow();
}

function zfUsunUczestnika(i) {
  ZF.uczestnicy = zfZbierzUczestnikow().filter(function (u, j) { return j !== i; });
  zfRenderUczestnikow();
}

/* ------------------------------ pliki ------------------------------ */

function zfWypelnijZCsv(wynik) {
  zfWypelnijPola(wynik.firma);
  ZF.uczestnicy = wynik.uczestnicy;
  zfRenderUczestnikow();
}

function zfKomunikatPliku(tekst, blad) {
  zfEl("zfPlikInfo").textContent = tekst;
  zfEl("zfPlikInfo").style.color = blad ? "var(--neg-ink)" : "var(--pos-ink)";
}

/* Plik zrodlowy formularza zostaje do podgladu (D-287): nazwa, typ, rozmiar i tresc base64 */
function zfDanePliku(plik, tresc) {
  return { nazwa: plik.name, typ: plik.type || null, rozmiar: plik.size, tresc: tresc };
}

function zfObsluzCsv(plik) {
  var czytnik = new FileReader();
  czytnik.onload = function () {
    var wynik = parsujFormularzCsv(String(czytnik.result));
    if (wynik.blad) { zfKomunikatPliku(wynik.blad, true); return; }
    ZF.plik = zfDanePliku(plik, btoa(unescape(encodeURIComponent(String(czytnik.result)))));
    zfWypelnijZCsv(wynik);
    zfKomunikatPliku("Wczytano " + plik.name + ", uczestników: " + wynik.uczestnicy.length + ". Sprawdź dane przed wysłaniem.", false);
  };
  czytnik.readAsText(plik, "utf-8");
}

/* Rozszerzenie decyduje o sposobie: CSV czytamy, XLS odsylamy do zapisu jako CSV, PDF tylko zalaczamy */
function zfWczytajPlik(input) {
  var plik = input.files && input.files[0];
  if (!plik) return;
  var rozszerzenie = plik.name.split(".").pop().toLowerCase();
  if (ZF.zrodlo === "pdf") {
    if (rozszerzenie !== "pdf") { zfKomunikatPliku("Załącz plik w formacie PDF.", true); return; }
    var pdf = new FileReader();
    pdf.onload = function () { ZF.plik = zfDanePliku(plik, String(pdf.result).split(",")[1] || ""); };
    pdf.readAsDataURL(plik);
    zfKomunikatPliku("Załączono " + plik.name + ". " + OPIS_PDF_ZF, false);
  } else if (rozszerzenie === "csv") zfObsluzCsv(plik);
  else if (rozszerzenie === "xls" || rozszerzenie === "xlsx") zfKomunikatPliku(KOMUNIKAT_XLS_ZF, true);
  else zfKomunikatPliku("Wybierz plik CSV.", true);
}

function zfZmienZrodlo() {
  ZF.zrodlo = zfEl("zfZrodlo").value;
  ZF.plik = null;
  zfEl("zfPlikBlok").hidden = ZF.zrodlo === "reczny";
  zfEl("zfSzablonBlok").hidden = ZF.zrodlo !== "csv";
  zfEl("zfOpisPdf").hidden = ZF.zrodlo !== "pdf";
  zfEl("zfPlik").value = "";
  zfEl("zfPlik").accept = ZF.zrodlo === "pdf" ? ".pdf" : ".csv,.xls,.xlsx";
  zfKomunikatPliku("", false);
}

/* Szablon CSV z naglowkami wszystkich pol; Excel otwiera CSV, po wpisaniu danych zapisz jako CSV (D-269) */
function zfPobierzSzablon() {
  var blob = new Blob([szablonCsv()], { type: "text/csv;charset=utf-8" });
  var adres = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = adres;
  link.download = NAZWA_SZABLONU_ZF;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(adres);
}

/* ------------------------------ formularz ------------------------------ */

/* Instytucja: konto instytucji ma ja ustawiona na sztywno, konto LDIT wybiera z listy (D-269) */
function zfBlokInstytucji(o) {
  if (o.instytucje) return zfWybor("zfInst", "Instytucja szkoleniowa (formularz trafi do jej klientów)", o.instytucje, "");
  var inst = (DB.INSTYTUCJE || []).filter(function (i) { return i.id === o.instytucjaId; })[0];
  var nazwa = o.instytucjaNazwa || (inst ? inst.nazwa : o.instytucjaId);
  return zfWiersz("", "Instytucja szkoleniowa", '<span>Formularz zostanie przypisany do instytucji: <b>' + esc(nazwa) + '</b>.</span>');
}

function zfBlokPliku() {
  return zfWiersz("zfPlik", "Plik formularza", '<div class="zf-plik">' +
    '<div id="zfSzablonBlok" hidden class="small" style="margin-bottom:6px">Pobierz szablon, uzupełnij go w Excelu, zapisz jako CSV i wczytaj poniżej. ' +
    '<button type="button" class="btn xs" onclick="zfPobierzSzablon()">Pobierz szablon</button></div>' +
    '<div id="zfOpisPdf" hidden class="note warn" style="margin-bottom:6px">' + esc(OPIS_PDF_ZF) + '</div>' +
    '<input type="file" id="zfPlik" accept=".csv,.xls,.xlsx" onchange="zfWczytajPlik(this)">' +
    '<div class="small" id="zfPlikInfo" role="status" style="margin-top:4px"></div></div>', { idWiersza: "zfPlikBlok", ukryty: true });
}

function zfHtml(o) {
  var zrodla = [["reczny", "ręcznie w systemie"], ["csv", "plik CSV lub XLS z szablonu"], ["pdf", "plik PDF o stałej strukturze"]];
  /* Edycja wyslanego formularza (D-314): bez wyboru zrodla i pliku, ktore zostaja z wyslania */
  var e = o.edycja;
  var przycisk = !e ? "Wyślij do akceptacji LDIT" : e.zwrot ? "Zapisz i wyślij ponownie" : "Zapisz zmiany";
  return '<div class="zf-formularz"><div class="small strong" style="margin-bottom:8px">' + (e ? "Edycja formularza " + esc(e.id) : "Nowy formularz klienta do akceptacji") + '</div>' +
    '<div class="small muted" style="margin-bottom:8px">Do zapisania wystarczą nazwa firmy i NIP (pola z gwiazdką). Brakujące dane uzupełnisz później przyciskiem Edytuj, ' +
    'ale LDIT zaakceptuje tylko kompletny formularz.</div>' +
    zfArkusz("Zgłoszenie", [zfBlokInstytucji(o)].concat(e ? [] : [zfWybor("zfZrodlo", "Sposób wprowadzenia", zrodla, "reczny", true), zfBlokPliku()])) +
    zfSekcjeHtml(o) + zfTabelaUczestnikow() +
    '<div style="margin-top:8px"><button type="button" class="btn sm" onclick="zfDodajUczestnika()">+ Dodaj uczestnika</button></div>' +
    '<div class="btn-row" style="margin-top:12px" data-przewodnik="formularz-wyslij"><button class="btn primary sm" onclick="zfWyslij()">' + przycisk + '</button>' +
    (o.bezAnulowania ? "" : '<button class="btn sm" onclick="zfZamknij()">Anuluj</button>') +
    '</div><div class="small" id="zfKomunikat" role="status" style="margin-top:6px"></div></div>';
}

/* opcje: { kontener, instytucjaId (+ instytucjaNazwa) albo instytucje [[id, nazwa]], szkolenia [[nazwa, nazwa]],
   poWyslaniu(nowy, braki), poZamknieciu() opcjonalnie, bezAnulowania i zostaje opcjonalnie (strona Nowy formularz) } */
function zfPokaz(opcje) {
  ZF = { opcje: opcje, zrodlo: "reczny", plik: null, uczestnicy: [] };
  zfWczytajStyl();
  var kontener = zfEl(opcje.kontener);
  kontener.innerHTML = zfHtml(opcje);
  kontener.style.display = "";
  if (zfEl("zfZrodlo")) zfEl("zfZrodlo").addEventListener("change", zfZmienZrodlo);
  zfEl("zf_zadluzenie").addEventListener("change", zfPrzelaczUgode);
  /* Nazwa skrocona idzie za pelna nazwa, dopoki nie zostala skrocona recznie (spotkanie 14.10) */
  zfEl("zf_firma").addEventListener("input", function () { zfNadazSkrocona(zfEl("zf_nazwa_skrocona"), zfEl("zf_firma").value); });
  if (opcje.edycja) zfWypelnijZFormularza(opcje.edycja.id);
  zfRenderUczestnikow();
}

function zfZamknij() {
  var kontener = zfEl(ZF.opcje.kontener);
  kontener.style.display = "none";
  kontener.innerHTML = "";
  if (ZF.opcje.poZamknieciu) ZF.opcje.poZamknieciu();
}

function zfOdczytaj() {
  var dane = zfOdczytajPola();
  dane.firma = dane.firma || "";
  dane.uczestnicy = zfZbierzUczestnikow();
  dane.zrodlo = ZF.zrodlo;
  dane.plik = ZF.plik;
  dane.instytucja_id = ZF.opcje.instytucjaId || (zfEl("zfInst") ? zfEl("zfInst").value : "");
  return dane;
}

/* Komunikat dla wysylajacego: formularz z brakami jest przyjety, ale wskazujemy braki (D-245) */
function tekstBrakowFormularza(braki) {
  return braki.length ? "Niekompletne dane przesłanego formularza. Brakuje: " + braki.join(", ") + ". Formularz został zapisany. LDIT zaakceptuje go po uzupełnieniu danych."
    : "Formularz kompletny.";
}

function zfWyslij() {
  if (ZF.opcje.edycja) { zfZapiszEdycje(); return; }
  try {
    var nowy = Akceptacje.zglosFormularz(zfOdczytaj(), Akceptacje.ktoTeraz());
    var wiersz = DB.KOLEJKA.filter(function (k) { return k.id === nowy.id; })[0];
    var opcje = ZF.opcje;
    zfZamknij();
    opcje.poWyslaniu(nowy, wiersz ? wiersz.braki : []);
  } catch (e) {
    if (!(e instanceof Akceptacje.AkceptacjeError) && e.name !== "StraznikError") throw e;
    zfEl("zfKomunikat").textContent = e.message;
    zfEl("zfKomunikat").style.color = "var(--neg-ink)";
  }
}
