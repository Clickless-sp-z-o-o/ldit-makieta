/* Ekran Wniosek: osoby kontaktowe wniosku (D-133, D-169, D-178). Zostaja na poziomie wniosku, bo
   zmieniaja sie niezaleznie od danych firmy, ktore edytuje sie w karcie klienta (D-265).
   Pola rysuje start ekranu raz, wartosci ustawia renderDane().
   Tylko deklaracje, bez kodu wykonywanego od razu. */

function polaOsoby(numer, osoba, mail, tel) {
  return '<div class="field" style="margin-bottom:8px"><label>Osoba ' + numer + '</label>' +
    '<input class="inp" id="' + osoba + '" placeholder="imię i nazwisko"></div>' +
    '<div class="grid g2" style="gap:10px;margin-bottom:' + (numer === 1 ? "14" : "0") + 'px">' +
    '<div class="field mb0"><label>E-mail</label><input class="inp" id="' + mail + '"></div>' +
    '<div class="field mb0"><label>Telefon</label><input class="inp" id="' + tel + '"></div></div>';
}

function narysujKontakty() {
  el("kontaktyWniosku").innerHTML =
    polaOsoby(1, "fkOsoba1", "fkMail1", "fkTel1") + polaOsoby(2, "fkOsoba2", "fkMail2", "fkTel2");
}
