/* Ekran 02, czesc 6: wiersz tabeli wnioskow i dane pomocnicze wiersza.
   Kontakt i e-mail (D-241, D-262), dokumenty po decyzji (D-232, D-263), osoba przygotowujaca
   i opiekunowie (D-233, D-260), wykonawca (D-258), wartosc (D-259).
   Do szczegolow prowadzi wylacznie przycisk "Szczegoly" (D-262): klik w wiersz, nazwe firmy
   czy kolumne nigdzie nie przenosi. Kolejnosc wierszy: 02-zestawienia-kolejnosc.js. Same deklaracje. */

var BRAK_02 = '<span class="muted">-</span>';
/* Kolumny tabeli: Szczegoly i Historia, Nr, Klient, Instytucja, Wykonawca, Termin szkolenia, Kontakt, E-mail,
   Urzad, Osob, Wartosc, Status, Przyznano, Koszt calk., Osob z dof., Rozl., Dokumenty, Przygotowal, Opiekunowie */
var LICZBA_KOLUMN_02 = 19;

/* Pierwszy kontakt wniosku, a gdy wniosek go nie ma, kontakt klienta */
function kontaktWniosku(w) {
  var k = (w.kontakty || [])[0];
  if (k) return k;
  var kl = DB.KLIENCI.filter(function (x) { return x.id === w.klient; })[0];
  return kl ? { osoba: kl.osoba, tel: kl.tel, mail: kl.mail } : {};
}

/* Imie i nazwisko osoby (id konta = login). Zespol LDIT z DB.ZESPOL_LDIT, ktora maja wszystkie konta LDIT,
   nie tylko administrator z lista kont (blad ze spotkania 14.10.2026: pracownik widzial e-mail). Pracownicy
   instytucji z listy kont widocznej dla roli. Konto instytucji nie dostaje imion zespolu LDIT, wiec
   nieznana mu osoba to "LDIT", a nie adres e-mail. Konto LDIT przy nieznanym koncie widzi login. */
var NAZWA_ZESPOLU_02 = "LDIT";

function nazwaPrzygotowal(id) {
  if (!id) return "";
  var zespol = DB.ZESPOL_LDIT || {};
  if (zespol[id]) return zespol[id];
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === id; })[0];
  if (u && u.imie) return u.imie;
  return Auth.sesja() && Auth.sesja().instytucja_nazwa ? NAZWA_ZESPOLU_02 : id;
}

/* Opiekunowie wniosku (D-260): nazwy kont po przecinku */
function nazwyOpiekunow(w) {
  return (w.opiekunowie || []).map(nazwaPrzygotowal).join(", ");
}

/* Trzy znaczniki tylko do odczytu, w kolejnosci Umowa, Faktura, Certyfikat (D-263).
   Edycja wylacznie na karcie wniosku, po kliknieciu w Szczegoly (D-232). */
function znacznikiDokumentow(w) {
  var dok = [["Umowa", "U", w.umowa], ["Faktura", "F", w.fakturaWystawiona], ["Certyfikat", "C", w.certyfikat]];
  return '<span class="dok-flagi">' + dok.map(function (d) {
    return '<label class="dok" title="' + d[0] + (d[2] ? " wystawiony" : " niewystawiony") + '">' +
      '<input type="checkbox" disabled' + (d[2] ? " checked" : "") + '>' + d[1] + '</label>';
  }).join("") + '</span>';
}

/* Termin szkolenia wniosku (feedback makiety 19.10.2026): od najwczesniejszego startu do najpozniejszego
   konca terminow szkolen wniosku (DB: szkolenieOd, szkolenieDo). Jeden dzien jedna data, brak terminow kreska. */
function terminSzkolenia02(w) { return DB.fmtZakresDat(w.szkolenieOd, w.szkolenieDo); }

/* Tekst do wyszukiwania po wszystkich polach listy (D-262): firma (nazwa skrocona i pelna), NIP, osoba, telefon (tez same
   cyfry), e-mail, wykonawca, instytucja, urzad, przygotowal, opiekunowie i numer wniosku */
