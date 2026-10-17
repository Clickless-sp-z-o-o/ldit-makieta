/* Wysylka maili, zakladka 3: automatyczne maile do instytucji a przelacznik per instytucja
   "Wysylaj automatyczne powiadomienia do instytucji" (instytucje.powiadomienia_auto, spotkanie 14.10.2026).
   Przy wylaczonym przelaczniku automatyzacje nie wysylaja do tej instytucji nic: ani prosby o termin,
   ani przypomnienia przed szkoleniem. Przyklad: Metal Maniak ma kalendarz na caly rok, terminy wpisuje LDIT.
   Przelacznik ustawia sie w konfiguracji instytucji (06-instytucje). Tylko deklaracje. */
var POMINIETO_POWIADOMIENIA_09 = "pominięto: powiadomienia wyłączone";
var POMINIETO_PROSBA_09 = "pominięto: prośba o termin wyłączona";
var DNI_PRZYPOMNIENIA_09 = 8;
var LIMIT_KOLEJKI_09 = 12;

function czyPowiadomieniaAuto09(instytucjaId) {
  var r = Store.find("instytucje", instytucjaId);
  return !!r && r.powiadomienia_auto !== 0;
}

/* Decyzja automatu dla jednej instytucji. rodzaj: "prosba_termin" albo "przypomnienie" */
function decyzjaAutomatu09(instytucjaId, rodzaj) {
  if (!czyPowiadomieniaAuto09(instytucjaId)) return { wyslij: false, powod: POMINIETO_POWIADOMIENIA_09 };
  if (rodzaj === "prosba_termin" && typeof czyProsbaWlaczona === "function" && !czyProsbaWlaczona(instytucjaId)) {
    return { wyslij: false, powod: POMINIETO_PROSBA_09 };
  }
  return { wyslij: true, powod: "wyśle automatycznie" };
}

function nazwaInstytucji09(id) {
  var i = DB.INSTYTUCJE.filter(function (x) { return x.id === id; })[0];
  return i ? i.nazwa : id;
}

/* Kolejka automatycznych maili do instytucji: prosby o termin po decyzji pozytywnej (wniosek bez terminu)
   i przypomnienia 8 dni przed zaplanowanym szkoleniem. Kazda pozycja z decyzja automatu. */
function kolejkaAutomatow09() {
  var prosby = DB.WNIOSKI_WSZYSTKIE.filter(function (w) {
    return w.statusDec === "Pozytywna" && w.rozliczenie === "Oczekuje" && !w.szkolenieOd;
  }).map(function (w) {
    return { kiedy: w.dataWniosku || "", co: "Prośba o ustalenie terminu", isId: w.is, opis: w.klNazwa + " (wniosek " + (w.nr || w.id) + ")",
             d: decyzjaAutomatu09(w.is, "prosba_termin") };
  });
  var przypomnienia = DB.TERMINY.filter(function (t) { return t.status === "Zaplanowany"; }).map(function (t) {
    return { kiedy: minus8(t.od), co: "Przypomnienie o szkoleniu (" + DNI_PRZYPOMNIENIA_09 + " dni przed)", isId: t.is,
             opis: t.nazwa + ", start " + DB.fmtDate(t.od), d: decyzjaAutomatu09(t.is, "przypomnienie") };
  });
  return prosby.concat(przypomnienia).sort(function (a, b) {
    if (a.d.wyslij !== b.d.wyslij) return a.d.wyslij ? 1 : -1;
    return String(a.kiedy).localeCompare(String(b.kiedy));
  });
}

function wierszKolejki09(p) {
  return "<tr><td class=\"small nowrap\">" + esc(p.kiedy ? DB.fmtDate(p.kiedy) : "-") + "</td><td class=\"strong\">" + esc(p.co) + "</td>" +
    "<td>" + esc(nazwaInstytucji09(p.isId)) + "<div class=\"small muted\">" + esc(p.opis) + "</div></td>" +
    "<td>" + (p.d.wyslij ? '<span class="tag pos dot">' + esc(p.d.powod) + "</span>" : '<span class="tag mute dot">' + esc(p.d.powod) + "</span>") + "</td></tr>";
}

function renderKolejkaAutomatow09() {
  var box = document.getElementById("kolejkaAutomatowBox");
  if (!box) return;
  var lista = kolejkaAutomatow09();
  var pominiete = lista.filter(function (p) { return !p.d.wyslij; });
  var wylaczone = DB.INSTYTUCJE.filter(function (i) { return !czyPowiadomieniaAuto09(i.id); }).map(function (i) { return i.nazwa; });
  var pokaz = pominiete.concat(lista.filter(function (p) { return p.d.wyslij; })).slice(0, Math.max(LIMIT_KOLEJKI_09, pominiete.length));
  box.innerHTML = "<div class=\"card\"><div class=\"card-head\"><h3>Automatyczne maile do instytucji</h3>" +
    "<span class=\"sub\">najbliższe wyzwolenia i ich stan</span><div class=\"ch-actions\"><span class=\"tag mute\">" +
    pominiete.length + " pominiętych z " + lista.length + "</span></div></div>" +
    "<div class=\"card-body\" style=\"padding-bottom:0\"><div class=\"small\">Instytucje z wyłączonymi automatycznymi powiadomieniami: <b id=\"instBezPowiadomien\">" +
    esc(wylaczone.join(", ") || "brak") + "</b>. Przełącznik jest w konfiguracji instytucji, zakładka Konto instytucji.</div></div>" +
    "<div class=\"card-body tight\"><div class=\"tbl-wrap\"><table class=\"tbl\"><thead><tr><th>Kiedy</th><th>Automat</th><th>Instytucja</th><th>Stan</th></tr></thead>" +
    "<tbody id=\"tbKolejkaAutomatow\">" + (pokaz.length ? pokaz.map(wierszKolejki09).join("") :
      "<tr><td colspan=\"4\" class=\"small muted\">Brak zaplanowanych automatycznych maili do instytucji.</td></tr>") +
    "</tbody></table></div></div></div>";
}
