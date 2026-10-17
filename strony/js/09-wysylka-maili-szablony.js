/* Wysylka maili: start ekranu, zakladki i zakladka 1 (biblioteka szablonow).
   Szablon = wiersz szablony_maili (nazwa, odbiorca, temat, tresc) zapisywany przez LDIT w edytorze
   (09-wysylka-maili-edytor.js). Wiersz bez zapisanej tresci bierze tresc startowa z TRESCI. Tylko deklaracje. */
var STAN_09 = { wybranySzablon: "SZB-01", edytowany: null };

/* Szablony wycofane z biblioteki: "wniosek w trakcie przygotowania" (D-247) i szczegoly organizacyjne
   dla uczestnikow (do uczestnikow szkolen nic nie wysylamy, spotkanie 14.10.2026). Wiersze zostaja w danych. */
var SZABLONY_WYCOFANE = ["SZB-04", "SZB-07"];

/* Odbiorca szablonu wyznacza adres "Do". Tylko firma (wnioskodawca), instytucja albo zespol LDIT. */
var ODBIORCY_09 = {
  "Klient końcowy": { etykieta: "Klient (wnioskodawca, firma)", adres: "{klient.mail}" },
  "Instytucja szkoleniowa": { etykieta: "Instytucja szkoleniowa", adres: "{instytucja.mail}" },
  "LDIT (wewnętrzny)": { etykieta: "Zespół LDIT (wewnętrzny)", adres: "zespol@ldit.pl" }
};

function szablonyBiblioteki09() {
  return DB.SZABLONY.filter(function (s) {
    return SZABLONY_WYCOFANE.indexOf(s.id) < 0 && !/uczestni/i.test(s.odbiorca || "");
  });
}

/* Pelny szablon: dane wiersza i tresc (zapisana przez LDIT albo startowa) */
function szablon09(id) {
  var s = DB.SZABLONY.filter(function (x) { return x.id === id; })[0];
  if (!s) return null;
  var t = TRESCI[id] || {}, zapisany = s.tresc_html != null;
  var odb = ODBIORCY_09[s.odbiorca];
  return { id: s.id, nazwa: s.nazwa, odbiorca: s.odbiorca, autor: s.autor, uzyc: s.uzyc || 0,
           temat: zapisany ? (s.temat || "") : (t.temat || s.temat || ""),
           tresc: zapisany ? s.tresc_html : (t.tresc || ""),
           do: odb ? odb.adres : (t.do || "{klient.mail}"), uwaga: zapisany ? "" : (t.uwaga || ""), zapisany: zapisany };
}

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

function idzDoWysylki(id) {
  if (id) { STAN_09.wybranySzablon = id; document.getElementById("wySzablon").value = id; }
  document.querySelector('.tab[data-t="t2"]').click();
  window.scrollTo(0, 0);
}

function renderSzablony() {
  var edycja = Auth.edytujeModul("komun");
  document.getElementById("tbSzablony").innerHTML = szablonyBiblioteki09().map(function (s) {
    var sel = s.id === STAN_09.wybranySzablon ? ' class="sel"' : "";
    return "<tr" + sel + ">" +
      '<td class="strong">' + esc(s.nazwa) + '<div class="small muted mono">' + esc(s.id) + "</div></td>" +
      '<td class="small">' + esc((ODBIORCY_09[s.odbiorca] || {}).etykieta || s.odbiorca) + "</td>" +
      "<td>" + (s.autor === "LDIT" ? '<span class="pill">LDIT</span>' : '<span class="pill w">IS</span>') + "</td>" +
      '<td class="num">' + (s.uzyc ? DB.fmtNum(s.uzyc) : '<span class="muted">0</span>') + "</td>" +
      '<td class="right nowrap">' +
        '<button class="btn xs" onclick="pokaz(\'' + escJs(s.id) + '\')">Podgląd</button> ' +
        (edycja ? '<button class="btn xs" onclick="edytujSzablon09(\'' + escJs(s.id) + '\')">Edytuj</button> ' : "") +
        '<button class="btn xs" onclick="idzDoWysylki(\'' + escJs(s.id) + '\')">Wyślij</button>' +
      "</td></tr>";
  }).join("");
}

function metaSzablonu(s) {
  return '<div class="grid g3 mt16">' +
    '<div class="kpi"><div class="k-label">Odbiorca</div><div class="k-value" style="font-size:14px">' + esc((ODBIORCY_09[s.odbiorca] || {}).etykieta || s.odbiorca) + "</div></div>" +
    '<div class="kpi"><div class="k-label">Autor treści</div><div class="k-value" style="font-size:14px">' + esc(s.autor) + "</div></div>" +
    '<div class="kpi"><div class="k-label">Użyć</div><div class="k-value">' + DB.fmtNum(s.uzyc) + "</div></div>" +
    "</div>" +
    (s.uwaga ? '<div class="note warn mt16 mb0">' + s.uwaga + "</div>" : "") +
    '<div class="small muted mt16">Fragmenty w nawiasach klamrowych to zmienne. W chwili wysyłki uzupełniają się danymi ' +
    "klienta i wniosku każdego adresata. Gotowy mail dla każdego adresata zobaczysz i poprawisz w kroku Podgląd maili.</div>";
}

function pokaz(id) {
  var s = szablon09(id);
  if (!s) return;
  STAN_09.wybranySzablon = id;
  zamknijEdytor09();
  renderSzablony();
  document.getElementById("podgTytul").textContent = s.nazwa;
  document.getElementById("podglad").innerHTML = mailHtml("powiadomienia@ldit.pl", s.do, s.temat, s.tresc);
  document.getElementById("podgMeta").innerHTML = metaSzablonu(s);
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
  var lista = szablonyBiblioteki09();
  document.getElementById("subSzab").textContent =
    lista.length + " szablonów, łącznie " +
    DB.fmtNum(lista.reduce(function (s, x) { return s + (x.uzyc || 0); }, 0)) + " wysyłek";
  document.getElementById("btnNowySzablon").hidden = !Auth.edytujeModul("komun");
  renderSzablony();
  pokaz(STAN_09.wybranySzablon);
}

function inicjuj09() {
  wstawPanelAutomatyzacji09();
  inicjujZakladki09();
  inicjujBiblioteke09();
  inicjujWysylke09();
  renderAutomaty09();
}
