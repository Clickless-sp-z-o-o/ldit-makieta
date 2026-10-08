/* Wysylka maili: start ekranu, zakladki i zakladka 1 (biblioteka szablonow) */
var STAN_09 = { wybranySzablon: "SZB-01" };

function inicjujZakladki09() {
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
    t.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (x) { x.classList.remove("on"); });
      Array.prototype.forEach.call(document.querySelectorAll(".tab-pane"), function (x) { x.classList.remove("on"); });
      t.classList.add("on");
      document.getElementById(t.dataset.t).classList.add("on");
    });
  });
}

function idzDoWysylki() {
  document.querySelector('.tab[data-t="t2"]').click();
  window.scrollTo(0, 0);
}

function renderSzablony() {
  document.getElementById("tbSzablony").innerHTML = DB.SZABLONY.map(function (s) {
    var sel = s.id === STAN_09.wybranySzablon ? ' class="sel"' : "";
    return "<tr" + sel + ">" +
      '<td class="strong">' + esc(s.nazwa) + '<div class="small muted mono">' + esc(s.id) + "</div></td>" +
      '<td class="small">' + esc(s.odbiorca) + "</td>" +
      "<td>" + (s.autor === "LDIT" ? '<span class="pill">LDIT</span>' : '<span class="pill w">IS</span>') + "</td>" +
      '<td class="num">' + (s.uzyc ? DB.fmtNum(s.uzyc) : '<span class="muted">0</span>') + "</td>" +
      '<td class="right nowrap">' +
        '<button class="btn xs" onclick="pokaz(\'' + escJs(s.id) + '\')">Podgląd</button> ' +
        '<button class="btn xs" onclick="alert(\'Edytor szablonu ' + escJs(s.id) + '\')">Edytuj</button> ' +
        '<button class="btn xs" onclick="pokaz(\'' + escJs(s.id) + '\');idzDoWysylki()">Wyślij</button>' +
      "</td></tr>";
  }).join("");
}

function metaSzablonu(s, t) {
  return '<div class="grid g3 mt16">' +
    '<div class="kpi"><div class="k-label">Odbiorca</div><div class="k-value" style="font-size:14px">' + esc(s.odbiorca) + "</div></div>" +
    '<div class="kpi"><div class="k-label">Autor treści</div><div class="k-value" style="font-size:14px">' + esc(s.autor) + "</div></div>" +
    '<div class="kpi"><div class="k-label">Użyć</div><div class="k-value">' + DB.fmtNum(s.uzyc) + "</div></div>" +
    "</div>" +
    (t.uwaga ? '<div class="note warn mt16 mb0">' + t.uwaga + "</div>" : "") +
    '<div class="note mt16 mb0" style="font-size:12px">Fragmenty w nawiasach klamrowych to placeholdery ' +
    "podstawiane danymi klienta, projektu i terminu w chwili wysyłki.</div>";
}

function pokaz(id) {
  STAN_09.wybranySzablon = id;
  renderSzablony();
  var s = DB.SZABLONY.filter(function (x) { return x.id === id; })[0];
  var t = TRESCI[id];
  document.getElementById("podgTytul").textContent = s.nazwa;
  document.getElementById("podglad").innerHTML = mailHtml("powiadomienia@ldit.pl", t.do, t.temat, t.tresc);
  document.getElementById("podgMeta").innerHTML = metaSzablonu(s, t);
}

/* Podglad maila */
function mailHtml(od, dokogo, temat, tresc) {
  return '<div class="mail-preview">' +
    '<div class="mh">' +
      '<div class="r"><b>Od</b><span class="mono">' + esc(od) + "</span></div>" +
      '<div class="r"><b>Do</b><span class="mono">' + esc(dokogo) + "</span></div>" +
      '<div class="r"><b>Temat</b><span>' + esc(temat) + "</span></div>" +
    "</div>" +
    '<div class="mb">' + esc(tresc) + "</div></div>";
}

function inicjujBiblioteke09() {
  document.getElementById("subSzab").textContent =
    DB.SZABLONY.length + " szablonów, łącznie " +
    DB.fmtNum(DB.SZABLONY.reduce(function (s, x) { return s + x.uzyc; }, 0)) + " wysyłek";
  renderSzablony();
  pokaz("SZB-01");
}

function inicjuj09() {
  wycofajSzablony09();
  wstawPanelAutomatyzacji09();
  inicjujZakladki09();
  inicjujBiblioteke09();
  inicjujWysylke09();
  renderAutomaty09();
}