function cyfry02(t) { return String(t || "").replace(/\D/g, ""); }

function tekstWyszukiwania02(w) {
  var k = kontaktWniosku(w);
  return [w.klNazwa, w.klNazwaPelna, w.nip, w.pupNazwa, w.isNazwa, k.osoba, k.tel, cyfry02(k.tel), k.mail, w.wykonawca,
          nazwaPrzygotowal(w.przygotowal), w.przygotowal, nazwyOpiekunow(w), w.id, w.nr]
    .join(" ").toLowerCase();
}

/* Wartosc to kwota wnioskowana (D-259). Przyznano i koszt calkowity uzupelniaja sie po decyzji
   pozytywnej, wczesniej sa puste. */
function kwotaPoDecyzji(w, kwota) {
  return w.statusDec === "Pozytywna" && kwota != null ? DB.fmtPLN(kwota) : BRAK_02;
}

/* Pierwsza kolumna: Szczegoly i Historia razem, zeby nie przewijac listy w bok (spotkanie 14.10.2026).
   Usun nie ma na liscie: wniosek usuwa sie na karcie wniosku. Przyciski Wyzej/Nizej i uchwyt
   przeciagania sa tylko w trybie "Ustaw kolejnosc" (D-261), zeby lista nie miala strzalek w kazdym wierszu */
function komorkaSzczegolow02(w, trybKolejnosci) {
  var nr = esc(w.nr);
  var przyciski = '<a class="btn xs" aria-label="Szczegóły wniosku ' + nr + '" title="Szczegóły i edycja wniosku" href="' +
    esc(adresKarty02(w.id)) + '">&#9998; Szczegóły</a> ' +
    '<button type="button" class="btn xs" data-historia="' + esc(w.id) + '" aria-controls="histPanel" aria-label="Historia wniosku ' + nr + '"' +
    ' title="Przebieg wniosku: co i kiedy się działo">Historia</button>';
  if (!trybKolejnosci) return '<td class="nowrap kol-akcje">' + przyciski + '</td>';
  return '<td class="nowrap kol-akcje lp-kolejnosc"><button type="button" class="ruch" data-ruch="gora" aria-label="Przesuń wniosek ' + nr + ' wyżej" title="Wyżej (z potwierdzeniem)">&#9650;</button>' +
    '<span class="uchwyt" aria-hidden="true" title="Przeciągnij wiersz, aby zmienić kolejność">&#8942;&#8942;</span>' +
    '<button type="button" class="ruch" data-ruch="dol" aria-label="Przesuń wniosek ' + nr + ' niżej" title="Niżej (z potwierdzeniem)">&#9660;</button> ' + przyciski + '</td>';
}

/* Status jak lista rozwijana w Excelu (spotkanie 14.10.2026): klikniecie znacznika otwiera menu statusow
   (02-zestawienia-status.js). Znacznik jest przyciskiem dostepnym z klawiatury. Bez edycji: sam znacznik. */
function komorkaStatusu02(w, mozeEdytowac) {
  if (!mozeEdytowac) return '<td class="nowrap kol-status">' + Statusy.znacznik(w) + '</td>';
  var status = esc(Statusy.wartosc(w));
  return '<td class="nowrap kol-status"><button type="button" class="status-wybor" data-status-menu="' + esc(w.id) + '"' +
    ' aria-haspopup="menu" aria-expanded="false" aria-label="Status wniosku ' + esc(w.nr) + ': ' + status + '. Zmień status"' +
    ' title="Kliknij, aby zmienić status">' + Statusy.znacznik(w) + '<span class="status-strzalka" aria-hidden="true">&#9662;</span></button></td>';
}

/* Liczba osob z dofinansowaniem (zakwalifikowani) jest znana dopiero po decyzji pozytywnej */
function osobZDofinansowaniem02(w) {
  return w.statusDec === "Pozytywna" ? String(w.osobZakw) : BRAK_02;
}

