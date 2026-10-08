/* Konta i uprawnienia, zakladka 2 i 3: konfigurator rol i macierz (odczyt i render).
   Zrodlem sa tabele funkcje (katalog features) i role_funkcje (nadania rol, D-211).
   Poziom modulu wynika z features: "<m>.manage" lub wildcard "<m>.*" = edycja,
   "<m>.view" = podglad, brak nadania = brak dostepu. Zapis w 11-konta-uprawnienia-role-zapis.js. */
var POZIOMY = [
  { id: "brak", nazwa: "brak (moduł ukryty)" },
  { id: "podglad", nazwa: "podgląd" },
  { id: "edycja", nazwa: "podgląd i edycja" }
];

/* Moduly z katalogu features (rodzaj 'modul'), w kolejnosci menu */
function moduly11() {
  return Store.query("SELECT m.id, m.nazwa, m.grupa FROM moduly m " +
    "WHERE m.id IN (SELECT modul_id FROM funkcje WHERE rodzaj = 'modul') ORDER BY m.kolejnosc");
}
/* Features pol z opisem z bazy (kolumna opis) */
function katalogPol() {
  return Store.query("SELECT id, opis FROM funkcje WHERE rodzaj = 'pole' ORDER BY id");
}

function poziomModulu(nadania, modulId) {
  if (Funkcje.pasuje(nadania, modulId + ".manage")) return "edycja";
  return Funkcje.pasuje(nadania, modulId + ".view") ? "podglad" : "brak";
}
function poziomyRoli(rolaId) {
  var nadania = Funkcje.nadania(rolaId), m = {};
  moduly11().forEach(function (x) { m[x.id] = poziomModulu(nadania, x.id); });
  return m;
}
/* Wildcard pokazujemy wprost: "edycja (m.*)" */
function etykietaPoziomu(poziom, modulId, nadania) {
  if (poziom === "edycja" && nadania.indexOf(modulId + ".*") >= 0) return "edycja (" + modulId + ".*)";
  return POZIOMY.filter(function (p) { return p.id === poziom; })[0].nazwa;
}

function renderRole() {
  var lista = moduly11();
  document.getElementById("liczR").textContent = DB.ROLE.length + " ról";
  document.getElementById("listaRol").innerHTML = DB.ROLE.map(function (r) {
    var p = poziomyRoli(r.id);
    var n = lista.filter(function (m) { return p[m.id] !== "brak"; }).length;
    return '<div class="role-item' + (r.id === STAN_11.aktywna ? " on" : "") + '" data-r="' + esc(r.id) + '">' +
      esc(r.nazwa) + ' <span class="tag mute" style="float:right">' + n + '/' + lista.length + '</span>' +
      '<div class="rd">' + esc(r.opis) + '</div></div>';
  }).join("");
  document.querySelectorAll(".role-item").forEach(function (el) {
    el.addEventListener("click", function () { STAN_11.aktywna = el.dataset.r; renderKonfig(); });
  });
}

function renderPerm() {
  var rolaId = STAN_11.aktywna;
  var nadania = Funkcje.nadania(rolaId), p = poziomyRoli(rolaId);
  document.getElementById("nazwaRoli").textContent = rolaPoId(rolaId).nazwa;
  document.getElementById("bodyPerm").innerHTML = moduly11().map(function (m) {
    var opcje = POZIOMY.map(function (z) {
      return '<option value="' + z.id + '"' + (p[m.id] === z.id ? " selected" : "") + '>' +
        etykietaPoziomu(z.id, m.id, z.id === p[m.id] ? nadania : []) + '</option>';
    }).join("");
    return '<tr><td class="strong">' + esc(m.nazwa) + '<div class="small muted">' + esc(m.grupa) + '</div></td>' +
      '<td><select class="inp" data-modul="' + esc(m.id) + '">' + opcje + '</select></td></tr>';
  }).join("");
  document.querySelectorAll('#bodyPerm select').forEach(function (s) {
    s.addEventListener("change", function () { zmienPoziom(s.dataset.modul, s.value); });
  });
}

