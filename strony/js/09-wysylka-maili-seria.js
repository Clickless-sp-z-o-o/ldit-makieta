/* Wysylka maili, zakladka 2, krok 2: wysylka seryjna z podgladem (spotkanie 14.10.2026).
   Po wyborze szablonu i adresatow system sklada osobny mail dla kazdego adresata z juz
   uzupelnionymi zmiennymi. Kazdy mail mozna poprawic recznie (temat i tresc, np. podpis prezesa
   zamiast osoby do kontaktu) albo wylaczyc z wysylki. Dopiero potem jedna wysylka. Tylko deklaracje. */
var SERIA_09 = { szablonId: null, maile: [] };

/* Sklada maile: jeden na wniosek, adres wedlug odbiorcy szablonu. Bez adresu mail jest wylaczony. */
function zbudujMaile09(s, wnioski) {
  return wnioski.map(function (w, i) {
    var adres = adresDoMaila09(s.do, w), temat = podstaw(s.temat, w), tresc = podstaw(s.tresc, w);
    return { n: i, wniosekId: w.id, klientId: w.klient, isId: w.is, klNazwa: w.klNazwa, nr: w.nr || w.id,
             do: adres, temat: temat, tresc: tresc, tematSzablonu: temat, trescSzablonu: tresc,
             wyslij: !!adres, edytowany: false, braki: brakujaceZmienne09(temat + " " + tresc) };
  });
}

function doWyslania09() { return SERIA_09.maile.filter(function (m) { return m.wyslij && m.do; }); }

function tagiMaila09(m) {
  return (m.do ? "" : '<span class="tag neg">brak adresu e-mail</span> ') +
    (m.braki.length ? '<span class="tag warn" title="Uzupełnij ręcznie albo wyłącz mail">brak danych: ' + esc(m.braki.join(", ")) + "</span> " : "") +
    (m.edytowany ? '<span class="tag info">poprawiony ręcznie</span> ' : "") +
    (!m.wyslij ? '<span class="tag mute">wyłączony z wysyłki</span>' : "");
}

function mailSeriiHtml(m) {
  var id = "sm" + m.n;
  return '<details class="seria-mail' + (m.wyslij ? "" : " wylaczony") + '" id="' + id + '"' + (m.n === 0 ? " open" : "") + ">" +
    '<summary><label class="chk" onclick="event.stopPropagation()"><input type="checkbox" class="smWyslij" data-n="' + m.n + '"' +
      (m.wyslij ? " checked" : "") + (m.do ? "" : " disabled") + ' aria-label="Wyślij mail do ' + esc(m.klNazwa) + '"></label>' +
      '<span class="sm-kto"><b>' + esc(m.klNazwa) + '</b> <span class="mono small muted">' + esc(m.do || "") + "</span></span>" +
      '<span class="sm-temat small">' + esc(m.temat) + '</span><span class="sm-tagi" id="' + id + 't">' + tagiMaila09(m) + "</span></summary>" +
    '<div class="sm-body">' +
      '<div class="small muted" style="margin-bottom:6px">Od <span class="mono">powiadomienia@ldit.pl</span> · Do <span class="mono">' + esc(m.do || "brak adresu") +
        "</span> · wniosek " + esc(m.nr) + "</div>" +
      '<label class="small fld09"><span class="muted">Temat</span><input class="inp smTemat" data-n="' + m.n + '" value="' + esc(m.temat) + '"></label>' +
      '<label class="small fld09" style="margin-top:8px"><span class="muted">Treść</span><textarea class="inp smTresc" data-n="' + m.n + '" rows="12">' + esc(m.tresc) + "</textarea></label>" +
      '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn xs" onclick="przywrocMail09(' + m.n + ')">Przywróć treść z szablonu</button></div>' +
    "</div></details>";
}

function podsumowanieSerii09() {
  var m = SERIA_09.maile, wys = doWyslania09().length;
  var braki = m.filter(function (x) { return x.wyslij && x.braki.length; }).length;
  var edyt = m.filter(function (x) { return x.edytowany; }).length;
  document.getElementById("seriaPodsum").innerHTML =
    "<b>" + wys + "</b> do wysłania z " + m.length + " · " + (m.length - wys) + " wyłączonych · " + edyt + " poprawionych ręcznie" +
    (braki ? ' · <span class="tag warn">' + braki + " z brakami danych</span>" : "");
  document.getElementById("btnDoPotwierdzenia").disabled = !wys;
  document.getElementById("btnDoPotwierdzenia").textContent = "Dalej: potwierdzenie wysyłki (" + wys + ")";
}

function odswiezMail09(n) {
  var m = SERIA_09.maile[n], box = document.getElementById("sm" + n);
  m.braki = brakujaceZmienne09(m.temat + " " + m.tresc);
  m.edytowany = m.temat !== m.tematSzablonu || m.tresc !== m.trescSzablonu;
  document.getElementById("sm" + n + "t").innerHTML = tagiMaila09(m);
  box.querySelector(".sm-temat").textContent = m.temat;
  box.classList.toggle("wylaczony", !m.wyslij);
  podsumowanieSerii09();
}

function przywrocMail09(n) {
  var m = SERIA_09.maile[n], box = document.getElementById("sm" + n);
  m.temat = m.tematSzablonu; m.tresc = m.trescSzablonu;
  box.querySelector(".smTemat").value = m.temat;
  box.querySelector(".smTresc").value = m.tresc;
  odswiezMail09(n);
}

function podepnijSerie09() {
  var lista = document.getElementById("seriaLista");
  lista.addEventListener("input", function (e) {
    var n = e.target.getAttribute("data-n");
    if (n == null) return;
    var m = SERIA_09.maile[+n];
    if (e.target.classList.contains("smTemat")) m.temat = e.target.value;
    else if (e.target.classList.contains("smTresc")) m.tresc = e.target.value;
    else return;
    odswiezMail09(+n);
  });
  lista.addEventListener("change", function (e) {
    if (!e.target.classList.contains("smWyslij")) return;
    SERIA_09.maile[+e.target.getAttribute("data-n")].wyslij = e.target.checked;
    odswiezMail09(+e.target.getAttribute("data-n"));
  });
}

function rozwinMaile09(otworz) {
  Array.prototype.forEach.call(document.querySelectorAll("#seriaLista details"), function (d) { d.open = otworz; });
}

function pokazKrok09(n) {
  [1, 2, 3].forEach(function (k) {
    document.getElementById("krok" + k).style.display = k === n ? "block" : "none";
    document.getElementById("st" + k).classList.toggle("on", k === n);
  });
  window.scrollTo(0, 0);
}

function doKroku1() { pokazKrok09(1); }

/* Krok 2: lista gotowych maili z podstawionymi danymi, osobno dla kazdego adresata */
function doKroku2() {
  var lista = wybrane(), s = wybranySzablon09();
  if (!lista.length) { alert("Nie wybrano żadnego adresata."); return; }
  SERIA_09.szablonId = s.id;
  SERIA_09.maile = zbudujMaile09(s, lista);
  document.getElementById("seriaTytul").textContent = "Podgląd maili: " + s.nazwa;
  document.getElementById("seriaLista").innerHTML = SERIA_09.maile.map(mailSeriiHtml).join("");
  podsumowanieSerii09();
  pokazKrok09(2);
}

/* Powrot z potwierdzenia do podgladu nie kasuje recznych poprawek */
function wrocDoPodgladu09() { pokazKrok09(2); }
