/* Ekran Wniosek: usuniecie wniosku z karty (spotkanie 14.10.2026; z listy przycisk Usun znika).
   Administrator: "Usun wniosek" z potwierdzeniem, a przy prosbie pracownika baner z "Zatwierdz usuniecie"
   i "Odrzuc". Pracownik LDIT: "Popros o usuniecie" z polem powodu i baner "Prosba o usuniecie czeka na
   administratora". Instytucja tej funkcji nie widzi. Logika bez DOM: 03-wniosek-usuwanie-logika.js,
   samo usuniecie jak dotad na liscie (02-zestawienia-usuwanie.js).
   Tylko deklaracje, bez kodu wykonywanego od razu. */

var FORMULARZ_PROSBY_03 = { otwarty: false };

function opisProsby03(p) {
  return esc(UsuwanieWniosku.kto(p.od)) + ', ' + esc(DB.fmtDate(p.czas)) + (p.powod ? ': <i>' + esc(p.powod) + '</i>' : "");
}

function banerUsuniecia03() {
  var p = STAN_03.w.usuniecieProsba;
  if (UsuwanieWniosku.administrator() && p) {
    return '<div class="note warn baner-usuniecia" role="status"><b>Prośba o usunięcie wniosku</b> od ' + opisProsby03(p) +
      '<div class="btn-row"><button class="btn sm danger" id="btnZatwierdzUsuniecie" onclick="usunWniosek03()">Zatwierdź usunięcie</button>' +
      '<button class="btn sm" id="btnOdrzucUsuniecie" onclick="odrzucProsbe03()">Odrzuć</button></div></div>';
  }
  if (UsuwanieWniosku.pracownikLdit() && p) {
    return '<div class="note warn baner-usuniecia" role="status"><b>Prośba o usunięcie czeka na administratora.</b> Wysłał(a) ' + opisProsby03(p) +
      '. Do decyzji wniosek zostaje na liście.</div>';
  }
  if (UsuwanieWniosku.pracownikLdit() && FORMULARZ_PROSBY_03.otwarty) {
    return '<div class="note baner-usuniecia"><label for="powodUsuniecia" class="strong">Powód usunięcia</label>' +
      '<textarea class="inp" id="powodUsuniecia" rows="2" maxlength="' + UsuwanieWniosku.MAKS_POWOD + '" placeholder="np. duplikat wniosku, klient zrezygnował przed rozpoczęciem pracy"></textarea>' +
      '<div class="small muted">Wniosek usunie administrator po akceptacji. Prośba trafia do Do akceptacji i do rejestru aktywności.</div>' +
      '<div class="btn-row"><button class="btn sm primary" id="btnWyslijProsbe" onclick="wyslijProsbe03()">Wyślij prośbę</button>' +
      '<button class="btn sm" onclick="pokazFormularzProsby03(false)">Anuluj</button></div></div>';
  }
  return "";
}

function renderUsuniecie03() {
  var akcje = el("akcjeUsuniecia");
  if (UsuwanieWniosku.administrator()) {
    akcje.innerHTML = '<button class="btn danger" id="btnUsunWniosek" onclick="usunWniosek03()" data-tip="Usunięty wniosek znika z listy, klient zostaje w Bazie danych. Można go przywrócić w sekcji Usunięte z listy.">Usuń wniosek</button>';
  } else if (UsuwanieWniosku.pracownikLdit() && !STAN_03.w.usuniecieProsba) {
    akcje.innerHTML = '<button class="btn" id="btnProsbaUsuniecia" onclick="pokazFormularzProsby03(true)" data-tip="Wniosek usuwa administrator. Wyślij prośbę z powodem, trafi do Do akceptacji.">Poproś o usunięcie</button>';
  } else {
    akcje.innerHTML = "";
  }
  el("banerUsuniecia").innerHTML = banerUsuniecia03();
}

function pokazFormularzProsby03(otworz) {
  FORMULARZ_PROSBY_03.otwarty = otworz;
  renderUsuniecie03();
  if (otworz && el("powodUsuniecia")) el("powodUsuniecia").focus();
}

function wyslijProsbe03() {
  var wynik = UsuwanieWniosku.poprosOUsuniecie(STAN_03.w.id, el("powodUsuniecia").value);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  FORMULARZ_PROSBY_03.otwarty = false;
  wczytaj();
  renderUsuniecie03();
  komunikat("Prośba o usunięcie wysłana do administratora.");
}

function odrzucProsbe03() {
  if (!window.confirm("Odrzucić prośbę o usunięcie? Wniosek zostaje na liście.")) return;
  var wynik = UsuwanieWniosku.odrzucProsbe(STAN_03.w.id);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  wczytaj();
  renderUsuniecie03();
  komunikat("Prośba o usunięcie odrzucona.");
}

/* Potwierdzenie z tym samym opisem skutku co dotad na liscie (tekstUsuniecia z 02-zestawienia-usuwanie.js) */
function usunWniosek03() {
  var w = STAN_03.w;
  var tekst = typeof tekstUsuniecia === "function" ? tekstUsuniecia(w) : "Usunąć wniosek " + w.nr + " (" + w.klNazwa + ")?";
  if (!window.confirm(tekst)) return;
  var wynik = UsuwanieWniosku.usun(w.id);
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return; }
  var adres = el("linkPowrotu").getAttribute("href") || "02-zestawienia.html";
  komunikat("Wniosek usunięty z listy.");
  KFS.zapiszTeraz().finally(function () { location.href = adres; });
}
