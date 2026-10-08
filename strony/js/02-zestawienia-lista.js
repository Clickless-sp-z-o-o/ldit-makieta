/* Ekran 02, czesc 2: filtry, tabela wnioskow i inicjalizacja.
   Lista jest przewijana, bez stronicowania (D-262). Do szczegolow prowadzi tylko przycisk
   "Szczegoly", klik w wiersz niczego nie otwiera (D-262).
   Korzysta ze STAN_02 z 02-zestawienia-dane.js. Same deklaracje. */

function wypelnijFiltry02() {
  var selIS = document.getElementById("fIS");
  DB.INSTYTUCJE.forEach(function (i) {
    selIS.innerHTML += '<option value="' + esc(i.id) + '">' + esc(i.nazwa) + '</option>';
  });
  /* Instytucja z menu (?is=) ustawia ten sam filtr, ktory uzytkownik moze zmienic na liscie */
  var zMenu = znajdzWymuszonaInstytucje();
  if (zMenu) Wielowybor.ustaw(selIS, [zMenu.id]);
  wypelnijPrzygotowal02();
  var selPUP = document.getElementById("fPUP");
  DB.PUPY.forEach(function (p) {
    selPUP.innerHTML += '<option value="' + esc(p.id) + '">' + esc(p.nazwa) + '</option>';
  });
  var selStatus = document.getElementById("fStatus");
  Statusy.LISTA.forEach(function (s) {
    selStatus.innerHTML += '<option>' + esc(s) + '</option>';
  });
}

/* Filtr "Przygotowal" (D-233): osoby, ktore przygotowaly wnioski widoczne w zakresie konta */
function wypelnijPrzygotowal02() {
  var sel = document.getElementById("fPrzyg");
  var ids = {};
  DB.WNIOSKI_WSZYSTKIE.forEach(function (w) { if (w.przygotowal) ids[w.przygotowal] = true; });
  Object.keys(ids).sort().forEach(function (id) {
    sel.innerHTML += '<option value="' + esc(id) + '">' + esc(nazwaPrzygotowal(id)) + '</option>';
  });
}

/* Wybrane wartosci filtra wielokrotnego wyboru (assets/wielowybor.js) */
function wybrane02(id) { return Wielowybor.wartosci(document.getElementById(id)); }

function filtrujWnioski() {
  var q = document.getElementById("q").value.toLowerCase().trim();
  var fis = wybrane02("fIS"), fpup = wybrane02("fPUP"), fst = wybrane02("fStatus"), fprzyg = wybrane02("fPrzyg");
  return STAN_02.W.filter(function (w) {
    if (!Wielowybor.pasuje(fis, w.is)) return false;
    if (!Wielowybor.pasuje(fpup, w.pup)) return false;
    if (!Wielowybor.pasuje(fst, Statusy.wartosc(w))) return false;
    if (!Wielowybor.pasuje(fprzyg, w.przygotowal)) return false;
    if (!pasujeDoWykresu(w)) return false;
    if (!q) return true;
    return tekstWyszukiwania02(w).indexOf(q) >= 0;
  });
}

function render() {
  var lista = filtrujWnioski();
  document.getElementById("licz").innerHTML =
    "<b>" + lista.length + "</b> z " + STAN_02.W.length + " &middot; wartość " +
    DB.fmtPLN(lista.reduce(function (s, w) { return s + (w.kwotaWnioskowana || 0); }, 0));

  document.getElementById("body").innerHTML = lista.map(function (w, i) { return wierszWniosku(w, i + 1); }).join("");
  odswiezPrzyciskCofania();
  odswiezUsuniete02();
  odswiezZakladki02(lista.length);
  Nawigacja.zapiszWAdresie(wartosciFiltrow02());
}

/* Rok i filtry w adresie: link z Bazy danych i z wyszukiwarki otwiera liste przefiltrowana,
   a powrot z karty wniosku odtwarza rok, filtry i wiersz. Instytucja z menu (?is=)
   jest wymuszona, wiec nie ma osobnego filtra inst. */
var FILTRY_02 = { q: "q", inst: "fIS", pup: "fPUP", status: "fStatus", przyg: "fPrzyg" };

function filtryZAdresu02() {
  var pola = Object.assign({}, FILTRY_02);
  if (STAN_02.forcedInst) delete pola.inst;   /* jedna instytucja jedzie w parametrze is */
  return pola;
}

