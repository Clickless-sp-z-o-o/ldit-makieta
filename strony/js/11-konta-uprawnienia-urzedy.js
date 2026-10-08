/* Ustawienia, zakladka Slowniki: jeden slownik urzedow pracy z aliasami (D-272).
   Wgrywa go i zmienia wylacznie administrator (zapis do urzedy_pracy tylko z modulu
   Ustawienia, sprawdza to straznik). Aliasy to nazwy, pod ktorymi urzad przychodzi
   w plikach naborow. Same deklaracje. */

var SEPARATOR_ALIASOW_11 = "|";

function aliasyZTekstu11(tekst) {
  return String(tekst || "").split(/[|,]/).map(function (a) { return a.trim(); }).filter(Boolean);
}

/* Zapis aliasow jednego urzedu; zwraca liste zapisanych aliasow */
function zapiszAliasy11(urzadId, tekst) {
  var aliasy = aliasyZTekstu11(tekst);
  Store.update("urzedy_pracy", urzadId, { aliasy: JSON.stringify(aliasy) });
  return aliasy;
}

/* Wgranie slownika z pliku: wiersz z istniejaca nazwa aktualizuje urzad, nowa nazwa dodaje urzad.
   Kolumny: nazwa, wojewodztwo, powiat, aliasy (rozdzielone |). Zwraca {nowe, zaktualizowane}. */
function wgrajSlownik11(wiersze) {
  var wynik = { nowe: 0, zaktualizowane: 0 };
  wiersze.forEach(function (w) {
    var dane = { nazwa: (w.nazwa || "").trim(), wojewodztwo: (w.wojewodztwo || "").trim(), powiat: (w.powiat || "").trim(),
                 aliasy: JSON.stringify(aliasyZTekstu11(w.aliasy)) };
    var istniejacy = Store.one("SELECT id FROM urzedy_pracy WHERE nazwa = ?", [dane.nazwa]);
    if (istniejacy) { Store.update("urzedy_pracy", istniejacy.id, dane); wynik.zaktualizowane++; }
    else { Store.insert("urzedy_pracy", dane, "PUP-"); wynik.nowe++; }
  });
  return wynik;
}

function renderUrzedy11() {
  var urzedy = Store.query("SELECT id, nazwa, wojewodztwo, powiat, aliasy FROM urzedy_pracy ORDER BY nazwa");
  return '<div class="card-head"><h3>Słownik urzędów pracy</h3><span class="sub">' + urzedy.length + ' urzędów, nazwy i aliasy z plików naborów</span>' +
    '<div class="ch-actions"><label class="btn sm">Wgraj słownik (CSV)<input type="file" id="plikSlownika11" accept=".csv,text/csv" hidden></label></div></div>' +
    '<div class="card-body tight" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>Urząd</th><th>Powiat</th><th>Województwo</th>' +
    '<th>Aliasy (rozdziel znakiem |)<span class="tip-mark" data-tip="Nazwy, pod którymi urząd przychodzi w plikach naborów. Urząd spoza nazw i aliasów trafia do powiadomień (D-272).">i</span></th><th></th></tr></thead><tbody>' +
    urzedy.map(function (u) {
      return '<tr><td class="strong">' + esc(u.nazwa) + '</td><td class="muted">' + esc(u.powiat) + '</td><td class="muted">' + esc(u.wojewodztwo) + '</td>' +
        '<td><input class="inp" style="width:100%" id="alias11_' + esc(u.id) + '" value="' + esc(JSON.parse(u.aliasy || "[]").join(" " + SEPARATOR_ALIASOW_11 + " ")) + '"></td>' +
        '<td><button class="btn xs" data-zapisz-alias="' + esc(u.id) + '">Zapisz</button></td></tr>';
    }).join("") + "</tbody></table></div>";
}

function podepnijUrzedy11(host) {
  host.querySelectorAll("[data-zapisz-alias]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-zapisz-alias");
      zapiszAliasy11(id, document.getElementById("alias11_" + id).value);
      KFS.zapiszTeraz();
    });
  });
  document.getElementById("plikSlownika11").addEventListener("change", function (e) {
    var plik = e.target.files[0];
    if (!plik) return;
    var czytnik = new FileReader();
    czytnik.onload = function () {
      var wynik;
      try { wynik = wgrajSlownik11(NaboryImport.parsujCsv(czytnik.result)); }
      catch (blad) {
        if (!(blad instanceof NaboryImport.NaboryImportError) && !(blad instanceof Straznik.StraznikError)) throw blad;
        window.alert(blad.message);
        return;
      }
      KFS.zapiszTeraz();
      window.alert("Słownik wgrany: nowe urzędy " + wynik.nowe + ", zaktualizowane " + wynik.zaktualizowane + ".");
    };
    czytnik.readAsText(plik);
    e.target.value = "";
  });
}
