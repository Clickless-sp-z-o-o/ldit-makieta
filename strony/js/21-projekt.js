/* Ekran 21, zakladka Nowy projekt: jedyne miejsce zakladania projektu (wniosku), jedna sciezka (D-264):
   dane projektu, szkolenia z cenami, uczestnicy z puli klienta z wyborem szkolenia. Trafiaja tu przycisk
   Nowy projekt z Zestawien, Zloz wniosek z karty klienta i Zaloz projekt z formularza po akceptacji
   (adres z Nawigacja.adresNowegoProjektu). Zapis: ProjektLogika.utworz (02-zestawienia-projekt-logika.js),
   szkolenia i uczestnicy: 02-zestawienia-projekt-szkolenia.js, podpowiedz z formularza:
   02-zestawienia-projekt-z-formularza.js. Po zapisie otwiera sie karta nowego wniosku. Same deklaracje. */

function pfPole(etykieta, tip, kontrolka) {
  return '<div class="field mb0"><label>' + etykieta + (tip ? '<span class="tip-mark" data-tip="' + esc(tip) + '">i</span>' : "") + "</label>" + kontrolka + "</div>";
}

function pfOpcje(lista, wybrany) {
  return lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === wybrany ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
}

function pfBledy(lista) {
  var pole = document.getElementById("pfBledy");
  if (pole) pole.innerHTML = lista.length ? '<div class="note warn mb0">' + lista.map(esc).join("<br>") + "</div>" : "";
}

function pfJa() {
  var id = Auth.sesja().uzytkownik_id;
  return SzkoleniaWniosku.kontaLdit().some(function (k) { return k.id === id; }) ? id : "";
}

/* Lata zestawien bez zakladki Nieprzypisane; rok z adresu, jesli istnieje, inaczej domyslny */
function pfLata(rokZAdresu) {
  var lata = DB.LATA.filter(function (l) { return l.rok !== Lata.NIEPRZYPISANE; }).map(function (l) { return [l.rok, l.rok]; });
  var wybrany = lata.some(function (l) { return l[0] === rokZAdresu; }) ? rokZAdresu : Lata.domyslny();
  return { lista: lata, wybrany: wybrany };
}

function pfSzkieletFormularza(p) {
  var klienci = DB.KLIENCI.map(function (k) { return [k.id, k.nazwa + " (" + k.id + ")"]; });
  var instytucje = DB.INSTYTUCJE.map(function (i) { return [i.id, i.nazwa]; });
  var konta = SzkoleniaWniosku.kontaLdit().map(function (k) { return [k.id, k.imie]; });
  var statusy = Statusy.LISTA.map(function (s) { return [s, s]; });
  var lata = pfLata(p.rok);
  return '<div id="pfZFormularza"></div><div class="grid g3" style="gap:10px">' +
    pfPole("Klient", "Firma, dla której zakładasz projekt. Złóż wniosek w karcie klienta otwiera ten ekran z wybranym klientem.",
      '<select class="inp" id="pfKlient" onchange="pfZmienKlienta()">' + pfOpcje(klienci, p.klient) + "</select>") +
    pfPole("Rok zestawienia", "Zakładka roku na liście wniosków, w której pojawi się projekt.", '<select class="inp" id="pfRok">' + pfOpcje(lata.lista, lata.wybrany) + "</select>") +
    pfPole("Urząd pracy", "Urząd wybierasz spośród urzędów klienta, główny i dodatkowe.", '<select class="inp" id="pfUrzad"></select>') +
    pfPole("Instytucja szkoleniowa", "Katalog szkoleń poniżej pochodzi z tej instytucji.",
      '<select class="inp" id="pfInstytucja" onchange="pfZmienInstytucje()">' + pfOpcje(instytucje, p.is) + "</select>") +
    pfPole("Wykonawca", "Realizator szkolenia (podwykonawca), gdy inny niż instytucja.", '<input class="inp" id="pfWykonawca">') +
    pfPole("Wartość wnioskowana", "Kwota, o którą klient wnioskuje. Puste pole: suma kwot uczestników.", '<input class="inp num" id="pfWartosc">') +
    pfPole("Status początkowy", "", '<select class="inp" id="pfStatus">' + pfOpcje(statusy, "Niezłożony") + "</select>") +
    pfPole("Przygotował", "Osoba, która przygotowuje wniosek.", '<select class="inp" id="pfPrzygotowal"><option value="">nie wskazano</option>' + pfOpcje(konta, pfJa()) + "</select>") +
    pfPole("Opiekunowie", "Wybór wielokrotny z kont LDIT.", '<select class="inp" id="pfOpiekunowie" data-wielo data-pusty="Wybierz opiekunów">' + pfOpcje(konta, "") + "</select>") +
    '</div><div class="small strong" style="margin:14px 0 6px">Szkolenia i ceny</div><div id="pfSzkolenia"></div>' +
    '<div class="small strong" style="margin:14px 0 6px">Uczestnicy z puli klienta <a class="small" id="pfLinkUczestnicy" href="19-klient.html">dodaj w karcie klienta</a></div><div id="pfUczestnicy"></div>' +
    '<div id="pfBledy" style="margin-top:10px"></div>' +
    '<div class="btn-row" style="margin-top:10px"><button class="btn primary sm" onclick="zapiszNowyProjekt()">Zapisz projekt</button></div>';
}

