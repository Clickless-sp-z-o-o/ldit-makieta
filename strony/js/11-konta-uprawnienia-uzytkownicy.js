/* Konta i uprawnienia, zakladka 1: lista uzytkownikow, filtry, alert 2FA */
function odswiezFiltrRoli() {
  var sel = document.getElementById("fRola");
  var wybrane = Wielowybor.wartosci(sel);
  sel.innerHTML = DB.ROLE.map(function (r) {
    return '<option value="' + esc(r.nazwa) + '">' + esc(r.nazwa) + '</option>';
  }).join("");
  Wielowybor.ustaw(sel, wybrane);
}

/* Kolor tagu wynika z features roli (zarzadzanie ustawieniami), nie z nazwy roli */
function tagRoli(nazwa) {
  var r = DB.ROLE.filter(function (x) { return x.nazwa === nazwa; })[0];
  var k = !r ? "mute" : rolaMaFunkcje(r.id, "ustaw.manage") ? "set" : r.typ === "pracownik" ? "info" : r.typ === "instytucja" ? "pos" : "mute";
  return '<span class="tag ' + k + '">' + esc(nazwa) + '</span>';
}

function wierszUsera(u) {
  return '<tr class="' + (u["2fa"] ? "" : "no2fa") + '">' +
    '<td class="strong">' + esc(u.imie) + '<div class="small muted mono">' + esc(u.login) + '</div></td>' +
    '<td>' + tagRoli(u.rola) + '</td>' +
    '<td class="small">' + (u.inst === "wszystkie"
        ? '<span class="tag set">wszystkie instytucje</span>'
        : esc(u.inst)) + '</td>' +
    '<td class="c">' + (u["2fa"]
        ? '<span class="tag pos dot">włączone</span>'
        : '<span class="tag neg dot">wyłączone</span>') + '</td>' +
    '<td class="mono muted nowrap">' + esc(DB.fmtDate(u.ost)) + '</td>' +
    '<td class="right nowrap">' +
      '<button class="btn xs" onclick="edytujUsera(\'' + escJs(u.login) + '\')">Edytuj</button> ' +
      '<button class="btn xs" onclick="usunUsera(\'' + escJs(u.login) + '\')">Usuń</button> ' +
      '<button class="btn xs danger" onclick="blokuj(\'' + escJs(u.imie) + '\')">Zablokuj</button>' +
    '</td></tr>';
}

function renderU() {
  var uzytkownicy = DB.UZYTKOWNICY;
  var q = document.getElementById("qU").value.toLowerCase().trim();
  var fr = Wielowybor.wartosci(document.getElementById("fRola"));
  var lista = uzytkownicy.filter(function (u) {
    if (!Wielowybor.pasuje(fr, u.rola)) return false;
    if (STAN_11.tylkoBez2fa && u["2fa"]) return false;
    if (q && (u.imie + " " + u.login + " " + u.inst).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });

  document.getElementById("liczU").innerHTML =
    "<b>" + lista.length + "</b> z " + uzytkownicy.length + " kont";

  document.getElementById("bodyU").innerHTML = lista.length ? lista.map(wierszUsera).join("") :
    '<tr><td colspan="6"><div class="empty"><div class="ei">&#9679;</div>' +
    '<div class="et">Brak kont spełniających filtr</div>Zmień kryteria wyszukiwania.</div></td></tr>';
}

function renderAlert2fa() {
  var bez = DB.UZYTKOWNICY.filter(function (u) { return !u["2fa"]; });
  document.getElementById("alert2fa").innerHTML =
    '<b>' + bez.length + ' konta bez dwuskładnikowego uwierzytelnienia:</b> ' +
    bez.map(function (u) { return esc(u.imie) + " (" + esc(u.login) + ")"; }).join(", ") + '. ' +
    'Wymaganie MUST z warsztatu mówi o 2FA wymuszonym, nie opcjonalnym. Konta wyróżnione żółtym tłem ' +
    'nie spełniają tego warunku i przy wdrożeniu produkcyjnym powinny zostać objęte wymuszeniem ' +
    'przy pierwszym logowaniu.';
}

function blokuj(imie) {
  alert("Blokada konta: " + imie + "\n\nW systemie docelowym: sesja unieważniona natychmiast, " +
        "konto pozostaje w bazie na potrzeby historii zmian, wpis trafia do rejestru aktywności.");
}

function inicjujListe11() {
  document.getElementById("chip2fa").addEventListener("click", function () {
    STAN_11.tylkoBez2fa = !STAN_11.tylkoBez2fa;
    this.classList.toggle("on", STAN_11.tylkoBez2fa);
    renderU();
  });
  ["qU", "fRola"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderU);
    document.getElementById(id).addEventListener("change", renderU);
  });
  odswiezFiltrRoli();
  renderU();
  renderAlert2fa();
}
