/* Panel instytucji: katalog szkolen edytowany przez akceptacje LDIT (D-320). Administrator instytucji
   dodaje, zmienia i usuwa szkolenia oraz cennik; kazda operacja to propozycja, katalog zmienia sie
   dopiero po zatwierdzeniu (assets/akceptacje-katalog.js). Formularz w bloku na cala szerokosc
   (zgloszenieForm, pomocniki z 16-panel-is-zgloszenia.js). Same deklaracje. */

var TRYBY_16 = [["Online", "Online"], ["Stacjonarne", "Stacjonarne"], ["Mieszane", "Mieszane"]];
var DLUGIE_POLA_16 = ["plan_szkolenia", "cel_szkolenia", "grupa_docelowa", "efekty_uczenia", "wymagania", "forma_zaliczenia"];

function mozeZmieniacKatalog16() {
  return Auth.moze("zmiany.zglaszanie") && Auth.moze("zakres.cala_instytucja") && !Auth.handlowiec();
}

/* Komorka akcji w wierszu katalogu: znacznik oczekujacej zmiany albo Edytuj i Usun */
function akcjeSzkolenia16(s) {
  var czeka = AkceptacjeKatalog.oczekujaca(s.id);
  if (czeka) return '<span class="tag warn dot">zmiana czeka na akceptację</span>';
  if (!mozeZmieniacKatalog16()) return "";
  return '<button class="btn xs" onclick="edytujSzkolenie16(\'' + escJs(s.id) + '\')" aria-label="Edytuj szkolenie ' + esc(s.nazwa) + '">Edytuj</button> ' +
    '<button class="btn xs" onclick="usunSzkolenie16(\'' + escJs(s.id) + '\')" aria-label="Usuń szkolenie ' + esc(s.nazwa) + '">Usuń</button>';
}

function poleKatalogu16(k, etykieta, wartosc) {
  if (k === "tryb") return wybor16("kat_tryb", etykieta, TRYBY_16, wartosc || "");
  if (k === "ceny") return pole16("kat_ceny", etykieta + " (kwoty po średniku, np. 4500; 5200)", (wartosc || []).join("; "));
  if (DLUGIE_POLA_16.indexOf(k) >= 0) return pole16("kat_" + k, etykieta, wartosc == null ? "" : wartosc, "textarea");
  return pole16("kat_" + k, etykieta, wartosc == null ? "" : wartosc, k === "nazwa" ? "" : "number");
}

/* szkolenieId pusty = nowe szkolenie */
function pokazFormularzKatalogu16(szkolenieId) {
  var s = szkolenieId ? Store.find("katalog_szkolen", szkolenieId) : {};
  var wartosci = Object.assign({}, s, { ceny: szkolenieId ? AkceptacjeKatalog.ceny(szkolenieId) : [] });
  STAN_16.katalogEdycja = szkolenieId || null;
  el16("zgloszenieForm").innerHTML = '<div class="small strong" style="margin-bottom:8px">' +
    (szkolenieId ? "Zmiana szkolenia " + esc(s.nazwa) : "Nowe szkolenie w katalogu") + ' <span class="muted">(do akceptacji LDIT)</span></div>' +
    siatka16(Object.keys(AkceptacjeKatalog.POLA).map(function (k) { return poleKatalogu16(k, AkceptacjeKatalog.POLA[k], wartosci[k]); })) +
    pole16("kat_uzasadnienie", "Uzasadnienie dla LDIT", "", "textarea") + przyciski16("wyslijZmianeKatalogu16");
  el16("zgloszenieForm").style.display = "";
  pokazBlokFormularza16();
}

function dodajSzkolenie16() { pokazFormularzKatalogu16(null); }
function edytujSzkolenie16(id) { pokazFormularzKatalogu16(id); }

function odczytajKatalog16() {
  var nowe = {};
  Object.keys(AkceptacjeKatalog.POLA).forEach(function (k) {
    var v = el16("kat_" + k).value;
    nowe[k] = k === "ceny" ? v.split(/[;\n]/).map(function (c) { return c.replace(/\s/g, "").replace("zł", "").replace(",", "."); })
      .filter(Boolean).map(Number) : v;
  });
  return nowe;
}

function poZgloszeniuKatalogu16(tekst) {
  zamknijZgloszenie16();
  el16("komunikatZgloszen").textContent = tekst;
  el16("komunikatZgloszen").style.color = "var(--pos-ink)";
  renderKatalog16();
  renderMojeZgloszenia16();
}

function zglosKatalog16(dane, komunikat) {
  try {
    AkceptacjeKatalog.zglos(dane, Akceptacje.ktoTeraz());
    if (window.KFS && KFS.zapiszTeraz) KFS.zapiszTeraz();
    DB.przebuduj();
    poZgloszeniuKatalogu16(komunikat);
  } catch (e) {
    if (!(e instanceof Akceptacje.AkceptacjeError) && e.name !== "StraznikError") throw e;
    var pole = el16("komunikat16") || el16("komunikatZgloszen");
    pole.textContent = e.message;
    pole.style.color = "var(--neg-ink)";
  }
}

function wyslijZmianeKatalogu16() {
  var id = STAN_16.katalogEdycja;
  zglosKatalog16({ operacja: id ? "zmiana" : "dodanie", instytucjaId: STAN_16.inst.id, szkolenieId: id,
                   nowe: odczytajKatalog16(), uzasadnienie: el16("kat_uzasadnienie").value.trim() },
                 id ? "Zmiana szkolenia wysłana do akceptacji LDIT." : "Nowe szkolenie wysłane do akceptacji LDIT.");
}

function usunSzkolenie16(id) {
  var s = Store.find("katalog_szkolen", id);
  if (!s || !window.confirm("Wysłać do akceptacji LDIT usunięcie szkolenia „" + s.nazwa + "” z katalogu?")) return;
  zglosKatalog16({ operacja: "usuniecie", instytucjaId: STAN_16.inst.id, szkolenieId: id }, "Usunięcie szkolenia wysłane do akceptacji LDIT.");
}
