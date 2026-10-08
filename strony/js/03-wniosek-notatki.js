/* Karta wniosku: notatki wniosku, osobno od notatek klienta (D-284). Zapis do notatki_wniosku
   przez Store, wiec pilnuje go straznik; instytucja notatki to instytucja wniosku (D-295).
   Tylko deklaracje. */

function notatkiWniosku03() {
  return Store.query("SELECT n.*, u.imie_nazwisko AS autor FROM notatki_wniosku n LEFT JOIN uzytkownicy u ON u.id = n.autor_id " +
                     "WHERE n.wniosek_id = ? ORDER BY n.czas DESC", [STAN_03.w.id]);
}

/* Zwraca zapisana notatke albo null, gdy tresc jest pusta */
function dodajNotatkeWniosku03(tresc) {
  var t = String(tresc || "").trim();
  if (!t) return null;
  var kto = Akceptacje.ktoTeraz();
  return Store.insert("notatki_wniosku", { wniosek_id: STAN_03.w.id, instytucja_id: STAN_03.raw.instytucja_id,
                                           czas: kto.czas, autor_id: kto.uzytkownik, tresc: t }, "NW-");
}

function renderNotatkiWniosku03() {
  var lista = notatkiWniosku03();
  var formularz = STAN_03.mozeEdytowac
    ? '<div class="btn-row" style="padding:8px 12px"><input class="inp" id="trescNotatkiWniosku" style="flex:1" placeholder="Notatka do tego wniosku...">' +
      '<button class="btn sm" id="btnNotatkaWniosku">+ Notatka wniosku</button></div>'
    : "";
  el("notatkiWniosku").innerHTML = '<div class="small strong" style="padding:10px 12px 4px">Notatki wniosku <span class="ref">D-284</span></div>' +
    (lista.length ? lista.map(function (n) {
      return '<div class="small" style="padding:4px 12px"><span class="muted">' + esc(n.czas) + " &middot; " + esc(n.autor || "") + "</span> " + esc(n.tresc) + "</div>";
    }).join("") : '<div class="small muted" style="padding:4px 12px">Brak notatek wniosku.</div>') + formularz;
  var przycisk = el("btnNotatkaWniosku");
  if (przycisk) przycisk.addEventListener("click", function () {
    if (dodajNotatkeWniosku03(el("trescNotatkiWniosku").value)) renderNotatkiWniosku03();
  });
}
