/* Konfigurator instytucji: zakladka formularza zgloszeniowego. Tylko deklaracje. */
function formularzRender(i) {
  document.getElementById("linkForm").value =
    "https://system.ldit.pl/zgloszenie/" + String(i.skrot || i.id).toLowerCase() + "-" + i.id.toLowerCase();
  document.getElementById("kfWyp").textContent = DB.fmtNum(DB.KLIENCI.filter(function (k) { return k.is === i.id; }).length);
  document.getElementById("kfKol").textContent =
    DB.KOLEJKA.filter(function (k) { return k.isId === i.id && k.status === "oczekuje"; }).length;

  var POLA = [
    ["Nazwa firmy", "tekst", true], ["NIP", "tekst, walidacja sumy kontrolnej", true],
    ["Adres siedziby", "tekst", true], ["Osoba kontaktowa", "tekst", true], ["Telefon", "tekst", true],
    ["Adres e-mail", "e-mail", true], ["Liczba zatrudnionych na umowę o pracę", "liczba", true],
    ["Rodzaj rozliczania", "lista wyboru", true], ["Szkolenie", "lista z katalogu instytucji, z ceną", true],
    ["Uczestnicy: imię i nazwisko", "lista powtarzalna", true], ["Uczestnicy: PESEL", "tekst, dana wrażliwa", true],
    ["Przypisanie uczestnika do szkolenia", "lista wyboru per uczestnik", false],
    ["Uwagi", "tekst wielolinijkowy", false], ["Zgoda na przetwarzanie danych", "pole wyboru", true]
  ];
  document.getElementById("polaForm").innerHTML = POLA.map(function (r) {
    return "<tr><td class='strong'>" + r[0] + "</td><td class='muted small'>" + r[1] + "</td>" +
      "<td class='c'>" + (r[2] ? '<span class="tag pos">tak</span>' : '<span class="tag mute">nie</span>') + "</td></tr>";
  }).join("");
}
