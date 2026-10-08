/* Ekran Wniosek: model finansowy KFS, zapis i przywracanie regul.
   Tylko deklaracje, bez kodu wykonywanego od razu. */
/* ---------- Model finansowy ---------- */
function opisProgu(p) {
  return p.wielkosc + ", " + DB.fmtPct(p.procent_dofinansowania) + " (od " + DB.fmtDate(p.obowiazuje_od) +
    (p.obowiazuje_do ? " do " + DB.fmtDate(p.obowiazuje_do) : "") + ")";
}
function renderProgi() {
  var opcje = DB.PROGI_DOFINANSOWANIA.map(function (p) {
    return '<option value="' + esc(p.id) + '">' + esc(opisProgu(p)) + '</option>';
  }).join("");
  el("selProg").innerHTML = '<option value="">brak progu</option>' + opcje;
  el("selProg").value = STAN_03.w.progId || "";
}
function oznaczNadpisanie(idBloku, czyReczne) {
  el(idBloku).classList.toggle("overridden", czyReczne);
}
function renderFinanse() {
  var wielkosc = STAN_03.w.wielkosc;
  if (el("selWielkosc").querySelector('option[value="' + wielkosc + '"]')) el("selWielkosc").value = wielkosc;
  el("tagWielkosc").textContent = STAN_03.w.procent == null ? "" :
    DB.fmtPct(STAN_03.w.procent) + " dof. / " + DB.fmtPct(100 - STAN_03.w.procent) + " wkład";
  renderProgi();
  pokazKwote(el("fWartosc"), STAN_03.w.wartosc);
  pokazKwote(el("fKoszt"), STAN_03.w.kosztCalkowity);
  pokazKwote(el("fPrzyznano"), STAN_03.w.przyznano);
  pokazKwote(el("fWklad"), STAN_03.w.wklad);
  /* Kwoty z adaptera, nie z surowej tabeli: rola bez finanse.kwoty_wniosku dostaje null */
  pokazKwote(el("fDoplata"), STAN_03.w.doplata);
  pokazKwote(el("fKosztDop"), STAN_03.w.kosztZDoplataZapisany);
  el("fZatrudnieni").value = STAN_03.raw.liczba_zatrudnionych == null ? "" : STAN_03.raw.liczba_zatrudnionych;
  el("chDoplataFaktura").checked = STAN_03.w.doplataNaFakturze;
  el("hintPrzyznano").textContent = STAN_03.w.kosztCalkowity == null ?
    "Wyliczane po decyzji pozytywnej" : "koszt całkowity × " + DB.fmtPct(STAN_03.w.procent) + " (wybrany próg)";
  oznaczNadpisanie("wrapPrzyznano", !STAN_03.w.przyznanoRegula);
  oznaczNadpisanie("wrapWklad", !STAN_03.w.wkladRegula);
  oznaczNadpisanie("wrapProg", !STAN_03.w.progRegula);
  renderKontrola();
}

/* Kontrola z pol formularza: przyznano + wklad = koszt (D-135). Wklad nadpisany
   recznie moze sie nie domykac, wtedy to ostrzezenie, nie blad (D-173). */
function renderKontrola() {
  var koszt = num(el("fKoszt")), przyznano = num(el("fPrzyznano")), wklad = num(el("fWklad"));
  if (koszt == null || przyznano == null || wklad == null) {
    el("kontrola").innerHTML = '<div class="note" style="margin:6px 0 0">Równanie kontrolne pojawi się po decyzji pozytywnej.</div>';
    return;
  }
  var ok = !rozne(przyznano + wklad, koszt);
  el("kontrola").innerHTML =
    '<div class="note ' + (ok ? "" : "warn") + '" style="margin:6px 0 0">' +
    '<b>Równanie kontrolne:</b> ' + esc(DB.fmtPLN2(przyznano)) + ' + ' + esc(DB.fmtPLN2(wklad)) +
    ' = ' + esc(DB.fmtPLN2(koszt)) + ' <span class="small muted">(przyznano + wkład = koszt całkowity)</span> &nbsp; ' +
    (ok ? '<span class="tag pos">domyka się</span>' : '<span class="tag neg">rozjazd</span>') + "</div>";
}

var KOLUMNY_KONTAKTU = [
  ["osoba_kontaktowa", "fkOsoba1", "Osoba kontaktowa 1"], ["email", "fkMail1", "E-mail 1"], ["telefon", "fkTel1", "Telefon 1"],
  ["osoba_kontaktowa_2", "fkOsoba2", "Osoba kontaktowa 2"], ["email_2", "fkMail2", "E-mail 2"], ["telefon_2", "fkTel2", "Telefon 2"]
];