function wartosciFiltrow02() {
  var w = { is: STAN_02.forcedInst ? STAN_02.forcedInst.nazwa : "", rok: STAN_02.rokAktywny };
  var pola = filtryZAdresu02();
  Object.keys(pola).forEach(function (p) { w[p] = Wielowybor.tekst(document.getElementById(pola[p])); });
  return Object.assign(w, STAN_02.wykres);
}

/* Licznik "Wnioski (n)" = wiersze widoczne teraz. Baza danych jest osobna pozycja menu (D-265), nie zakladka listy wnioskow */
function odswiezZakladki02(widocznych) {
  document.getElementById("licznikWnioskow").textContent = widocznych;
}

/* Po powrocie z karty wiersz wniosku jest wyrozniony i widoczny na ekranie */
function pokazWierszPowrotu(idWniosku) {
  var wiersz = Array.prototype.filter.call(document.querySelectorAll("#body tr[data-id]"), function (tr) {
    return tr.dataset.id === idWniosku;
  })[0];
  if (!wiersz) return;   /* wiersz poza filtrem */
  wiersz.classList.add("wiersz-powrotu");
  wiersz.scrollIntoView({ block: "center" });
}

/* "Wyczysc filtry" (D-262): wyszukiwarka, filtry wyboru i znaczniki z wykresow. Rok zostaje.
   Odswiezenie listy zapisuje pusty stan filtrow w adresie. */
function wyczyscFiltry02() {
  document.getElementById("q").value = "";
  ["fIS", "fPUP", "fStatus", "fPrzyg"].forEach(function (id) { Wielowybor.ustaw(document.getElementById(id), []); });
  STAN_02.wykres = {};
  rysujChipyWykresu();
  zsynchronizujInstytucje02();
  odswiezRok();
}

/* Wyszukiwanie po kliknieciu "Wyszukaj" albo Enterze w polu, nie przy kazdym znaku (decyzja klienta P-69):
   przy pelnej bazie filtrowanie na zywo przy kazdej literze bylo za wolne */
function podlaczWyszukiwanie02() {
  document.getElementById("btnSzukaj").addEventListener("click", render);
  document.getElementById("q").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); render(); }
  });
}

function adresKarty02(id) {
  var powrot = "02-zestawienia.html" + Nawigacja.zbudujZapytanie(Object.assign(wartosciFiltrow02(), { wn: id }));
  return Nawigacja.adresKarty(id, powrot);
}

function otworz(id) { location.href = adresKarty02(id); }

function inicjuj02() {
  STAN_02.rokAktywny = wybierzRokDomyslny();
  wypelnijRok02();
  wypelnijFiltry02();
  zsynchronizujInstytucje02();

  ["fPUP", "fStatus", "fPrzyg"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", render);
  });
  podlaczWyszukiwanie02();
  podlaczMenuStatusu02();
  document.getElementById("fIS").addEventListener("change", function () { zsynchronizujInstytucje02(); odswiezRok(); });
  document.getElementById("btnNowyProjekt").addEventListener("click", pokazProjForm);
  document.getElementById("body").addEventListener("click", zapamietajMiejsce02, true);
  document.getElementById("btnWyczysc").addEventListener("click", wyczyscFiltry02);
  podlaczKolejnosc02();
  podlaczUsuwanie02();
  document.getElementById("body").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-historia]");
    if (btn) pokazHistorie(btn.dataset.historia);
  });
  /* Odswiezanie po zmianie danych (poza operacjami masowymi) */
  window.addEventListener("db:changed", function () {
    if (STAN_02.batch) return;
    STAN_02.W = budujW(); render();
  });
  /* Parametry jednorazowe czytamy, zanim render() zapisze filtry w adresie i je usunie */
  var jednorazowe = Nawigacja.odczytajZapytanie(location.search, ["wn"]);
  Nawigacja.wczytajFiltry(filtryZAdresu02());
  zsynchronizujInstytucje02();
  var zapis = Nawigacja.odczytajPrzewiniecie(jednorazowe.wn);
  wczytajFiltryWykresu();
  rysujChipyWykresu();

  odswiezRok();
  if (jednorazowe.wn) przywrocMiejsce02(zapis, jednorazowe.wn);
}
