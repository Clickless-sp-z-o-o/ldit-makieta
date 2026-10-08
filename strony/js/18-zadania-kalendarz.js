/* Zadania: kalendarz zadan w widokach Miesiac, Tydzien i Dzien, z numerami tygodni ISO (D-246,
   uwaga z oceny makiety 08.10). Klikniecie dnia otwiera widok dnia, klikniecie zadania jego
   szczegoly: karte wniosku albo edycje zadania. Logika siatek w 18-zadania-logika.js. Tylko deklaracje. */
var MIESIACE_18 = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec",
                   "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
var DNI_TYGODNIA_18 = ["pon", "wt", "śr", "czw", "pt", "sob", "ndz"];
var WIDOKI_KALENDARZA_18 = [{ id: "miesiac", nazwa: "Miesiąc" }, { id: "tydzien", nazwa: "Tydzień" }, { id: "dzien", nazwa: "Dzień" }];
var ZADAN_W_KOMORCE_18 = 3;

function ustawKalendarz18() {
  if (!STAN_18.kalWidok) STAN_18.kalWidok = "miesiac";
  if (!STAN_18.kalData) STAN_18.kalData = dzisiaj();
}

function zmienWidokKalendarza18(widok, iso) {
  STAN_18.kalWidok = widok;
  if (iso) STAN_18.kalData = iso;
  renderKalendarz18();
}

function przesunKalendarz18(kierunek) {
  STAN_18.kalData = kierunek ? Zadania18.przesunOkres(STAN_18.kalWidok, STAN_18.kalData, kierunek) : dzisiaj();
  renderKalendarz18();
}

/* Zadanie w kalendarzu prowadzi do szczegolow: karta wniosku albo edycja zadania bez wniosku */
function otworzZadanie18(id) {
  var z = DB.ZADANIA.filter(function (x) { return x.id === id; })[0];
  if (!z) return;
  var cel = Zadania18.szczegolyZadania(z);
  if (cel.rodzaj === "wniosek") location.href = cel.adres;
  else if (STAN_18.moznaEdytowac && Zadania18.mozeZmieniac(z, STAN_18.sesja.uzytkownik_id, STAN_18.widziWszystkie)) edytujZadanie(z.id);
}

function chipZadania18(z) {
  var klasa = "kal-zad" + (z.status !== "otwarte" ? " zrobione" : "") + (z.status === "otwarte" && z.termin < dzisiaj() ? " zalegle" : "");
  return '<button type="button" class="' + klasa + '" onclick="event.stopPropagation();otworzZadanie18(\'' + escJs(z.id) + '\')"' +
    ' title="' + esc(z.tytul + " · " + opisWniosku(z.wniosek_id)) + '">' + esc(z.tytul) + "</button>";
}

function tytulOkresu18() {
  var d = STAN_18.kalData;
  if (STAN_18.kalWidok === "dzien") return DB.fmtDate(d);
  if (STAN_18.kalWidok === "tydzien") {
    var t = Zadania18.siatkaTygodnia(d, []);
    return "tydzień " + t.tydzien + ", " + DB.fmtDate(t.od) + " - " + DB.fmtDate(t.do);
  }
  return MIESIACE_18[+d.slice(5, 7) - 1] + " " + d.slice(0, 4);
}

function komorkaMiesiaca18(d, dzis) {
  var widoczne = d.zadania.slice(0, ZADAN_W_KOMORCE_18).map(chipZadania18).join("");
  var wiecej = d.zadania.length > ZADAN_W_KOMORCE_18 ? '<span class="kal-wiecej">+' + (d.zadania.length - ZADAN_W_KOMORCE_18) + "</span>" : "";
  return '<div class="kal-dzien' + (d.poza ? " poza" : "") + (d.iso === dzis ? " dzis" : "") + '" data-klik tabindex="0" role="button"' +
    ' aria-label="' + esc(DB.fmtDate(d.iso) + ", zadań: " + d.zadania.length) + '" onclick="zmienWidokKalendarza18(\'dzien\', \'' + d.iso + '\')">' +
    '<div class="kal-nr">' + d.dzien + "</div>" + widoczne + wiecej + "</div>";
}

function widokMiesiaca18(zadania) {
  var d = STAN_18.kalData, dzis = dzisiaj();
  var tygodnie = Zadania18.siatkaMiesiaca(+d.slice(0, 4), +d.slice(5, 7) - 1, zadania);
  var naglowek = '<div class="kal-tydz kal-glowa">tydz.</div>' + DNI_TYGODNIA_18.map(function (n) { return '<div class="kal-glowa">' + n + "</div>"; }).join("");
  return '<div class="kal-siatka">' + naglowek + tygodnie.map(function (t) {
    return '<div class="kal-tydz">' + t.tydzien + "</div>" + t.dni.map(function (x) { return komorkaMiesiaca18(x, dzis); }).join("");
  }).join("") + "</div>";
}

function widokTygodnia18(zadania) {
  var t = Zadania18.siatkaTygodnia(STAN_18.kalData, zadania), dzis = dzisiaj();
  return '<div class="kal-tydzien">' + t.dni.map(function (d, i) {
    return '<div class="kal-kolumna' + (d.iso === dzis ? " dzis" : "") + '">' +
      '<button type="button" class="kal-kol-glowa" onclick="zmienWidokKalendarza18(\'dzien\', \'' + d.iso + '\')">' +
      DNI_TYGODNIA_18[i] + " " + esc(DB.fmtDate(d.iso)) + "</button>" +
      (d.zadania.map(chipZadania18).join("") || '<div class="small muted">brak</div>') + "</div>";
  }).join("") + "</div>";
}

function widokDnia18(zadania) {
  var lista = Zadania18.zadaniaDnia(zadania, STAN_18.kalData);
  return lista.length ? lista.map(wierszZadania).join("") : '<div class="empty"><div class="et">Brak zadań w tym dniu</div></div>';
}

function renderKalendarz18() {
  ustawKalendarz18();
  var zadania = mojeZadania().filter(function (z) { return z.termin && z.status !== "anulowane"; });
  var widok = { miesiac: widokMiesiaca18, tydzien: widokTygodnia18, dzien: widokDnia18 }[STAN_18.kalWidok];
  document.getElementById("kalWidoki").innerHTML = WIDOKI_KALENDARZA_18.map(function (w) {
    return '<button type="button" class="btn xs' + (w.id === STAN_18.kalWidok ? " primary" : "") + '" aria-pressed="' + (w.id === STAN_18.kalWidok) +
      '" onclick="zmienWidokKalendarza18(\'' + w.id + '\')">' + w.nazwa + "</button>";
  }).join("");
  document.getElementById("kalOkres").textContent = tytulOkresu18();
  document.getElementById("kalTresc").innerHTML = widok(zadania);
}