function pfZmienKlienta() {
  var kl = DB.KLIENCI.filter(function (k) { return k.id === pfKlientId(); })[0];
  document.getElementById("pfUrzad").innerHTML = pfOpcje(ProjektLogika.urzedyKlienta(pfKlientId()).map(function (u) { return [u.pup, u.opis]; }), kl ? kl.pup : "");
  document.getElementById("pfLinkUczestnicy").href = Nawigacja.adresKlienta(pfKlientId()) + "#uczestnicy";
  if (kl && DB.INSTYTUCJE.some(function (i) { return i.id === kl.is; })) document.getElementById("pfInstytucja").value = kl.is;
  pfZmienInstytucje();
}

function pfZmienInstytucje() {
  PROJEKT_NOWY.szkolenia = [];
  pfBledy([]);
  pfRenderSzkolenia();
}

/* p: { klient, formularz, rok, is } z adresu; klient spoza zakresu konta nie jest podstawiany */
function pokazProjekt21(p) {
  var kontener = document.getElementById("projKontener21");
  var klient = DB.KLIENCI.some(function (k) { return k.id === p.klient; }) ? p.klient : "";
  PROJEKT_NOWY.szkolenia = [];
  PROJEKT_NOWY.formularzId = "";
  kontener.innerHTML = pfSzkieletFormularza({ klient: klient, rok: p.rok, is: p.is });
  Wielowybor.zamienWszystkie(kontener);
  var ja = pfJa();
  if (ja) Wielowybor.ustaw(document.getElementById("pfOpiekunowie"), [ja]);
  pfZmienKlienta();
  if (p.is && !klient) { document.getElementById("pfInstytucja").value = p.is; pfZmienInstytucje(); }
  if (klient && p.formularz) pfPodstawFormularz(ProjektZFormularza.podpowiedz(p.formularz));
}

/* Projekt z zaakceptowanego formularza: ta sama sciezka, pola podstawione z formularza (D-264 pkt 4) */
function pfPodstawFormularz(podp) {
  if (!podp.ok) { pfBledy(podp.bledy); return; }
  var d = podp.dane;
  PROJEKT_NOWY.formularzId = d.formularzId;
  ["pfKlient", "pfInstytucja"].forEach(function (id) { document.getElementById(id).disabled = true; });
  document.getElementById("pfInstytucja").value = d.instytucjaId;
  document.getElementById("pfUrzad").value = d.pupId;
  PROJEKT_NOWY.szkolenia = d.szkolenia.slice();
  pfRenderSzkolenia();
  d.uczestnicy.forEach(function (u) {
    var tr = document.querySelector('#pfUczestnicy tr[data-uk="' + u.uczestnikKlientaId + '"]');
    if (!tr) return;
    tr.querySelector(".pfUczCk").checked = true;
    tr.querySelector(".pfUczSzk").value = u.szkolenieId;
  });
  document.getElementById("pfZFormularza").innerHTML = '<div class="note mb0" style="margin-bottom:10px">Projekt z formularza <b>' + esc(d.formularzId) +
    "</b>. Klient, instytucja, urząd, szkolenie i uczestnicy są podstawione z formularza, sprawdź cenę w tym projekcie." +
    (podp.nieznaneSzkolenie ? " Szkolenia „" + esc(podp.nieznaneSzkolenie) + "” nie ma w katalogu instytucji, wybierz je z listy." : "") + "</div>";
}

/* Cena spoza cennika szkolenia trafia do niego tylko po potwierdzeniu (D-277, R-11) */
function pfPotwierdzNoweCeny(szkolenia) {
  var nowe = (szkolenia || []).filter(function (s) { return SzkoleniaWniosku.czyNowaCena(s.szkolenieId, SzkoleniaWniosku.parsujKwote(s.cena)); });
  if (!nowe.length) return false;
  return window.confirm("Dodać nowe ceny do cennika szkoleń? " + nowe.map(function (s) {
    return (SzkoleniaWniosku.szkolenieKatalogu(s.szkolenieId) || {}).nazwa + ": " + s.cena + " zł"; }).join(", "));
}

function danePf() {
  return {
    klientId: pfKlientId(), instytucjaId: pfInstytucja(), pupId: document.getElementById("pfUrzad").value, rok: document.getElementById("pfRok").value,
    status: document.getElementById("pfStatus").value, wykonawca: document.getElementById("pfWykonawca").value,
    kwotaWnioskowana: document.getElementById("pfWartosc").value, szkolenia: PROJEKT_NOWY.szkolenia, uczestnicy: pfZebraniUczestnicy(),
    opiekunowie: Wielowybor.wartosci(document.getElementById("pfOpiekunowie")), przygotowalId: document.getElementById("pfPrzygotowal").value,
    formularzId: PROJEKT_NOWY.formularzId
  };
}

/* Po zapisie karta nowego wniosku, z powrotem na liste roku projektu. Zwykly zapis bazy ma opoznienie,
   wiec przed przejsciem na inna strone zapisujemy od razu (KFS.zapiszTeraz), inaczej projekt by zginal. */
function zapiszNowyProjekt() {
  var d = danePf();
  d.dopiszCeny = pfPotwierdzNoweCeny(d.szkolenia);
  var wynik = ProjektLogika.utworz(d);
  if (!wynik.ok) { pfBledy(wynik.bledy); return; }
  var cel = Nawigacja.adresKarty(wynik.id, Nawigacja.adresWnioskow({ rok: d.rok }));
  KFS.zapiszTeraz().finally(function () { location.href = cel; });
}
