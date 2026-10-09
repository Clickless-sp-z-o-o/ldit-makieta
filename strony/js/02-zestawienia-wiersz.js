/* Ekran 02, czesc 6: wiersz tabeli wnioskow i dane pomocnicze wiersza.
   Kontakt i e-mail (D-241, D-262), dokumenty po decyzji (D-232, D-263), osoba przygotowujaca
   i opiekunowie (D-233, D-260), wykonawca (D-258), wartosc (D-259).
   Do szczegolow prowadzi wylacznie przycisk "Szczegoly" (D-262): klik w wiersz, nazwe firmy
   czy kolumne nigdzie nie przenosi. Kolejnosc wierszy: 02-zestawienia-kolejnosc.js. Same deklaracje. */

var BRAK_02 = '<span class="muted">-</span>';
var LICZBA_KOLUMN_02 = 18;

/* Pierwszy kontakt wniosku, a gdy wniosek go nie ma, kontakt klienta */
function kontaktWniosku(w) {
  var k = (w.kontakty || [])[0];
  if (k) return k;
  var kl = DB.KLIENCI.filter(function (x) { return x.id === w.klient; })[0];
  return kl ? { osoba: kl.osoba, tel: kl.tel, mail: kl.mail } : {};
}

/* Imie z kont widocznych dla roli, a gdy konta nie widac, sam login (id konta = login) */
function nazwaPrzygotowal(id) {
  if (!id) return "";
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === id; })[0];
  return u && u.imie ? u.imie : id;
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

/* Tekst do wyszukiwania po wszystkich polach listy (D-262): firma, NIP, osoba, telefon (tez same
   cyfry), e-mail, wykonawca, instytucja, urzad, przygotowal, opiekunowie i numer wniosku */
function cyfry02(t) { return String(t || "").replace(/\D/g, ""); }

function tekstWyszukiwania02(w) {
  var k = kontaktWniosku(w);
  return [w.klNazwa, w.nip, w.pupNazwa, w.isNazwa, k.osoba, k.tel, cyfry02(k.tel), k.mail, w.wykonawca,
          nazwaPrzygotowal(w.przygotowal), w.przygotowal, nazwyOpiekunow(w), w.id, w.nr]
    .join(" ").toLowerCase();
}

/* Wartosc to kwota wnioskowana (D-259). Przyznano i koszt calkowity uzupelniaja sie po decyzji
   pozytywnej, wczesniej sa puste. */
function kwotaPoDecyzji(w, kwota) {
  return w.statusDec === "Pozytywna" && kwota != null ? DB.fmtPLN(kwota) : BRAK_02;
}

/* Pierwsza kolumna: Szczegoly (uwaga 08.10, bez kolumny Lp.). Przyciski Wyzej/Nizej i uchwyt przeciagania
   sa tylko w trybie "Ustaw kolejnosc" (D-261), zeby lista nie miala strzalek w kazdym wierszu */
function komorkaSzczegolow02(w, trybKolejnosci) {
  var nr = esc(w.nr);
  var szczegoly = '<a class="btn xs" aria-label="Szczegóły wniosku ' + nr + '" title="Szczegóły i edycja wniosku" href="' +
    esc(adresKarty02(w.id)) + '">&#9998; Szczegóły</a>';
  if (!trybKolejnosci) return '<td class="nowrap">' + szczegoly + '</td>';
  return '<td class="nowrap lp-kolejnosc"><button type="button" class="ruch" data-ruch="gora" aria-label="Przesuń wniosek ' + nr + ' wyżej" title="Wyżej (z potwierdzeniem)">&#9650;</button>' +
    '<span class="uchwyt" aria-hidden="true" title="Przeciągnij wiersz, aby zmienić kolejność">&#8942;&#8942;</span>' +
    '<button type="button" class="ruch" data-ruch="dol" aria-label="Przesuń wniosek ' + nr + ' niżej" title="Niżej (z potwierdzeniem)">&#9660;</button> ' + szczegoly + '</td>';
}

