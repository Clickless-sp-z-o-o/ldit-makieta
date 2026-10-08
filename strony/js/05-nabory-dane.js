/* Nabory: stan strony, sortowanie i liczenie klientow (tylko deklaracje).
   Nabory maja dwa zrodla (D-271): ogloszone (status trwa, oczekuje, zakonczony)
   i prognozowane (osobny wiersz z data startu i opisem terminu tekstem). */
var MS_NA_DOBE = 86400000;
var HORYZONT_MIESIECY = 7;
var SKROTY_MIESIECY = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
var ETYKIETA_STATUSU_05 = { trwa: "Trwa", oczekuje: "Oczekuje", prognozowany: "Prognozowany", "zakończony": "Zakończony" };
var ETYKIETA_RODZAJU_05 = { ogloszony: "ogłoszony", prognozowany: "prognozowany" };

var STAN_05 = { dzis: null, N: [], trwa: [], oczekuje: [], prognozowane: [], klienciPoPup: {} };

function el05(id) { return document.getElementById(id); }

function dniDo(iso) { return Math.round((new Date(iso) - STAN_05.dzis) / MS_NA_DOBE); }

/* Urzedy klienta: glowny (klienci.pup_id) plus dodatkowe z klient_urzedy, bez powtorzen */
function urzedyKlienta05(k) {
  var wynik = [], widziane = {};
  [{ pup: k.pup, oddzial: "" }].concat(k.urzedy || []).forEach(function (u) {
    if (!u.pup || widziane[u.pup]) return;
    widziane[u.pup] = true;
    wynik.push(u);
  });
  return wynik;
}

function pupId(n) { return n.pupId; }
function klientow(n) { return STAN_05.klienciPoPup[n.pupId] || 0; }
function suma(lista) { return lista.reduce(function (s, n) { return s + klientow(n); }, 0); }

/* Kolejnosc: trwajace wg konca rosnaco, oczekujace wg startu, prognozy wg startu, na koncu zakonczone */
var GRUPA_STATUSU_05 = { trwa: 0, oczekuje: 1, prognozowany: 2, "zakończony": 3 };
function kluczSortowania(n) {
  var data = n.status === "trwa" ? n.do : n.od;
  var dni = data ? dniDo(data) : 0;
  return GRUPA_STATUSU_05[n.status] * 100000 + (n.status === "zakończony" ? -dni : dni);
}

function poStatusie(s) { return STAN_05.N.filter(function (n) { return n.status === s; }); }

function wczytajDane05() {
  /* Data biezaca stanu demo z bazy (meta), z zapasem na date systemowa */
  var meta = Store.one("SELECT wartosc FROM meta WHERE klucz = 'data_biezaca'");
  var dzisIso = meta && meta.wartosc ? meta.wartosc : new Date().toISOString().slice(0, 10);
  STAN_05.dzis = new Date(dzisIso);
  el05("stanNa").textContent = "stan na " + DB.fmtDate(dzisIso);

  /* Klienci urzedu z danych; klient z dodatkowymi urzedami liczy sie w kazdym swoim urzedzie (D-238) */
  STAN_05.klienciPoPup = {};
  DB.KLIENCI.forEach(function (k) {
    urzedyKlienta05(k).forEach(function (u) { STAN_05.klienciPoPup[u.pup] = (STAN_05.klienciPoPup[u.pup] || 0) + 1; });
  });

  STAN_05.N = DB.NABORY.slice().sort(function (a, b) { return kluczSortowania(a) - kluczSortowania(b); });
  STAN_05.trwa = poStatusie("trwa");
  STAN_05.oczekuje = poStatusie("oczekuje");
  STAN_05.prognozowane = STAN_05.N.filter(function (n) { return n.rodzaj === "prognozowany" && n.od; });
}
