/* Ekran 02, nowy projekt, czesc 3: uczestnicy z puli klienta i ich szkolenia (D-264, D-279, D-345).
   Tabela osoba x szkolenie: wiersz to osoba z puli klienta, kolumna to szkolenie projektu z polem wyboru
   i kwota (puste = cena szkolenia). Jedna osoba moze isc na kilka szkolen naraz (D-369, feedback Martyny
   19.10.2026: "mozna wybrac tylko jedno szkolenie"); jej kwota we wniosku to suma kwot szkolen (D-345).
   Pole przy osobie zaznacza ja z pierwszym szkoleniem, pole w naglowku kolumny zaznacza cale szkolenie.
   Zapis (ProjektLogika.utworz) dostaje pary { uczestnikKlientaId, szkolenieId, kwota }. Same deklaracje. */

function pfNazwaSzkolenia(szkolenieId) {
  var kat = SzkoleniaWniosku.szkolenieKatalogu(szkolenieId);
  return kat ? kat.nazwa : szkolenieId;
}

function pfNaglowekSzkolenia(s) {
  var nazwa = pfNazwaSzkolenia(s.szkolenieId);
  return '<th class="pf-szk"><label class="pf-kolumna"><input type="checkbox" class="pfKolumnaSzk" data-szk="' + esc(s.szkolenieId) +
    '" onchange="pfZaznaczKolumne(this)" aria-label="Wszyscy na szkolenie ' + esc(nazwa) + '"> ' + esc(nazwa) + '</label>' +
    '<div class="small muted">kwota: puste = ' + esc(DB.fmtPLN(s.cena)) + '</div></th>';
}

function pfKomorkaSzkolenia(u, s) {
  var nazwa = pfNazwaSzkolenia(s.szkolenieId);
  return '<td class="pf-szk"><input type="checkbox" class="pfUczSzk" data-szk="' + esc(s.szkolenieId) + '" onchange="pfPrzelaczSzkolenie(this)"' +
    ' aria-label="' + esc(u.imie + ": " + nazwa) + '"> <input class="inp num pfUczKwota" data-szk="' + esc(s.szkolenieId) +
    '" style="width:100px;height:28px" aria-label="' + esc("Kwota, " + u.imie + ", " + nazwa) + '"></td>';
}

function pfWierszUczestnika(u) {
  return '<tr data-uk="' + esc(u.id) + '"><td><input type="checkbox" class="pfUczCk" onchange="pfPrzelaczOsobe(this)" aria-label="Wybierz ' + esc(u.imie) + '"></td>' +
    "<td>" + esc(u.imie) + (u.zawod ? '<div class="small muted">' + esc(u.zawod) + "</div>" : "") + "</td>" +
    PROJEKT_NOWY.szkolenia.map(function (s) { return pfKomorkaSzkolenia(u, s); }).join("") + "</tr>";
}

/* Przerysowanie (np. po dodaniu drugiego szkolenia) zachowuje wybrane osoby, szkolenia i kwoty */
function pfRenderUczestnicy() {
  var pula = pfPulaKlienta(pfKlientId());
  var pole = document.getElementById("pfUczestnicy");
  if (!pula.length) {
    pole.innerHTML = '<div class="small muted">Klient nie ma jeszcze uczestników w puli. Dodasz ich w karcie klienta albo później w projekcie.</div>';
    return;
  }
  if (!PROJEKT_NOWY.szkolenia.length) { pole.innerHTML = '<div class="small muted">Najpierw dodaj szkolenia, potem wybierzesz uczestników.</div>'; return; }
  var wybrani = pole.querySelector("table") ? pfZebraniUczestnicy() : [];
  pole.innerHTML = '<div class="toolbar" style="gap:8px;padding:0 0 6px">' +
    '<button type="button" class="btn xs" id="pfZaznaczWszystkich" onclick="pfZaznaczUczestnikow(true)">Zaznacz wszystkich uczestników klienta</button>' +
    '<button type="button" class="btn xs" id="pfOdznaczWszystkich" onclick="pfZaznaczUczestnikow(false)">Odznacz wszystkich</button>' +
    '<span class="small muted" id="pfLiczbaWybranych" role="status"></span></div>' +
    (PROJEKT_NOWY.szkolenia.length > 1 ? '<div class="small muted" style="padding:0 0 6px">Uczestnik może iść na kilka szkoleń: zaznacz je w jego wierszu. ' +
      'Jego kwota w projekcie to suma kwot szkoleń.</div>' : "") +
    '<div class="tbl-wrap"><table class="tbl" id="pfTabelaUczestnikow"><thead><tr><th></th><th>Uczestnik</th>' +
    PROJEKT_NOWY.szkolenia.map(pfNaglowekSzkolenia).join("") + "</tr></thead><tbody>" + pula.map(pfWierszUczestnika).join("") + "</tbody></table></div>";
  wybrani.forEach(function (p) { pfZaznaczPare(p.uczestnikKlientaId, p.szkolenieId, p.kwota); });
  pfOdswiezWybor();
}

function pfWierszOsoby(ukId) { return document.querySelector('#pfUczestnicy tr[data-uk="' + CSS.escape(ukId) + '"]'); }

