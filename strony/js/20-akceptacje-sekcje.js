/* Ekran 20, czesc 4: komplet pol formularza klienta w czytelnych sekcjach (D-256, D-257).
   Te same sekcje co w formularzu zgloszeniowym (16-formularz-pola.js). Same deklaracje. */

var ZADLUZENIA_20 = { brak: "NIE", zus: "TAK: ZUS", us: "TAK: US", zus_us: "TAK: ZUS i US", inne: "TAK: inne" };

function tekstTakNie20(wartosc) {
  return wartosc == null ? "" : wartosc ? "TAK" : "NIE";
}

/* Liczby jako tekst, bo 0 jest poprawna wartoscia, a wiersze20 traktuje pusta wartosc jako brak */
function liczba20(wartosc) {
  return wartosc == null ? "" : String(wartosc);
}

function ugoda20(f) {
  if (f.zadluzenie === "brak") return '<span class="muted">nie dotyczy</span>';
  return tekstTakNie20(f.zadluzenieUgoda);
}

function osobaReprezentacji20(f, i) {
  var r = f.reprezentanci[i];
  return r ? esc(r.osoba) + (r.stanowisko ? ", " + esc(r.stanowisko) : "") : "";
}

function sekcja20(tytul, pary) {
  return '<div class="small strong" style="margin-top:14px;margin-bottom:2px">' + esc(tytul) + '</div>' + wiersze20(pary);
}

function sekcjeKlienta20(f) {
  return sekcja20("Dane firmy", [
    ["Firma", "<b>" + esc(f.firma) + "</b>"], ["NIP", poleNip20(f)], ["Adres siedziby", esc(f.adres)], ["Miasto", esc(f.miasto)],
    ["Telefon do biura", esc(f.telBiura)], ["E-mail firmy", esc(f.mailFirmy)], ["Wielkość", esc(f.wielkosc)],
    ["Urząd pracy", esc(nazwaUrzedu20(f.pup))]]) +
    sekcja20("Osoba do kontaktu", [["Imię i nazwisko", esc(f.kontakt)], ["Stanowisko", esc(f.stanowisko)],
      ["Telefon", esc(f.telefon)], ["E-mail", esc(f.email)]]) +
    sekcja20("Rachunek bankowy", [["Nazwa banku", esc(f.bank)], ["Numer rachunku", f.numerKonta ? '<span class="mono">' + esc(f.numerKonta) + "</span>" : ""]]) +
    sekcja20("Zatrudnienie i opodatkowanie", [
      ["Umowa o pracę", esc(liczba20(f.zatrudnienie))], ["Umowa o pracę w etatach", esc(liczba20(f.etaty))],
      ["Inne umowy", esc(liczba20(f.inneUmowy))], ["Forma opodatkowania", esc(f.opodatkowanie)],
      ["Stawka podatku", f.stawkaPodatku == null ? "" : esc(liczba20(f.stawkaPodatku)) + "%"]]) +
    sekcja20("Osoby uprawnione do reprezentacji", [["Pierwsza osoba", osobaReprezentacji20(f, 0)], ["Druga osoba", osobaReprezentacji20(f, 1)]]) +
    sekcja20("Zobowiązania i praca.gov.pl", [
      ["Nieuregulowane zobowiązania", esc(ZADLUZENIA_20[f.zadluzenie] || "")], ["Porozumienie lub ugoda", ugoda20(f)],
      ["Zweryfikowane konto na praca.gov.pl", tekstTakNie20(f.kontoPracaGov)]]);
}

function sekcjaZgloszenia20(f) {
  return sekcja20("Zgłoszenie", [
    ["Szkolenie", esc(f.szkolenie)], ["Instytucja", esc(f.is)],
    ["Wypełnił", esc(WYPELNIL_20[f.wypelnil] || f.wypelnil) + (f.zglosil ? ", " + esc(imieKonta(f.zglosil)) : "")],
    ["Sposób wprowadzenia", zrodloFormularza20(f)],
    ["Data wpłynięcia", esc(DB.fmtDate(f.data)) + ' <span class="tag mute">auto</span>'], ["Uwagi", esc(f.uwagi)]]);
}
