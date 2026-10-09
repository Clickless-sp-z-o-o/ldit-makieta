/* Ekran 22: projekt (?id=) albo klient (?klient=) instytucji, tylko do odczytu (D-319).
   Projekt lub klient spoza zakresu konta (inna instytucja, u handlowca cudzy klient) daje
   komunikat zamiast danych, bo DB.* zawiera wylacznie rekordy z zakresu. Same deklaracje. */

var ADRES_22 = Nawigacja.odczytajZapytanie(location.search, ["id", "klient"]);

function el22(id) { return document.getElementById(id); }

function brak22(tekst) {
  el22("brak22").hidden = false;
  el22("brak22").textContent = tekst;
  el22("tresc22").innerHTML = "";
}

function pokazProjekt22(id) {
  var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === id; })[0];
  if (!w) { brak22("Nie ma takiego projektu w danych Twojej instytucji."); return; }
  el22("tytul22").textContent = "Projekt " + (w.nr || w.id) + ": " + w.klNazwa;
  document.title = "Projekt " + (w.nr || w.id) + " · System KFS";
  el22("tresc22").innerHTML = '<div class="grid g-2-1"><div>' + sekcjaDanych22(w) + sekcjaUczestnikow22(w) + "</div><div>" +
    sekcjaSzkolen22(w) + sekcjaDokumentow22(w) + sekcjaPrzebiegu22(w) + "</div></div>";
}

function pokazKlienta22(id) {
  var k = DB.KLIENCI.filter(function (x) { return x.id === id; })[0];
  if (!k) { brak22("Nie ma takiego klienta w danych Twojej instytucji."); return; }
  el22("tytul22").textContent = k.nazwa;
  el22("opis22").textContent = "Dane klienta i wszystkie jego projekty w Twojej instytucji, tylko do odczytu.";
  var kontakt = (k.kontakty || []).map(function (c) {
    return esc(c.osoba || "") + (c.tel || c.mail ? ' <span class="small muted">' + esc([c.tel, c.mail].filter(Boolean).join(" · ")) + "</span>" : "");
  }).join("<br>");
  var projekty = DB.WNIOSKI_WSZYSTKIE.filter(function (w) { return w.klient === k.id; }).map(function (w) {
    return '<tr><td class="mono"><a href="22-projekt-is.html?id=' + encodeURIComponent(w.id) + '">' + esc(w.nr || w.id) + "</a></td><td>" +
      esc(w.szkolenie || "") + "</td><td>" + esc(statusProjektu22(w)) + '</td><td class="num">' + w.osob + "</td></tr>";
  });
  el22("tresc22").innerHTML = '<div class="grid g-1-2"><div>' + karta22("Dane klienta", "", '<dl class="dl" style="padding:12px 16px">' +
    pole22("NIP", '<span class="mono">' + esc(k.nip || "") + "</span>") + pole22("Miasto", esc(k.miasto || "")) +
    pole22("Wielkość", esc(k.wielkosc || "")) + pole22("Kontakt", kontakt) + "</dl>") + "</div><div>" +
    karta22("Projekty klienta", "", tabela22(["Numer", "Szkolenie", "Status", "Osób"], projekty, "Klient nie ma projektów.")) + "</div></div>";
}

function inicjuj22() {
  if (ADRES_22.id) pokazProjekt22(ADRES_22.id);
  else if (ADRES_22.klient) pokazKlienta22(ADRES_22.klient);
  else brak22("Wybierz projekt albo klienta w panelu instytucji.");
}
