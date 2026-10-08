/* Ekran Instytucje: kopiowanie programu szkolenia (D-237).
   Kopia dostaje nazwe "(kopia)" i te same dane planu. Pliki planu NIE sa kopiowane:
   w makiecie leza w bazie jako base64, a kopia kazdego pliku szybko zapelnilaby miejsce.
   Tylko deklaracje. */
var POLA_KOPII = ["instytucja_id", "liczba_godzin", "liczba_dni", "tryb", "plan_szkolenia",
                  "cel_szkolenia", "grupa_docelowa", "efekty_uczenia", "wymagania", "forma_zaliczenia"];

function kopiujProgram(id) {
  var zrodlo = Store.find("katalog_szkolen", id);
  if (!zrodlo) return null;
  var kopia = { nazwa: zrodlo.nazwa + " (kopia)", zaktualizowano: new Date().toISOString().slice(0, 10) };
  POLA_KOPII.forEach(function (p) { kopia[p] = zrodlo[p]; });
  var nowy = Store.insert("katalog_szkolen", kopia, "SZ-");
  kopiujCennik06(id, nowy.id);   /* cennik idzie razem z programem (D-277) */
  otworzKartePlanu(nowy.id);
  return nowy;
}
