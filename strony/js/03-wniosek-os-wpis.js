/* Karta wniosku: reczny wpis przebiegu z wykonawca etapu (D-285). Wpis ma autora (kto wpisal)
   i wykonawce (kto wykonuje etap). Wpis z wykonawca tworzy zadanie przypisane do niego, widoczne
   w Zadaniach; przypisac mozna tylko konto pracownika (w tym administratora). Przypisanie
   innej osobie wymaga uprawnienia zespol.zadania (D-246), co sprawdza straznik.
   Zwraca {ok, id, zadanieId} albo {ok:false, bledy}. Same deklaracje. */

function dodajWpisReczny03(wniosek, dane) {
  var opis = String(dane.opis || "").trim();
  if (!opis) return { ok: false, bledy: ["Opisz etap albo zdarzenie."] };
  var wykonawca = dane.wykonawcaId || null;
  if (wykonawca && !SzkoleniaWniosku.kontaLdit().some(function (k) { return k.id === wykonawca; })) {
    return { ok: false, bledy: ["Wykonawcą może być tylko konto pracownika."] };
  }
  if (dane.termin && !/^\d{4}-\d{2}-\d{2}$/.test(dane.termin)) return { ok: false, bledy: ["Termin w formacie RRRR-MM-DD."] };
  var kto = Akceptacje.ktoTeraz();
  var zadanie = wykonawca ? Store.insert("zadania", {
    tytul: opis, typ: "reczne", wniosek_id: wniosek.id, termin: dane.termin || kto.czas.slice(0, 10), status: "otwarte",
    przypisane_do: wykonawca, utworzono: kto.czas, utworzyl_id: kto.uzytkownik, zrodlo_statusu: "przebieg wniosku"
  }, "ZAD-") : null;
  var wpis = Store.insert("przebieg_wniosku", {
    wniosek_id: wniosek.id, instytucja_id: wniosek.is, rodzaj: "reczny", czas: kto.czas, etap_z: null, etap_do: null,
    komentarz: opis, uzytkownik_id: kto.uzytkownik, wykonawca_id: wykonawca, zadanie_id: zadanie ? zadanie.id : null
  }, "PRZ-");
  return { ok: true, id: wpis.id, zadanieId: zadanie ? zadanie.id : null };
}

function formularzWpisu03() {
  if (!STAN_03.mozeEdytowac) return "";
  return '<div class="small strong" style="margin-top:12px">Wpis ręczny z wykonawcą <span class="ref">D-285</span>' +
    '<span class="tip-mark" data-tip="Wpis na osi czasu, np. wysłano harmonogram. Wykonawca etapu dostaje zadanie w Zadaniach.">i</span></div>' +
    '<div class="formularz-osi">' +
    '<input class="inp" id="wpisOpis" placeholder="np. umowa wysłana do urzędu" aria-label="Opis wpisu">' +
    '<select class="inp" id="wpisWykonawca" aria-label="Wykonawca"><option value="">bez wykonawcy</option>' +
    SzkoleniaWniosku.kontaLdit().map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.imie) + "</option>"; }).join("") +
    '</select><input class="inp" id="wpisTermin" type="date" aria-label="Termin dla wykonawcy">' +
    '<button class="btn sm" onclick="klikWpisReczny03()">Dodaj wpis</button></div>';
}

function klikWpisReczny03() {
  var wynik;
  try {
    wynik = dodajWpisReczny03(STAN_03.w, { opis: el("wpisOpis").value, wykonawcaId: el("wpisWykonawca").value, termin: el("wpisTermin").value });
  } catch (e) {
    if (!(e instanceof Straznik.StraznikError)) throw e;
    wynik = { ok: false, bledy: [e.message] };
  }
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  el("wpisOpis").value = ""; el("wpisTermin").value = "";
  renderPrzebieg();
  komunikat(wynik.zadanieId ? "Dodano wpis i zadanie dla wykonawcy." : "Dodano wpis do przebiegu.");
}

function nazwaKonta03(id) {
  var k = SzkoleniaWniosku.kontaLdit().filter(function (x) { return x.id === id; })[0];
  return k ? k.imie : id;
}
