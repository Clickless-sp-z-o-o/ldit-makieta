/* Ekran Do akceptacji: prosby pracownikow LDIT o usuniecie wniosku (spotkanie 14.10.2026). Sekcja widoczna
   tylko dla administratora (UsuwanieWniosku.administrator), z linkiem do karty wniosku i tymi samymi
   przyciskami co na karcie: "Zatwierdz usuniecie" (miekkie usuniecie jak dotad na liscie) i "Odrzuc"
   (pola prosby wracaja do pustych). Logika: 03-wniosek-usuwanie-logika.js.
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function wierszProsby20(w) {
  var p = w.usuniecieProsba;
  return '<tr data-wniosek="' + esc(w.id) + '"><td class="nowrap"><a class="link-rekordu" href="' +
    esc(Nawigacja.adresKarty(w.id, "20-akceptacje.html")) + '">' + esc(w.id) + '</a></td>' +
    '<td>' + esc(w.klNazwa) + '</td><td>' + esc(w.isNazwa) + '</td>' +
    '<td>' + esc(UsuwanieWniosku.kto(p.od)) + '<div class="small muted">' + esc(DB.fmtDate(p.czas)) + '</div></td>' +
    '<td>' + esc(p.powod || "brak powodu") + '</td>' +
    '<td class="right nowrap"><button class="btn xs danger" data-zatwierdz="' + esc(w.id) + '">Zatwierdź usunięcie</button> ' +
    '<button class="btn xs" data-odrzuc="' + esc(w.id) + '">Odrzuć</button></td></tr>';
}

function renderProsby20() {
  var kontener = document.getElementById("prosbyUsuniecia20");
  if (!kontener) return;
  if (!UsuwanieWniosku.administrator()) { kontener.hidden = true; kontener.innerHTML = ""; return; }
  var lista = UsuwanieWniosku.prosby();
  kontener.hidden = false;
  kontener.innerHTML = '<div class="card-head"><h3>Prośby o usunięcie wniosku</h3><span class="sub">' + lista.length +
    ' czeka na decyzję</span><span class="tip-mark" data-tip="Pracownik LDIT nie usuwa wniosku sam, tylko prosi o to z powodem. ' +
    'Zatwierdzenie usuwa wniosek z listy (klient zostaje w Bazie danych, wniosek można przywrócić), odrzucenie zostawia go bez zmian. Każda decyzja trafia do rejestru aktywności.">i</span></div>' +
    (lista.length
      ? '<div class="card-body tight" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Wniosek</th><th>Klient</th><th>Instytucja</th><th>Prosi</th><th>Powód</th><th></th></tr></thead><tbody>' +
        lista.map(wierszProsby20).join("") + '</tbody></table></div>'
      : '<div class="card-body small muted">Brak próśb o usunięcie wniosku.</div>') +
    '<div class="small muted" id="wynikProsby20" role="status" style="padding:0 14px 10px"></div>';
}

function decyzjaProsby20(id, zatwierdz) {
  var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === id; })[0];
  if (!w) return;
  var pytanie = zatwierdz ? (typeof tekstUsuniecia === "function" ? tekstUsuniecia(w) : "Usunąć wniosek " + w.id + "?")
    : "Odrzucić prośbę o usunięcie wniosku " + w.id + "? Wniosek zostaje na liście.";
  if (!window.confirm(pytanie)) return;
  var wynik = zatwierdz ? UsuwanieWniosku.zatwierdz(id) : UsuwanieWniosku.odrzucProsbe(id);
  renderProsby20();
  document.getElementById("wynikProsby20").textContent = wynik.ok
    ? (zatwierdz ? "Wniosek " + id + " usunięty z listy." : "Prośba o usunięcie wniosku " + id + " odrzucona.")
    : wynik.bledy.join(" ");
}

function inicjujProsby20() {
  var kontener = document.getElementById("prosbyUsuniecia20");
  if (!kontener) return;
  kontener.addEventListener("click", function (e) {
    var tak = e.target.closest("[data-zatwierdz]"), nie = e.target.closest("[data-odrzuc]");
    if (tak) decyzjaProsby20(tak.getAttribute("data-zatwierdz"), true);
    if (nie) decyzjaProsby20(nie.getAttribute("data-odrzuc"), false);
  });
  renderProsby20();
}
