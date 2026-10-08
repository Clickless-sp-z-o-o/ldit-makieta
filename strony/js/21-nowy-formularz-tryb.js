/* Ekran 21: dwie zakladki jednego ekranu wprowadzania. Formularz klienta (zgloszenie do akceptacji)
   i Nowy projekt (wniosek dla klienta z bazy, js/21-projekt.js). Adres z Nawigacja.adresNowegoProjektu
   (?projekt=1&klient=&formularz=&rok=&is=) otwiera zakladke projektu z podstawionymi danymi.
   Zakladka projektu jest tylko dla kont z edycja Dofinansowan. Same deklaracje. */

var ADRES_21 = Nawigacja.odczytajZapytanie(location.search, ["projekt", "klient", "formularz", "rok", "is"]);
var STAN_TRYBU_21 = { tryb: "formularz", projektGotowy: false };

function mozeZakladacProjekt21() { return Auth.edytujeModul("dofin"); }

function przelaczTryb21(tryb) {
  if (tryb === "projekt" && !mozeZakladacProjekt21()) return;
  STAN_TRYBU_21.tryb = tryb;
  document.querySelectorAll("#zakladki21 .tab").forEach(function (z) {
    var aktywna = z.getAttribute("data-tryb") === tryb;
    z.classList.toggle("on", aktywna);
    z.setAttribute("aria-selected", String(aktywna));
  });
  el21("trybFormularz21").hidden = tryb !== "formularz";
  el21("trybProjekt21").hidden = tryb !== "projekt";
  if (tryb === "projekt" && !STAN_TRYBU_21.projektGotowy) {
    STAN_TRYBU_21.projektGotowy = true;
    pokazProjekt21(ADRES_21);
  }
}

function inicjujTryb21() {
  var moze = mozeZakladacProjekt21();
  el21("zakladkaProjekt21").hidden = !moze;
  el21("zakladki21").hidden = !moze;
  document.querySelectorAll("#zakladki21 .tab").forEach(function (z) {
    z.addEventListener("click", function () { przelaczTryb21(z.getAttribute("data-tryb")); });
  });
  przelaczTryb21(moze && (ADRES_21.projekt || ADRES_21.klient) ? "projekt" : "formularz");
}