/* Kolejnosc kolumn jak w Excelu LDIT (spotkanie 14.10.2026): osoby, wartosc, zaraz po niej status,
   przyznano, koszt calkowity i osoby z dofinansowaniem; mniej potrzebne kolumny na koncu */
function wierszWniosku(w) {
  var ukryjIS = STAN_02.forcedInst ? ' style="display:none"' : "";
  var kontakt = kontaktWniosku(w);
  var edycja = Auth.edytujeModul("dofin");
  var kolejnosc = edycja && STAN_02.trybKolejnosci;
  var opiekunowie = nazwyOpiekunow(w);
  var termin = terminSzkolenia02(w);
  return '<tr class="' + Statusy.klasaWiersza(w) + '" data-id="' + esc(w.id) + '"' + (kolejnosc ? ' draggable="true"' : "") + '>' +
    komorkaSzczegolow02(w, kolejnosc) +
    '<td class="strong nowrap">' + esc(w.nr) + '</td>' +
    '<td class="strong kol-klient"><div class="tnij" title="' + esc(w.klNazwaPelna || w.klNazwa) + '">' + esc(w.klNazwa) + '</div>' +
      '<span class="pod mono">' + esc(w.nip) + '</span></td>' +
    '<td class="kol-is"' + ukryjIS + '><div class="tnij" title="' + esc(w.isNazwa) + '">' + esc(w.isNazwa) + '</div></td>' +
    '<td><div class="tnij" title="' + esc(w.wykonawca) + '">' + (w.wykonawca ? esc(w.wykonawca) : BRAK_02) + '</div></td>' +
    '<td class="nowrap kol-termin">' + (termin ? esc(termin) : BRAK_02) + '</td>' +
    '<td><div class="tnij" title="' + esc(kontakt.osoba) + '">' + (kontakt.osoba ? esc(kontakt.osoba) : BRAK_02) + '</div>' +
      '<span class="pod nowrap">' + (kontakt.tel ? esc(kontakt.tel) : "") + '</span></td>' +
    '<td><div class="tnij" title="' + esc(kontakt.mail) + '">' + (kontakt.mail ? esc(kontakt.mail) : BRAK_02) + '</div></td>' +
    '<td class="nowrap muted">' + (w.pupNazwa ? esc(skrocUrzad(w.pupNazwa)) : BRAK_02) + '</td>' +
    '<td class="c">' + w.osob + '</td>' +
    '<td class="num">' + (w.kwotaWnioskowana != null ? DB.fmtPLN(w.kwotaWnioskowana) : BRAK_02) + '</td>' +
    komorkaStatusu02(w, edycja) +
    '<td class="num strong">' + kwotaPoDecyzji(w, w.przyznano) + '</td>' +
    '<td class="num">' + kwotaPoDecyzji(w, w.kosztCalkowity) + '</td>' +
    '<td class="c">' + osobZDofinansowaniem02(w) + '</td>' +
    '<td>' + Statusy.znacznikRozliczenia(w) + '</td>' +
    '<td>' + znacznikiDokumentow(w) + '</td>' +
    '<td class="nowrap">' + (w.przygotowal ? esc(nazwaPrzygotowal(w.przygotowal)) : BRAK_02) + '</td>' +
    '<td><div class="tnij" title="' + esc(opiekunowie) + '">' + (opiekunowie ? esc(opiekunowie) : BRAK_02) + '</div></td>' +
    '</tr>';
}

/* Wiersz zamiast pustej tabeli, gdy filtr nic nie zwraca */
function wierszPustejListy02() {
  return '<tr class="pusta-lista"><td colspan="' + LICZBA_KOLUMN_02 + '" class="muted">Brak wniosków dla wybranych filtrów.</td></tr>';
}

/* "PUP Poznań" -> "Poznań": w kolumnie Urzad prefiks jest zawsze ten sam */
function skrocUrzad(nazwa) { return String(nazwa || "").replace(/^PUP\s+/, ""); }