/* Feature pola objety wildcardem modulu (np. admin.konta przez admin.*) jest zablokowany */
function wildcardPola(nadania, klucz) {
  if (nadania.indexOf(klucz) >= 0) return null;
  return nadania.filter(function (n) { return n.slice(-2) === ".*" && Funkcje.pasuje([n], klucz); })[0] || null;
}

function wierszFeature(f, nadania) {
  var wildcard = wildcardPola(nadania, f.id);
  var zaznaczone = Funkcje.pasuje(nadania, f.id);
  return '<tr><td><span class="mono strong">' + esc(f.id) + '</span>' +
    '<div class="small muted">' + esc(f.opis) + (wildcard ? " (nadane przez " + esc(wildcard) + ")" : "") + '</div></td>' +
    '<td class="c"><label class="chk"><input type="checkbox" data-klucz="' + esc(f.id) + '"' +
    (zaznaczone ? " checked" : "") + (wildcard ? " disabled" : "") + '></label></td></tr>';
}

function renderFeatures() {
  var nadania = Funkcje.nadania(STAN_11.aktywna);
  document.getElementById("bodyFeat").innerHTML = katalogPol().map(function (f) {
    return wierszFeature(f, nadania);
  }).join("");
  document.querySelectorAll('#bodyFeat input[type=checkbox]').forEach(function (c) {
    c.addEventListener("change", function () { zmienFeature(c.dataset.klucz, c.checked); });
  });
}

function renderMenu() {
  var p = poziomyRoli(STAN_11.aktywna);
  var widoczne = moduly11().filter(function (m) { return p[m.id] !== "brak"; });
  var el = document.getElementById("podgladMenu");
  if (!widoczne.length) {
    el.innerHTML = '<div class="nic">Rola nie widzi żadnego modułu. Po zalogowaniu użytkownik ' +
      'zobaczy wyłącznie ekran profilu i przycisk wylogowania.</div>';
    return;
  }
  el.innerHTML = widoczne.map(function (m) {
    return '<div class="mi">' + esc(m.nazwa) +
      (p[m.id] === "edycja" ? '<b>edycja</b>' : '<b style="color:#64748b">odczyt</b>') + '</div>';
  }).join("");
}

/* Macierz: podsumowanie wygenerowane z tych samych tabel, bez wlasnych wartosci */
function komorkaMacierzy(klasa, tekst) { return '<td><span class="lv ' + klasa + '">' + esc(tekst) + '</span></td>'; }

function wierszeModulowMacierzy(nadaniaRol) {
  return moduly11().map(function (m) {
    return '<tr><td class="strong">' + esc(m.nazwa) + '</td>' + DB.ROLE.map(function (r) {
      var n = nadaniaRol[r.id], z = poziomModulu(n, m.id);
      return komorkaMacierzy(z === "edycja" ? "full" : z === "podglad" ? "read" : "none", etykietaPoziomu(z, m.id, n));
    }).join("") + '</tr>';
  });
}
function wierszePolMacierzy(nadaniaRol) {
  return katalogPol().map(function (f) {
    return '<tr><td><span class="mono strong">' + esc(f.id) + '</span></td>' + DB.ROLE.map(function (r) {
      return Funkcje.pasuje(nadaniaRol[r.id], f.id) ? komorkaMacierzy("full", "tak") : komorkaMacierzy("none", "nie");
    }).join("") + '</tr>';
  });
}

function renderMacierz() {
  document.getElementById("hdrMx").innerHTML = '<th>Uprawnienie</th>' + DB.ROLE.map(function (r) {
    return '<th class="c">' + esc(r.nazwa) + '</th>';
  }).join("");
  var nadaniaRol = {};
  DB.ROLE.forEach(function (r) { nadaniaRol[r.id] = Funkcje.nadania(r.id); });
  document.getElementById("bodyMx").innerHTML =
    wierszeModulowMacierzy(nadaniaRol).concat(wierszePolMacierzy(nadaniaRol)).join("");
}

function renderKonfig() { renderRole(); renderPerm(); renderFeatures(); renderMenu(); renderMacierz(); }