/* Status jako znacznik z kolorem; zmiana z menu wiersza (02-zestawienia-status.js), bez pola wyboru w kazdym wierszu */
function komorkaStatusu02(w, mozeEdytowac) {
  var zmien = mozeEdytowac
    ? ' <button type="button" class="btn xs zmien-status" data-status-menu="' + esc(w.id) + '" aria-haspopup="menu" aria-expanded="false"' +
      ' aria-label="Zmień status wniosku ' + esc(w.nr) + '" title="Zmień status">Zmień</button>' : "";
  return '<td class="nowrap">' + Statusy.znacznik(w) + zmien + '</td>';
}

function przyciskiAkcji(w, mozeEdytowac) {
  var nr = esc(w.nr);
  var usun = mozeEdytowac
    ? ' <button class="btn xs" data-usun="' + esc(w.id) + '" aria-label="Usuń wniosek ' + nr + ' z listy" title="Usuń wniosek z listy (klient zostaje w Bazie danych)">Usuń</button>' : "";
  return '<td class="right nowrap"><button class="btn xs" data-historia="' + esc(w.id) + '" aria-label="Historia zmian wniosku ' + nr + '" title="Historia zmian wniosku">Historia</button>' +
    usun + '</td>';
}

function wierszWniosku(w) {
  var ukryjIS = STAN_02.forcedInst ? ' style="display:none"' : "";
  var kontakt = kontaktWniosku(w);
  var edycja = Auth.edytujeModul("dofin");
  var kolejnosc = edycja && STAN_02.trybKolejnosci;
  return '<tr class="' + Statusy.klasaWiersza(w) + '" data-id="' + esc(w.id) + '"' + (kolejnosc ? ' draggable="true"' : "") + '>' +
    komorkaSzczegolow02(w, kolejnosc) +
    '<td class="strong nowrap">' + esc(w.nr) + '</td>' +
    '<td class="strong"><div class="tnij" title="' + esc(w.klNazwa) + '">' + esc(w.klNazwa) + '</div>' +
      '<span class="pod mono">' + esc(w.nip) + '</span></td>' +
    '<td class="kol-is"' + ukryjIS + '><div class="tnij" title="' + esc(w.isNazwa) + '">' + esc(w.isNazwa) + '</div></td>' +
    '<td><div class="tnij" title="' + esc(w.wykonawca) + '">' + (w.wykonawca ? esc(w.wykonawca) : BRAK_02) + '</div></td>' +
    '<td><div class="tnij" title="' + esc(kontakt.osoba) + '">' + (kontakt.osoba ? esc(kontakt.osoba) : BRAK_02) + '</div>' +
      '<span class="pod nowrap">' + (kontakt.tel ? esc(kontakt.tel) : "") + '</span></td>' +
    '<td><div class="tnij" title="' + esc(kontakt.mail) + '">' + (kontakt.mail ? esc(kontakt.mail) : BRAK_02) + '</div></td>' +
    '<td class="nowrap muted">' + esc(skrocUrzad(w.pupNazwa)) + '</td>' +
    '<td class="c">' + w.osobZakw + (w.osob !== w.osobZakw ? '<span class="muted">/' + w.osob + '</span>' : "") + '</td>' +
    '<td class="num">' + (w.kwotaWnioskowana != null ? DB.fmtPLN(w.kwotaWnioskowana) : BRAK_02) + '</td>' +
    '<td class="num strong">' + kwotaPoDecyzji(w, w.przyznano) + '</td>' +
    '<td class="num">' + kwotaPoDecyzji(w, w.kosztCalkowity) + '</td>' +
    komorkaStatusu02(w, edycja) +
    '<td>' + Statusy.znacznikRozliczenia(w) + '</td>' +
    '<td>' + znacznikiDokumentow(w) + '</td>' +
    '<td class="nowrap">' + (w.przygotowal ? esc(nazwaPrzygotowal(w.przygotowal)) : BRAK_02) + '</td>' +
    '<td><div class="tnij" title="' + esc(nazwyOpiekunow(w)) + '">' + (nazwyOpiekunow(w) ? esc(nazwyOpiekunow(w)) : BRAK_02) + '</div></td>' +
    przyciskiAkcji(w, edycja) +
    '</tr>';
}

/* "PUP Poznań" -> "Poznań": w kolumnie Urzad prefiks jest zawsze ten sam */
function skrocUrzad(nazwa) { return String(nazwa || "").replace(/^PUP\s+/, ""); }