/* Osoba jest wybrana, gdy ma co najmniej jedno szkolenie */
function pfUzgodnijOsobe(tr) {
  tr.querySelector(".pfUczCk").checked = Array.prototype.some.call(tr.querySelectorAll(".pfUczSzk"), function (ck) { return ck.checked; });
}

/* Para osoba, szkolenie (np. podstawiona z formularza); osoba albo szkolenie spoza tabeli sa pomijane */
function pfZaznaczPare(ukId, szkolenieId, kwota) {
  var tr = pfWierszOsoby(ukId);
  var ck = tr && tr.querySelector('.pfUczSzk[data-szk="' + CSS.escape(szkolenieId) + '"]');
  if (!ck) return;
  ck.checked = true;
  if (kwota) tr.querySelector('.pfUczKwota[data-szk="' + CSS.escape(szkolenieId) + '"]').value = kwota;
  pfUzgodnijOsobe(tr);
}

/* Pole przy osobie: zaznaczenie bez szkolenia dostaje pierwsze szkolenie projektu, odznaczenie zdejmuje wszystkie */
function pfUstawOsobe(tr, zaznacz) {
  var szkolenia = tr.querySelectorAll(".pfUczSzk");
  var maSzkolenie = Array.prototype.some.call(szkolenia, function (ck) { return ck.checked; });
  if (!zaznacz) Array.prototype.forEach.call(szkolenia, function (ck) { ck.checked = false; });
  else if (!maSzkolenie) szkolenia[0].checked = true;
  pfUzgodnijOsobe(tr);
}

function pfPrzelaczOsobe(ck) {
  pfUstawOsobe(ck.closest("tr"), ck.checked);
  pfOdswiezWybor();
}

function pfPrzelaczSzkolenie(ck) {
  pfUzgodnijOsobe(ck.closest("tr"));
  pfOdswiezWybor();
}

/* Pole w naglowku kolumny: cale szkolenie dla wszystkich osob z puli albo dla nikogo */
function pfZaznaczKolumne(ck) {
  Array.prototype.forEach.call(document.querySelectorAll("#pfUczestnicy tr[data-uk]"), function (tr) {
    tr.querySelector('.pfUczSzk[data-szk="' + CSS.escape(ck.getAttribute("data-szk")) + '"]').checked = ck.checked;
    pfUzgodnijOsobe(tr);
  });
  pfOdswiezWybor();
}

/* Przycisk "Zaznacz wszystkich uczestnikow klienta" (spotkanie 14.10.2026): zaznacza cala pule klienta,
   osoba bez szkolenia dostaje pierwsze szkolenie projektu, a uzytkownik odznacza zbednych. Recznie wybrane
   szkolenia i kwoty w wierszach zostaja. */
function pfZaznaczUczestnikow(zaznacz) {
  Array.prototype.forEach.call(document.querySelectorAll("#pfUczestnicy tr[data-uk]"), function (tr) { pfUstawOsobe(tr, !!zaznacz); });
  pfOdswiezWybor();
}

/* Pole w naglowku kolumny jest zaznaczone, gdy szkolenie ma cala pule klienta */
function pfUzgodnijKolumny() {
  Array.prototype.forEach.call(document.querySelectorAll("#pfUczestnicy .pfKolumnaSzk"), function (ck) {
    var komorki = document.querySelectorAll('#pfUczestnicy .pfUczSzk[data-szk="' + CSS.escape(ck.getAttribute("data-szk")) + '"]');
    ck.checked = komorki.length > 0 && Array.prototype.every.call(komorki, function (x) { return x.checked; });
  });
}

function pfOdswiezWybor() {
  pfUzgodnijKolumny();
  pfPokazLiczbeWybranych();
}

/* Licznik liczy zaznaczenia na biezaco, wiec zgadza sie tez po podstawieniu uczestnikow z formularza.
   Przy kilku szkoleniach pokazuje tez liczbe przypisan osoba, szkolenie. */
function pfPokazLiczbeWybranych() {
  var pole = document.getElementById("pfLiczbaWybranych");
  if (!pole) return;
  var wszystkich = document.querySelectorAll("#pfUczestnicy .pfUczCk").length;
  var osob = document.querySelectorAll("#pfUczestnicy .pfUczCk:checked").length;
  var przypisan = pfZebraniUczestnicy().length;
  pole.textContent = "Wybrano " + osob + " z " + wszystkich + (PROJEKT_NOWY.szkolenia.length > 1 ? ", przypisań do szkoleń: " + przypisan : "");
}

function pfPulaKlienta(klientId) {
  return DB.UCZESTNICY_KLIENTA.filter(function (u) { return u.klient === klientId; });
}

/* Jedna para na kazde zaznaczone szkolenie osoby */
function pfZebraniUczestnicy() {
  var pary = [];
  Array.prototype.forEach.call(document.querySelectorAll("#pfUczestnicy tr[data-uk]"), function (tr) {
    Array.prototype.forEach.call(tr.querySelectorAll(".pfUczSzk:checked"), function (ck) {
      var szk = ck.getAttribute("data-szk");
      pary.push({ uczestnikKlientaId: tr.getAttribute("data-uk"), szkolenieId: szk,
                  kwota: tr.querySelector('.pfUczKwota[data-szk="' + CSS.escape(szk) + '"]').value });
    });
  });
  return pary;
}
