/* Nabory: przyciski przy kliencie urzedu i okienko "Dodaj notatke" (D-266).
   Notatka trafia do tabeli notatki_klienta przez Store.insert, wiec pilnuje jej straznik zapisow
   (modul nabory) i zakres klientow konta. Tylko deklaracje. */

var MAKS_DLUGOSC_NOTATKI = 2000;

function przyciskiKlienta05(k) {
  var html = '<a class="btn xs" href="' + esc(Nawigacja.adresKlienta(k.id)) + '">Karta klienta</a>';
  if (Auth.edytujeModul("nabory")) {
    html += ' <button class="btn xs" onclick="otworzNotatke05(\'' + escJs(k.id) + '\')">Dodaj notatkę</button>';
  }
  return html;
}

function klientPoId05(id) {
  return DB.KLIENCI.filter(function (k) { return k.id === id; })[0] || null;
}

function otworzNotatke05(id) {
  var k = klientPoId05(id);
  if (!k) return;
  var tlo = document.createElement("div");
  tlo.className = "okno-tlo";
  tlo.id = "oknoNotatki";
  tlo.innerHTML = '<div class="okno" role="dialog" aria-modal="true">' +
    '<div class="okno-head"><b>Notatka: ' + esc(k.nazwa) + '</b></div>' +
    '<div class="okno-body"><textarea class="inp" id="trescNotatki05" rows="5" maxlength="' + MAKS_DLUGOSC_NOTATKI +
    '" placeholder="Treść notatki"></textarea>' +
    '<div class="small muted" id="bladNotatki05" style="color:var(--neg,#b91c1c)"></div></div>' +
    '<div class="okno-foot"><button class="btn" onclick="zamknijNotatke05()">Anuluj</button>' +
    '<button class="btn primary" onclick="zapiszNotatke05(\'' + escJs(id) + '\')">Zapisz notatkę</button></div></div>';
  document.body.appendChild(tlo);
  document.getElementById("trescNotatki05").focus();
}

function zamknijNotatke05() {
  var tlo = document.getElementById("oknoNotatki");
  if (tlo) tlo.remove();
}

/* Zwraca zapisany wiersz albo null, gdy tresc jest pusta lub klient poza zakresem */
function dodajNotatke05(id, tresc) {
  var k = klientPoId05(id);
  var tekst = String(tresc || "").trim();
  if (!k || !tekst) return null;
  var kto = Akceptacje.ktoTeraz();
  return Store.insert("notatki_klienta", { klient_id: k.id, instytucja_id: k.is, czas: kto.czas,
                                   autor_id: kto.uzytkownik, tresc: tekst }, "NOT-");
}

function zapiszNotatke05(id) {
  var blad = document.getElementById("bladNotatki05");
  if (!dodajNotatke05(id, document.getElementById("trescNotatki05").value)) {
    blad.textContent = "Wpisz treść notatki.";
    return;
  }
  zamknijNotatke05();
}