/* Zbiera z formularza tylko to, co sie zmienilo, i buduje wpisy do rejestru */
function zbierzZmiany() {
  var patch = {}, wpisy = [];
  function zmien(kolumna, etykieta, przed, po, poTekst) {
    patch[kolumna] = po;
    wpisy.push({ pole: etykieta, przed: przed, po: poTekst == null ? po : poTekst });
  }
  function zmienKwote(kolumna, etykieta, pole, obecna) {
    var nowa = num(pole);
    if (nowa !== null && rozne(nowa, obecna)) zmien(kolumna, etykieta, obecna, nowa);
  }
  function zmienNadpisywalna(kolumna, kolumnaReguly, etykieta, pole, obecna) {
    var nowa = num(pole);
    if (nowa === null || !rozne(nowa, obecna)) return;
    zmien(kolumna, etykieta, obecna, nowa);
    patch[kolumnaReguly] = 0;
  }
  var wielkosc = el("selWielkosc").value;
  if (wielkosc !== STAN_03.w.wielkosc) zmien("wielkosc_przedsiebiorstwa", "Wielkość", STAN_03.w.wielkosc, wielkosc);
  var zatrudnieni = el("fZatrudnieni").value === "" ? null : parseInt(el("fZatrudnieni").value, 10);
  if (zatrudnieni !== STAN_03.raw.liczba_zatrudnionych) {
    zmien("liczba_zatrudnionych", "Liczba zatrudnionych", STAN_03.raw.liczba_zatrudnionych, zatrudnieni);
  }
  zmienKwote("koszt_calkowity_z_doplata", "Koszt całkowity z dopłatą", el("fKosztDop"), STAN_03.w.kosztZDoplataZapisany);
  zmienKwote("kwota_doplaty_dodatkowej", "Kwota dopłaty dodatkowej", el("fDoplata"), STAN_03.w.doplata);
  zmienNadpisywalna("przyznano", "przyznano_regula_aktywna", "Przyznano", el("fPrzyznano"), STAN_03.w.przyznano);
  zmienNadpisywalna("wklad_wlasny", "wklad_regula_aktywna", "Wkład własny", el("fWklad"), STAN_03.w.wklad);
  var prog = el("selProg").value;
  if (prog && prog !== STAN_03.w.progId) {
    zmien("prog_dofinansowania_id", "Próg dofinansowania", STAN_03.w.progId, prog);
    patch.prog_regula_aktywna = 0;
  }
  var naFakturze = el("chDoplataFaktura").checked;
  if (naFakturze !== STAN_03.w.doplataNaFakturze) {
    zmien("doplata_na_fakturze_kfs", "Dopłata na fakturze KFS", STAN_03.w.doplataNaFakturze ? "tak" : "nie", naFakturze ? 1 : 0, naFakturze ? "tak" : "nie");
  }
  KOLUMNY_KONTAKTU.forEach(function (k) {
    var nowa = el(k[1]).value.trim();
    if (nowa !== (STAN_03.raw[k[0]] || "")) zmien(k[0], k[2], STAN_03.raw[k[0]], nowa === "" ? null : nowa);
  });
  var dodatkowe = zbierzDodatkowe();
  Object.keys(dodatkowe.patch).forEach(function (k) { patch[k] = dodatkowe.patch[k]; });
  return { patch: patch, wpisy: wpisy.concat(dodatkowe.wpisy), bledy: dodatkowe.bledy };
}

/* Opiekunowie leza w osobnej tabeli, wiec zapisujemy ich osobno. Zwraca liczbe zmian albo null przy bledzie. */
function zapiszOpiekunow() {
  var wynik = SzkoleniaWniosku.ustawOpiekunow(STAN_03.w.id, Wielowybor.wartosci(el("selOpiekunowie")));
  if (!wynik.ok) { komunikat(wynik.bledy.join(" ")); return null; }
  return wynik.dodano + wynik.usunieto;
}

function zapisz() {
  var z = zbierzZmiany();
  if (z.bledy.length) { komunikat(z.bledy.join(" ")); return; }
  var opiekunowie = zapiszOpiekunow();
  if (opiekunowie === null) { wczytaj(); renderWszystko(); return; }
  if (!z.wpisy.length && !opiekunowie) { komunikat("Brak zmian do zapisania."); return; }
  if (z.wpisy.length) {
    z.patch.data_aktualizacji = dzis();
    zapiszZmiany("wnioski", STAN_03.w.id, z.patch, z.wpisy);
  } else { wczytaj(); renderWszystko(); }
  komunikat("Zapisano " + (z.wpisy.length + opiekunowie) + " zmian, " + teraz().slice(11));
}

var NAZWA_REGULY = { prog: "Próg dofinansowania", przyznano: "Przyznano", wklad: "Wkład własny" };
var KOLUMNA_REGULY = { prog: "prog_regula_aktywna", przyznano: "przyznano_regula_aktywna", wklad: "wklad_regula_aktywna" };
function przywrocRegule(pole) {
  var patch = {};
  patch[KOLUMNA_REGULY[pole]] = 1;
  zapiszZmiany("wnioski", STAN_03.w.id, patch,
    [{ typ: "Przywrócenie reguły", pole: NAZWA_REGULY[pole], przed: "ręcznie", po: "reguła" }]);
  komunikat("Przywrócono regułę: " + NAZWA_REGULY[pole].toLowerCase());
}
