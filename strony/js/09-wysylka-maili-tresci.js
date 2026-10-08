/* Wysylka maili: tresci szablonow (docs/08-powiadomienia-i-automatyzacje.md). Stala, bez dostepu do danych. */
var TRESCI = {
  "SZB-01": {
    temat: "Krajowy Fundusz Szkoleniowy: zakładanie konta na praca.gov.pl",
    do: "{klient.mail}",
    tresc:
"Dzień dobry,\n\n" +
"poniżej instrukcja założenia konta na portalu praca.gov.pl. Konto jest potrzebne, żeby\n" +
"złożyć wniosek o dofinansowanie z Krajowego Funduszu Szkoleniowego w urzędzie\n" +
"{projekt.pup}.\n\n" +
"1. Wejdź na stronę www.praca.gov.pl i wybierz „Zaloguj się” w prawym górnym rogu.\n" +
"2. Wybierz sposób logowania: profil zaufany, e-dowód albo bankowość elektroniczną.\n" +
"3. Po zalogowaniu przejdź do zakładki „Usługi elektroniczne dla pracodawców”.\n" +
"4. Uzupełnij dane firmy: nazwa {klient.nazwa}, NIP {klient.nip}, adres siedziby.\n" +
"5. Nadaj uprawnienia osobie, która będzie składała wniosek w imieniu firmy.\n" +
"6. Odeślij nam potwierdzenie, że konto działa. Dalsze kroki przejmujemy my.\n\n" +
"Uwaga: profil zaufany musi należeć do osoby uprawnionej do reprezentacji firmy zgodnie\n" +
"z KRS lub CEIDG. Jeżeli wniosek ma składać pracownik, potrzebne będzie pełnomocnictwo.\n\n" +
"W razie pytań proszę o kontakt.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT"
  },
  "SZB-02": {
    temat: "Instrukcja złożenia pisma w urzędzie {projekt.pup}",
    do: "{klient.mail}",
    tresc:
"Dzień dobry,\n\n" +
"wniosek jest gotowy. Poniżej instrukcja złożenia pisma przez praca.gov.pl.\n\n" +
"1. Zaloguj się na praca.gov.pl na konto firmy {klient.nazwa}.\n" +
"2. Wybierz „Pismo do urzędu” i wskaż urząd: {projekt.pup}.\n" +
"3. Załącz pliki, które przesyłamy w załączniku tej wiadomości.\n" +
"4. Podpisz pismo profilem zaufanym i wyślij.\n" +
"5. Zachowaj Urzędowe Poświadczenie Przedłożenia i prześlij nam jego numer.\n\n" +
"Nabór w tym urzędzie kończy się {nabor.do}, prosimy o złożenie pisma najpóźniej dzień wcześniej.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT"
  },
  "SZB-03": {
    temat: "Prośba o wystawienie faktury: {klient.nazwa}, {projekt.szkolenie}",
    do: "{instytucja.mail}",
    tresc:
"Dzień dobry, proszę o wystawienie faktur dla Klientów:\n\n" +
"Nazwa Klienta: {klient.nazwa}\n" +
"Adres siedziby: {klient.adres}\n" +
"NIP: {klient.nip}\n\n" +
"Imię i nazwisko odbiorcy FV: {projekt.odbiorcaFV}\n\n" +
"Szkolenie: {projekt.szkolenie}\n" +
"Ilość osób: {projekt.osobZakwalifikowanych}\n" +
"Cena jedn.: {projekt.cenaJednostkowa}\n" +
"Cena całk.: {projekt.cenaCalkowita}\n" +
"VAT: ZW\n" +
"Termin płatności: {projekt.terminPlatnosci}\n\n" +
"Uwagi:\n" +
"- Usługa zwolniona z podatku VAT na podstawie § 3 ust. 1 pkt 14 Rozporządzenia Ministra\n" +
"  Finansów z dnia 20 grudnia 2013 r. w sprawie zwolnień od podatku od towarów i usług\n" +
"  oraz warunków stosowania tych zwolnień (Dz. U. z 2020 r. poz. 1983). Szkolenie\n" +
"  finansowane w {projekt.procentDofinansowania} z Krajowego Funduszu Szkoleniowego.\n" +
"- Uczestnicy: {projekt.listaUczestnikow}\n" +
"- Termin: {termin.od} do {termin.do}\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT",
    uwaga:
      'Klauzula w dokumencie klienta zakłada jeden procent finansowania. Wskaźnik zależy jednak od wielkości firmy ' +
      'i progu z tabeli progów dofinansowania, dlatego procent jest tu placeholderem ' +
      '<code>{projekt.procentDofinansowania}</code>. Parametryzacja do potwierdzenia u klienta.'
  },
  "SZB-04": {
    temat: "Wniosek o dofinansowanie KFS: {klient.nazwa}, w trakcie przygotowania",
    do: "{klient.mail}",
    tresc:
"Dzień dobry,\n\n" +
"potwierdzamy, że wniosek o dofinansowanie z Krajowego Funduszu Szkoleniowego\n" +
"dla firmy {klient.nazwa} jest w trakcie przygotowania.\n\n" +
"Szkolenie: {projekt.szkolenie}\n" +
"Liczba uczestników: {projekt.osobZakwalifikowanych}\n" +
"Urząd: {projekt.pup}\n" +
"Planowany termin złożenia: {nabor.do}\n\n" +
"Na tym etapie nie jest potrzebne żadne działanie po Państwa stronie. Odezwiemy się,\n" +
"gdy urząd wyda decyzję albo gdy będziemy potrzebowali dodatkowego dokumentu.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT"
  },
  "SZB-05": {
    temat: "Decyzja pozytywna, prosimy o ustalenie terminu: {klient.nazwa}",
    do: "{instytucja.mailTerminy}",
    tresc:
"Dzień dobry,\n\n" +
"urząd {projekt.pup} wydał decyzję pozytywną dla firmy {klient.nazwa}.\n\n" +
"Szkolenie: {projekt.szkolenie}\n" +
"Liczba uczestników: {projekt.osobZakwalifikowanych}\n" +
"Tryb: {szkolenie.tryb}, {szkolenie.godziny} godzin, {szkolenie.dni} dni\n\n" +
"Prosimy o wskazanie terminu realizacji i wpisanie go w systemie. Termin musimy zgłosić\n" +
"do urzędu, więc prosimy o odpowiedź w ciągu 3 dni roboczych.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT"
  },
  "SZB-06": {
    temat: "Termin ustalony, zgłoś do urzędu: {klient.nazwa}",
    do: "zespol@ldit.pl",
    tresc:
"Powiadomienie wewnętrzne.\n\n" +
"Instytucja {instytucja.nazwa} wpisała termin dla projektu {projekt.nr}.\n\n" +
"Klient: {klient.nazwa}\n" +
"Szkolenie: {projekt.szkolenie}\n" +
"Termin: {termin.od} do {termin.do}, {termin.miejsce}\n" +
"Urząd do zgłoszenia: {projekt.pup}\n\n" +
"Do wykonania: zgłoszenie terminu do urzędu."
  },
  "SZB-07": {
    temat: "Szczegóły organizacyjne szkolenia: {projekt.szkolenie}",
    do: "{uczestnik.mail}",
    tresc:
"Dzień dobry,\n\n" +
"przypominamy o szkoleniu, na które są Państwo zapisani.\n\n" +
"Szkolenie: {projekt.szkolenie}\n" +
"Termin: {termin.od} do {termin.do}\n" +
"Miejsce: {termin.miejsce}\n" +
"Godzina rozpoczęcia: 9:00\n" +
"Prowadzący: {instytucja.nazwa}\n\n" +
"Prosimy o zabranie dokumentu tożsamości. Lista obecności jest wymagana przez urząd\n" +
"do rozliczenia dofinansowania.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT",
    uwaga:
      'Szablon autorstwa instytucji, ale wysyłany z domeny LDIT <span class="ref">D-87</span>. ' +
      'Instytucja może go otworzyć w Outlooku i wysłać z własnej skrzynki <span class="ref">D-88</span>.'
  },
  "SZB-08": {
    temat: "Paczka rozliczeniowa i certyfikaty: {klient.nazwa}",
    do: "{klient.mail}",
    tresc:
"Dzień dobry,\n\n" +
"szkolenie zostało zrealizowane. W załączniku przesyłamy komplet dokumentów\n" +
"potrzebnych do rozliczenia dofinansowania:\n\n" +
"- certyfikaty wszystkich uczestników (po jednym pliku PDF na osobę),\n" +
"- załączniki rozliczeniowe,\n" +
"- faktura od instytucji szkoleniowej,\n" +
"- instrukcja złożenia rozliczenia przez praca.gov.pl.\n\n" +
"Rozliczenie należy złożyć w urzędzie {projekt.pup} w terminie wynikającym z umowy.\n" +
"W razie pytań proszę o kontakt.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT",
    uwaga:
      'System nie wysyła certyfikatów automatycznie <span class="ref">D-49</span>. ' +
      'Paczka ZIP jest pobierana z karty projektu i dołączana ręcznie. ' +
      'Czy faktura w paczce jest generowana przez system, czy dokładana ręcznie, pozostaje nieustalone ' +
      '<span class="ref p">P-18</span>.'
  },
  "SZB-09": {
    temat: "Jak nam poszło? Prosimy o opinię",
    do: "{klient.mail}",
    tresc:
"Dzień dobry,\n\n" +
"dofinansowanie dla firmy {klient.nazwa} zostało rozliczone, szkolenie za nami.\n\n" +
"Jeżeli współpraca spełniła Państwa oczekiwania, będziemy wdzięczni za krótką opinię\n" +
"w wizytówce Google. Zajmuje to około minuty, a dla nas ma bardzo dużą wartość:\n\n" +
"{link.opinieGoogle}\n\n" +
"Jeżeli cokolwiek poszło nie tak, prosimy o wiadomość zwrotną zamiast opinii.\n" +
"Poprawimy to.\n\n" +
"Dziękujemy za zaufanie i zapraszamy w przyszłym roku, KFS jest przyznawany co roku.\n\n" +
"Pozdrawiam\n{opiekun.imie}\nLDIT"
  }
};
