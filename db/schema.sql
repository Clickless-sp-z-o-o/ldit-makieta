-- ============================================================================
-- System KFS / LDIT - schemat bazy danych (SQLite)
-- Zrodlo: docs/03-model-danych.md, decyzje D-01 .. D-297.
-- Ten plik jest jedynym zrodlem prawdy o strukturze danych makiety.
-- Przenosi sie na Postgresa praktycznie bez zmian. Typy jak w PostgreSQL (R-01): kwoty NUMERIC(12,2),
-- daty DATE, chwile TIMESTAMPTZ. SQLite przechowuje je tak samo jak wczesniej (tekst ISO, liczby).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------------
-- 0. ZRODLA DANYCH (src_, warstwa brazowa)
-- --------------------------------------------------------------------------

-- Surowy zrzut naborow ogloszonych z zewnetrznego pliku Excel (D-271). Wczytuje go
-- automatyzacja, aplikacja go nie pokazuje. Przedrostek src_ oznacza tabele techniczne.
-- Kolumny sa tekstem, tak jak w pliku; dopasowanie do slownika urzedow robi automatyzacja.
CREATE TABLE src_nabory_ogloszone (
  id                 TEXT PRIMARY KEY,
  wczytano           TIMESTAMPTZ NOT NULL,
  plik_zrodlowy      TEXT,
  wojewodztwo        TEXT,
  urzad              TEXT,
  deficyt_wojewodzki TEXT,
  deficyt_powiatowy  TEXT,
  data_weryfikacji   DATE,
  data_od            DATE,
  data_do            DATE,
  status             TEXT,
  srodki             TEXT,
  link               TEXT,
  podsumowanie       TEXT
);

-- Surowy zrzut prognoz naborow z drugiego pliku Excel (D-271)
CREATE TABLE src_nabory_prognozowane (
  id               TEXT PRIMARY KEY,
  wczytano         TIMESTAMPTZ NOT NULL,
  plik_zrodlowy    TEXT,
  wojewodztwo      TEXT,
  urzad            TEXT,
  prognoza_opis    TEXT,
  data_od          DATE,
  data_do          DATE,
  data_weryfikacji DATE,
  podsumowanie     TEXT
);

-- --------------------------------------------------------------------------
-- 1. SLOWNIKI I KONFIGURACJA
-- --------------------------------------------------------------------------

-- Jeden slownik dopuszczalnych urzedow pracy (ok. 340), wgrywany i zmieniany wylacznie
-- przez administratora (D-272). Aliasy to nazwy, pod ktorymi urzad przychodzi w plikach
-- zrodlowych. Kolumny najblizszego naboru liczy widok v_urzedy_nabory (views.sql).
CREATE TABLE urzedy_pracy (
  id          TEXT PRIMARY KEY,
  nazwa       TEXT NOT NULL UNIQUE,
  wojewodztwo TEXT NOT NULL,
  powiat      TEXT NOT NULL,
  aliasy      TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(aliasy) AND json_type(aliasy) = 'array')
);

-- Slownik statusow wniosku (D-296, R-08): trzy kolumny statusu wniosku wskazuja wartosci
-- z tego slownika, wiec literowka w imporcie nie przejdzie. Wartosci sa rozlaczne miedzy
-- rodzajami. ON UPDATE CASCADE: zmiana nazwy statusu przechodzi na wnioski.
CREATE TABLE statusy_wniosku (
  wartosc   TEXT PRIMARY KEY,
  rodzaj    TEXT NOT NULL CHECK (rodzaj IN ('skladanie','decyzja','rozliczenie')),
  kolejnosc INTEGER NOT NULL
);

-- Dozwolone przejscia: akcja na wniosku ustawia razem status skladania, decyzje, etap
-- i rozliczenie (D-146, D-296). rozliczenie_start: rozliczenie 'Oczekuje', gdy wniosek
-- jeszcze nie byl rozliczany; tylko_pozytywna: akcja wymaga decyzji pozytywnej.
CREATE TABLE akcje_statusow (
  akcja             TEXT PRIMARY KEY,
  etykieta          TEXT NOT NULL,
  status_skladania  TEXT REFERENCES statusy_wniosku (wartosc) ON UPDATE CASCADE,
  status_decyzji    TEXT REFERENCES statusy_wniosku (wartosc) ON UPDATE CASCADE,
  ustawia_decyzje   INTEGER NOT NULL DEFAULT 1 CHECK (ustawia_decyzje IN (0,1)),  -- 0 = zostaw decyzje
  status_rozliczenia TEXT REFERENCES statusy_wniosku (wartosc) ON UPDATE CASCADE,
  rozliczenie_start INTEGER NOT NULL DEFAULT 0 CHECK (rozliczenie_start IN (0,1)),
  etap              INTEGER NOT NULL CHECK (etap BETWEEN 1 AND 10),
  tylko_pozytywna   INTEGER NOT NULL DEFAULT 0 CHECK (tylko_pozytywna IN (0,1)),
  data_wniosku      INTEGER NOT NULL DEFAULT 0 CHECK (data_wniosku IN (0,1)),
  kolejnosc         INTEGER NOT NULL
);

-- Progi dofinansowania konfigurowalne i wersjonowane data (D-131, koryguje D-59)
CREATE TABLE progi_dofinansowania (
  id                     TEXT PRIMARY KEY,
  wielkosc               TEXT NOT NULL CHECK (wielkosc IN ('mikro','mały','średni','duży','inny')),
  procent_dofinansowania NUMERIC(5,2) NOT NULL CHECK (procent_dofinansowania BETWEEN 0 AND 100),
  obowiazuje_od          DATE NOT NULL,
  obowiazuje_do          DATE
);
CREATE INDEX idx_progi_dof_okres ON progi_dofinansowania (wielkosc, obowiazuje_od);

-- Zakladki roczne Dofinansowan (D-129, D-159). Kolejny rok dodaje wylacznie
-- administrator w Ustawieniach (D-273, odwraca czesc D-165), bez udzialu wykonawcy. Wniosek bez roku jest
-- "nieprzypisany", a nie znika (D-165).
CREATE TABLE lata_zestawien (
  rok        TEXT PRIMARY KEY CHECK (length(rok) = 4 AND rok GLOB '[0-9][0-9][0-9][0-9]'),
  opis       TEXT,
  utworzono  DATE NOT NULL,
  utworzyl   TEXT
);

-- --------------------------------------------------------------------------
-- 2. INSTYTUCJE SZKOLENIOWE I ICH WARUNKI
-- --------------------------------------------------------------------------

-- Instytucje szkoleniowe wspolpracujace z LDIT; w Open Mercato organizacja w tenancie LDIT (D-176).
-- Opiekunowie w instytucja_opiekunowie (D-274), dane w zakladce Konto instytucji (D-288).
CREATE TABLE instytucje (
  id                   TEXT PRIMARY KEY,
  nazwa                TEXT NOT NULL,
  skrot                TEXT,
  siedziba_miejscowosc TEXT,          -- zrodlo pola "miejscowosc" na certyfikacie (D-99)
  nip                  TEXT,
  strona_www           TEXT,
  -- Do trzech osob kontaktowych instytucji (D-166). Pierwsza jest glowna.
  osoba_kontaktowa     TEXT,
  email                TEXT,
  telefon              TEXT,
  osoba_kontaktowa_2   TEXT,
  email_2              TEXT,
  telefon_2            TEXT,
  osoba_kontaktowa_3   TEXT,
  email_3              TEXT,
  telefon_3            TEXT,
  opis_dzialalnosci    TEXT,
  standard_godzinowy   TEXT,
  model_terminow       TEXT NOT NULL DEFAULT 'kalendarz'
                       CHECK (model_terminow IN ('kalendarz','z_gory')),  -- D-142
  -- Czy po decyzji pozytywnej wychodzi automatyczna prosba o ustalenie terminu (D-247)
  mail_prosba_o_termin INTEGER NOT NULL DEFAULT 1,
  -- Kolor instytucji uzywany wylacznie w kalendarzu terminow (D-267)
  kolor_kalendarza     TEXT CHECK (kolor_kalendarza IS NULL OR kolor_kalendarza GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  aktywna              INTEGER NOT NULL DEFAULT 1
);

-- Tabela szkoleniowcow usunieta (D-243): instytucje nie podaja kontaktow do swoich trenerow.

-- Warunki prowizyjne wersjonowane w czasie (D-22). obowiazuje_do NULL = aktualne.
-- Nowa wersja dziala od swojej daty, nigdy wstecz (D-23, D-162).
-- Progi leza w tej samej tabeli jako lista JSON [{"od": kwota, "st": stawka}],
-- zamiast osobnej tabeli progow (D-168).
CREATE TABLE warunki_prowizyjne (
  id               TEXT PRIMARY KEY,
  instytucja_id    TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  obowiazuje_od    DATE NOT NULL,
  obowiazuje_do    DATE,
  model            TEXT NOT NULL CHECK (model IN ('A','B','C','D')),
  rodzaj_kumulacji TEXT NOT NULL CHECK (rodzaj_kumulacji IN ('miesieczny','roczny','brak')),
  sposob_liczenia  TEXT NOT NULL CHECK (sposob_liczenia IN ('od_calosci','od_nadwyzki','stala')),
  stawka_stala     NUMERIC(12,2),
  progi            TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(progi) AND json_type(progi) = 'array')
);
CREATE INDEX idx_warunki_inst ON warunki_prowizyjne (instytucja_id, obowiazuje_od);

-- Szablon szkolenia (D-06). Realizacje sa w tabeli terminy.
CREATE TABLE katalog_szkolen (
  id             TEXT PRIMARY KEY,
  instytucja_id  TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  nazwa          TEXT NOT NULL,
  liczba_godzin  INTEGER,
  liczba_dni     INTEGER,
  tryb           TEXT CHECK (tryb IN ('Online','Stacjonarne','Mieszane')),
  plan_szkolenia TEXT,             -- program szkolenia: tresc planu
  -- Szczegoly planu do edycji na karcie planu (D-225)
  cel_szkolenia    TEXT,
  grupa_docelowa   TEXT,
  efekty_uczenia   TEXT,
  wymagania        TEXT,
  forma_zaliczenia TEXT,
  zaktualizowano   TEXT,
  UNIQUE (id, instytucja_id)
);
CREATE INDEX idx_szkolenia_inst ON katalog_szkolen (instytucja_id);

-- Lista cen szkolenia do wyboru we wniosku (D-277): jednej ceny w katalogu nie ma.
-- Inna kwota z wniosku dopisuje sie tu po potwierdzeniu (zrodlo 'wniosek'), para
-- szkolenie, cena jest unikalna (R-11).
CREATE TABLE ceny_szkolen (
  id            TEXT PRIMARY KEY,
  szkolenie_id  TEXT NOT NULL,
  instytucja_id TEXT NOT NULL,
  cena          NUMERIC(12,2) NOT NULL CHECK (cena >= 0),
  zrodlo        TEXT NOT NULL DEFAULT 'katalog' CHECK (zrodlo IN ('katalog','wniosek')),
  dodano        DATE,
  dodal_id      TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  UNIQUE (szkolenie_id, cena),
  FOREIGN KEY (szkolenie_id, instytucja_id) REFERENCES katalog_szkolen (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Jedna tabela plikow (D-278, R-12): pliki szkolen (program, harmonogram, materialy), plik
-- zrodlowy formularza do podgladu (D-287), PDF certyfikatu (D-290) i PDF faktury z importu (D-183).
-- Plik nalezy do dokladnie jednego rekordu. W makiecie tresc lezy w bazie jako base64,
-- w aplikacji docelowej plik trafia do modulu zalacznikow Open Mercato, a tu zostaje sciezka.
CREATE TABLE pliki (
  id            TEXT PRIMARY KEY,
  instytucja_id TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,  -- separacja (D-295)
  szkolenie_id  TEXT,     -- rodzic: dokladnie jeden z czterech, klucze obce zlozone z instytucja ponizej
  formularz_id  TEXT,
  certyfikat_id TEXT,
  faktura_id    TEXT,
  nazwa         TEXT NOT NULL,
  typ           TEXT,
  rozmiar       INTEGER NOT NULL DEFAULT 0,
  rodzaj        TEXT NOT NULL DEFAULT 'inny'
                CHECK (rodzaj IN ('program','harmonogram','materialy','formularz','certyfikat','faktura','inny')),
  sciezka       TEXT,     -- odnosnik do pliku na serwerze (aplikacja docelowa)
  tresc         TEXT,     -- makieta: zawartosc base64
  dodano        TIMESTAMPTZ NOT NULL,
  dodal_id      TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  CHECK ((szkolenie_id IS NOT NULL) + (formularz_id IS NOT NULL) + (certyfikat_id IS NOT NULL) + (faktura_id IS NOT NULL) = 1),
  -- Instytucja pliku = instytucja rodzica: nie da sie dopisac pliku do szkolenia czy certyfikatu konkurenta (D-295)
  FOREIGN KEY (szkolenie_id, instytucja_id) REFERENCES katalog_szkolen (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (formularz_id, instytucja_id) REFERENCES formularze_oczekujace (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (certyfikat_id, instytucja_id) REFERENCES certyfikaty (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (faktura_id, instytucja_id) REFERENCES faktury (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_pliki_szkolenie ON pliki (szkolenie_id);
CREATE INDEX idx_pliki_formularz ON pliki (formularz_id);
CREATE INDEX idx_pliki_certyfikat ON pliki (certyfikat_id);
CREATE INDEX idx_pliki_faktura ON pliki (faktura_id);

-- Termin = realizacja szablonu. Kalendarz per instytucja (D-142).
CREATE TABLE terminy (
  id                TEXT PRIMARY KEY,
  instytucja_id     TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  szkolenie_id      TEXT NOT NULL,   -- klucz obcy zlozony z instytucja ponizej
  nazwa             TEXT,
  data_od           DATE,
  data_do           DATE,
  miejsce           TEXT,
  status_realizacji TEXT CHECK (status_realizacji IN ('Wolny','Zaplanowany','Odbyty')),
  zapisani          INTEGER NOT NULL DEFAULT 0,
  limit_miejsc      INTEGER,
  FOREIGN KEY (szkolenie_id, instytucja_id) REFERENCES katalog_szkolen (id, instytucja_id) ON UPDATE CASCADE  -- termin w instytucji szkolenia (D-295)
);
CREATE INDEX idx_terminy_inst ON terminy (instytucja_id, data_od);

-- --------------------------------------------------------------------------
-- 3. KLIENCI I WNIOSKI
-- --------------------------------------------------------------------------

-- Dane stale klienta. Z bazy nie usuwa sie nikogo (warsztat 04.09, 1:13:37).
-- Dane zmienne w czasie (liczba zatrudnionych, kontakt do sprawy) leza we
-- wniosku (D-169). Klient nalezy do jednej instytucji (D-282, odwraca D-144): ta sama
-- firma w drugiej instytucji to osobny wiersz z wlasnym id, celowo bez powiazania.
CREATE TABLE klienci (
  id                        TEXT PRIMARY KEY,
  numer_klienta             INTEGER NOT NULL,   -- sekwencyjny w roku, trafia na fakture (D-112)
  nazwa                     TEXT NOT NULL,
  nip                       TEXT,
  wielkosc_przedsiebiorstwa TEXT CHECK (wielkosc_przedsiebiorstwa IN ('mikro','mały','średni','duży','inny')),
  -- Do trzech osob kontaktowych klienta (D-169). Pierwsza jest glowna.
  osoba_kontaktowa          TEXT,
  telefon                   TEXT,
  email                     TEXT,
  osoba_kontaktowa_2        TEXT,
  telefon_2                 TEXT,
  email_2                   TEXT,
  osoba_kontaktowa_3        TEXT,
  telefon_3                 TEXT,
  email_3                   TEXT,
  miasto                    TEXT,
  adres_siedziby            TEXT,
  instytucja_id             TEXT NOT NULL REFERENCES instytucje (id),  -- jedyna instytucja klienta (D-282)
  -- Handlowiec instytucji prowadzacy klienta. Konto bez feature zakres.cala_instytucja
  -- widzi wylacznie swoich klientow (D-210). Dawniej w klient_instytucja.
  handlowiec_id             TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  pup_id                    TEXT REFERENCES urzedy_pracy (id),
  zainteresowany_naborem    INTEGER NOT NULL DEFAULT 0,       -- flaga kolejnego naboru (D-130)
  -- Dane z formularza klienta przy kliencie, nie we wniosku (D-235). Wniosek
  -- kopiuje liczbe zatrudnionych na dzien wniosku (D-169).
  liczba_zatrudnionych      INTEGER CHECK (liczba_zatrudnionych IS NULL OR liczba_zatrudnionych >= 0),
  numer_konta               TEXT,
  zadluzenie                TEXT CHECK (zadluzenie IN ('brak','zus','us','zus_us','inne')),
  -- Pelny formularz klienta (lista pol z 06.10.2026, D-256). Zadluzenie 'brak'
  -- to odpowiedz NIE na pytanie o nieuregulowane zobowiazania.
  telefon_biura             TEXT,
  email_firmy               TEXT,
  stanowisko_kontaktowej    TEXT,             -- stanowisko osoby z kolumny osoba_kontaktowa
  nazwa_banku               TEXT,
  etaty                     NUMERIC(6,2) CHECK (etaty IS NULL OR etaty >= 0),  -- umowy o prace w przeliczeniu na etaty
  liczba_innych_umow        INTEGER CHECK (liczba_innych_umow IS NULL OR liczba_innych_umow >= 0),
  forma_opodatkowania       TEXT,
  stawka_podatku            NUMERIC(5,2) CHECK (stawka_podatku IS NULL OR stawka_podatku BETWEEN 0 AND 100),
  reprezentant_1            TEXT,             -- osoba uprawniona do reprezentacji i podpisu
  reprezentant_1_stanowisko TEXT,
  reprezentant_2            TEXT,
  reprezentant_2_stanowisko TEXT,
  zadluzenie_ugoda          INTEGER CHECK (zadluzenie_ugoda IN (0,1)),  -- porozumienie lub ugoda, tylko przy zadluzeniu
  konto_praca_gov           INTEGER CHECK (konto_praca_gov IN (0,1)),   -- zweryfikowane konto organizacji na praca.gov.pl (D-257)
  -- Czarna lista (D-249). Regula: co najmniej dwa zgloszenia "Niezlozony wniosek"
  -- z roznych dat. Reczna zmiana wylacza regule, "Przywroc regule" ja odtwarza.
  czarna_lista              INTEGER NOT NULL DEFAULT 0,
  czarna_lista_regula_aktywna INTEGER NOT NULL DEFAULT 1,
  utworzono                 DATE,                             -- poczatek biegu retencji (D-186)
  UNIQUE (instytucja_id, nip),    -- ta sama firma raz w instytucji (R-04)
  UNIQUE (id, instytucja_id)      -- cel zlozonych kluczy obcych tabel podrzednych (D-295)
);
CREATE INDEX idx_klienci_nip ON klienci (nip);
CREATE INDEX idx_klienci_nazwa ON klienci (nazwa);
CREATE INDEX idx_klienci_handlowiec ON klienci (handlowiec_id);

-- Firmy po NIP: jedna wspolna tabela klientow wszystkich instytucji (D-283). Podstawowe
-- dane i flaga czarnej listy. Na razie nieuzywana w aplikacji, czarna lista dziala przy
-- kliencie (D-249), dopoki tabela nie wejdzie do aplikacji.
CREATE TABLE firmy (
  nip                       TEXT PRIMARY KEY,
  nazwa                     TEXT NOT NULL,
  miasto                    TEXT,
  adres_siedziby            TEXT,
  wielkosc_przedsiebiorstwa TEXT CHECK (wielkosc_przedsiebiorstwa IN ('mikro','mały','średni','duży','inny')),
  czarna_lista              INTEGER NOT NULL DEFAULT 0 CHECK (czarna_lista IN (0,1)),
  zaktualizowano            DATE
);

-- Tabela klient_instytucja usunieta (D-282): klient nalezy do jednej instytucji.

-- Dodatkowe urzedy pracy klienta z oddzialami (D-238). Glowny urzad jest w
-- klienci.pup_id, tu leza pozostale. W Naborach kazdy urzad to osobny wiersz.
CREATE TABLE klient_urzedy (
  id            TEXT PRIMARY KEY,
  klient_id     TEXT NOT NULL,
  instytucja_id TEXT NOT NULL,   -- instytucja klienta, separacja (D-295)
  pup_id        TEXT NOT NULL REFERENCES urzedy_pracy (id),
  oddzial       TEXT,
  UNIQUE (klient_id, pup_id),
  FOREIGN KEY (klient_id, instytucja_id) REFERENCES klienci (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_klient_urzedy_pup ON klient_urzedy (pup_id);

-- Uczestnicy (pracownicy) klienta, dodawani na karcie klienta (D-236). Wniosek
-- tylko wybiera z tej listy, wiec kolejny wniosek nie wymaga przepisywania danych.
-- Wiek liczy widok v_uczestnicy_klienta z numeru PESEL.
CREATE TABLE uczestnicy_klienta (
  id                  TEXT PRIMARY KEY,
  klient_id           TEXT NOT NULL,
  instytucja_id       TEXT NOT NULL,   -- instytucja klienta, separacja (D-295)
  imie_nazwisko       TEXT NOT NULL,
  pesel               TEXT,     -- dane wrazliwe, feature klient.pesel
  rodzaj_zatrudnienia TEXT CHECK (rodzaj_zatrudnienia IN
                      ('umowa_o_prace','umowa_zlecenie','umowa_o_dzielo','wlasciciel','inna')),
  zatrudnienie_do     DATE,     -- termin zatrudnienia, NULL = czas nieokreslony
  wyksztalcenie       TEXT,
  zawod               TEXT,
  utworzono           DATE,     -- poczatek biegu retencji danych osobowych (D-186)
  FOREIGN KEY (klient_id, instytucja_id) REFERENCES klienci (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_uczestnicy_klienta ON uczestnicy_klienta (klient_id);

-- Nabory z dwoch zrodel (D-271): ogloszone i prognozowane, prognoza to osobny wiersz.
-- Wszystko jest KFS, wiec rodzaj mowi tylko, z ktorego zrodla jest wiersz. Liczbe dni
-- naboru liczy widok v_nabory. Klientow urzedu pokazuje filtr, bez liczby w naborze.
CREATE TABLE nabory (
  id                 TEXT PRIMARY KEY,
  pup_id             TEXT NOT NULL REFERENCES urzedy_pracy (id),  -- wojewodztwo i powiat z urzedu
  rodzaj             TEXT NOT NULL CHECK (rodzaj IN ('ogloszony','prognozowany')),
  status             TEXT NOT NULL CHECK (status IN ('trwa','zakończony','oczekuje','prognozowany')),
  deficyt_wojewodzki TEXT,     -- kategorie osob kierowanych do dofinansowania w wojewodztwie
  deficyt_powiatowy  TEXT,     -- kategorie osob kierowanych do dofinansowania w powiecie
  data_weryfikacji   DATE,     -- kiedy nabor ostatnio sprawdzono
  data_od            DATE,     -- poczatek naboru, przy prognozie przewidywany
  data_do            DATE,     -- koniec naboru, przy prognozie czesto pusty
  prognoza_opis      TEXT,     -- prognoza: termin tekstem, np. polowa pazdziernika
  srodki             TEXT,     -- srodki urzedu, tekst
  link               TEXT,     -- ogloszenie naboru
  podsumowanie       TEXT,
  zrodlo_id          TEXT      -- id wiersza src_, po ktorym automatyzacja aktualizuje nabor
);
CREATE INDEX idx_nabory_pup ON nabory (pup_id);

-- Faktura z importu CSV systemu ksiegowego (D-163). Szczegoly szkolenia nie sa
-- kopiowane, widok v_faktura_szczegoly bierze je z wnioskow (D-170).
-- Korekta trafia do okresu swojej daty wystawienia, nie pierwotnej (D-161).
CREATE TABLE faktury (
  id               TEXT PRIMARY KEY,
  numer            TEXT NOT NULL,
  instytucja_id    TEXT NOT NULL REFERENCES instytucje (id),
  klient_id        TEXT REFERENCES klienci (id),
  rodzaj           TEXT NOT NULL DEFAULT 'zwykla' CHECK (rodzaj IN ('zwykla','korygujaca')),
  faktura_pierwotna_id TEXT REFERENCES faktury (id),
  kwota            NUMERIC(12,2) NOT NULL,
  vat              TEXT,
  data_wystawienia DATE,
  termin_platnosci DATE,
  status           TEXT,
  liczba_projektow INTEGER NOT NULL DEFAULT 0,      -- PDF z importu jest w tabeli pliki (D-183, D-278)
  CHECK ((rodzaj = 'korygujaca') = (faktura_pierwotna_id IS NOT NULL)),
  UNIQUE (id, instytucja_id)       -- cel zlozonych kluczy obcych (D-295)
);
CREATE INDEX idx_faktury_inst ON faktury (instytucja_id, data_wystawienia);
CREATE INDEX idx_faktury_klient ON faktury (klient_id);

-- Wniosek = projekt (D-53). Jeden klient ma wiele wnioskow.
-- Odwrocenie wyliczen z D-134: recznie wpisujemy koszt Z DOPLATA, a koszt
-- calkowity jest roznica. Kolumny *_regula_aktywna realizuja zasade D-19:
-- reczna edycja kasuje regule, przycisk "Przywroc regule" ja odtwarza.
CREATE TABLE wnioski (
  id                        TEXT PRIMARY KEY,
  numer                     INTEGER NOT NULL,
  rok                       TEXT REFERENCES lata_zestawien (rok) ON DELETE SET NULL,  -- NULL = nieprzypisany (D-165)
  klient_id                 TEXT NOT NULL REFERENCES klienci (id),
  instytucja_id             TEXT NOT NULL REFERENCES instytucje (id),
  pup_id                    TEXT REFERENCES urzedy_pracy (id),
  nabor_id                  TEXT REFERENCES nabory (id),
  szkolenie_glowne_id       TEXT REFERENCES katalog_szkolen (id),
  faktura_id                TEXT REFERENCES faktury (id),          -- numer przy wniosku (D-139)
  handlowiec_id             TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,  -- D-210
  przygotowal_id            TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,  -- kto przygotowal wniosek (D-233)
  wykonawca                 TEXT,             -- realizator szkolenia (podwykonawca) obok instytucji (D-258)
  -- Kolumna "Wartosc" (D-259): suma zakwalifikowanych szkolen uczestnikow, z regula (D-281, D-19).
  -- Przy aktywnej regule pole przechowuje wartosc wyliczona, reczna zmiana wylacza regule.
  kwota_wnioskowana         NUMERIC(12,2) CHECK (kwota_wnioskowana IS NULL OR kwota_wnioskowana >= 0),
  kwota_regula_aktywna      INTEGER NOT NULL DEFAULT 1,
  -- Formularz, z ktorego zalozono projekt ta sama sciezka co recznie (D-264). NULL = projekt reczny.
  formularz_id              TEXT REFERENCES formularze_oczekujace (id) ON DELETE SET NULL,
  -- Numer (id, numer) jest staly, a liczba porzadkowa na liscie wynika z pozycji
  -- i liczy sie bez luk (D-261). Wniosek wycofany przed rozpoczeciem pracy znika
  -- z listy (usuniety = 1), a klient zostaje w bazie i czeka na kolejny nabor.
  pozycja                   INTEGER,
  usuniety                  INTEGER NOT NULL DEFAULT 0 CHECK (usuniety IN (0,1)),
  usunieto                  TIMESTAMPTZ,
  etap                      INTEGER NOT NULL DEFAULT 3 CHECK (etap BETWEEN 1 AND 10),  -- D-146

  -- Dane zmienne klienta na poziomie wniosku (D-132, D-133, D-169). NULL = bierz z klienta.
  -- Po adresach e-mail wniosku dopasowywana jest korespondencja (D-178).
  wielkosc_przedsiebiorstwa TEXT CHECK (wielkosc_przedsiebiorstwa IN ('mikro','mały','średni','duży','inny')),
  liczba_zatrudnionych      INTEGER,          -- na dzien wniosku (D-169), wyznacza wielkosc
  osoba_kontaktowa          TEXT,
  telefon                   TEXT,
  email                     TEXT,
  osoba_kontaktowa_2        TEXT,
  telefon_2                 TEXT,
  email_2                   TEXT,

  -- Prog dofinansowania wybrany we wniosku (D-171). Regula dobiera go sama
  -- z wielkosci i daty, reczny wybor wylacza regule (D-19).
  prog_dofinansowania_id    TEXT REFERENCES progi_dofinansowania (id),
  prog_regula_aktywna       INTEGER NOT NULL DEFAULT 1,

  -- Finanse. Reczne: koszt z doplata (D-134) i doplata dodatkowa (D-63).
  koszt_calkowity_z_doplata NUMERIC(12,2),
  kwota_doplaty_dodatkowej  NUMERIC(12,2) NOT NULL DEFAULT 0,
  koszt_calkowity           NUMERIC(12,2),                          -- wyliczane: z_doplata - doplata
  koszt_regula_aktywna      INTEGER NOT NULL DEFAULT 1,
  przyznano                 NUMERIC(12,2),                          -- wyliczane, edytowalne (D-135)
  przyznano_regula_aktywna  INTEGER NOT NULL DEFAULT 1,
  wklad_wlasny              NUMERIC(12,2),                          -- reszta, nadpisywalna (D-172, D-173)
  wklad_regula_aktywna      INTEGER NOT NULL DEFAULT 1,
  doplata_na_fakturze_kfs   INTEGER NOT NULL DEFAULT 1,    -- 1 = doplata w podstawie prowizji (D-174)

  -- Prowizja: nadpisanie per wniosek jako procent ALBO kwota (D-136), tylko admin (D-93).
  prowizja_regula_aktywna   INTEGER NOT NULL DEFAULT 1,
  prowizja_typ_nadpisania   TEXT CHECK (prowizja_typ_nadpisania IN ('procent','kwota')),
  prowizja_wartosc          NUMERIC(12,2),

  -- Umowa zaznaczana recznie (D-232). Certyfikat i faktura wyliczane z tabel certyfikaty
  -- i faktury w widoku v_wniosek_dokumenty (D-290, R-09).
  umowa_wystawiona          INTEGER NOT NULL DEFAULT 0,

  status_skladania           TEXT REFERENCES statusy_wniosku (wartosc) ON UPDATE CASCADE,
  status_decyzji             TEXT REFERENCES statusy_wniosku (wartosc) ON UPDATE CASCADE,
  status_finansowy           TEXT REFERENCES statusy_wniosku (wartosc) ON UPDATE CASCADE,
  data_wplyniecia_formularza DATE,   -- rejestrowana automatycznie (D-94)
  data_wniosku               DATE,
  data_wystawienia_faktury   DATE,   -- wyznacza okres rozliczeniowy prowizji (D-13)
  data_aktualizacji          DATE,
  UNIQUE (id, instytucja_id)       -- cel zlozonych kluczy obcych tabel podrzednych (D-295)
);
CREATE INDEX idx_wnioski_klient ON wnioski (klient_id);
CREATE INDEX idx_wnioski_inst_rok ON wnioski (instytucja_id, rok);
CREATE INDEX idx_wnioski_faktura ON wnioski (data_wystawienia_faktury);
CREATE INDEX idx_wnioski_faktura_id ON wnioski (faktura_id);
CREATE INDEX idx_wnioski_przygotowal ON wnioski (przygotowal_id);

-- Opiekunowie wniosku, wybor wielokrotny, np. na czas zastepstwa. Osobno od
-- jednej osoby, ktora wniosek przygotowala (D-260).
CREATE TABLE wniosek_opiekunowie (
  id            TEXT PRIMARY KEY,
  wniosek_id    TEXT NOT NULL REFERENCES wnioski (id) ON DELETE CASCADE,
  uzytkownik_id TEXT NOT NULL REFERENCES uzytkownicy (id) ON DELETE CASCADE,
  UNIQUE (wniosek_id, uzytkownik_id)
);

-- Lista szkolen wniosku z cena domyslna dla uczestnikow (D-264, D-279). Zostaje, bo wniosek
-- moze miec szkolenie bez przypisanego jeszcze uczestnika (M-01). Szkolenie pochodzi
-- z katalogu instytucji wniosku, co pilnuje zlozony klucz obcy (D-295).
CREATE TABLE wniosek_szkolenia (
  id            TEXT PRIMARY KEY,
  wniosek_id    TEXT NOT NULL,
  instytucja_id TEXT NOT NULL,
  szkolenie_id  TEXT NOT NULL,
  cena          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cena >= 0),
  UNIQUE (wniosek_id, szkolenie_id),
  UNIQUE (id, wniosek_id, instytucja_id),
  FOREIGN KEY (wniosek_id, instytucja_id) REFERENCES wnioski (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (szkolenie_id, instytucja_id) REFERENCES katalog_szkolen (id, instytucja_id) ON UPDATE CASCADE
);

-- Uczestnik wniosku: osoba z puli klienta (D-280). Imie, PESEL i reszte danych bierze
-- z uczestnicy_klienta, bez kopii. Osoba jest we wniosku raz, szkolenia ma w tabeli
-- uczestnik_szkolenia (D-279).
CREATE TABLE uczestnicy (
  id                   TEXT PRIMARY KEY,
  wniosek_id           TEXT NOT NULL,
  instytucja_id        TEXT NOT NULL,
  uczestnik_klienta_id TEXT NOT NULL REFERENCES uczestnicy_klienta (id),
  utworzono            DATE,      -- poczatek biegu retencji danych osobowych (D-186)
  UNIQUE (wniosek_id, uczestnik_klienta_id),
  UNIQUE (id, wniosek_id, instytucja_id),
  FOREIGN KEY (wniosek_id, instytucja_id) REFERENCES wnioski (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_uczestnicy_wniosek ON uczestnicy (wniosek_id);
CREATE INDEX idx_uczestnicy_osoba ON uczestnicy (uczestnik_klienta_id);

-- Szkolenie uczestnika we wniosku (D-279): cena, termin, kwalifikacja, powod i komentarz sa
-- per szkolenie. Uczestnik i szkolenie z listy wniosku naleza do tego samego wniosku
-- i instytucji, co pilnuja zlozone klucze obce. Do sumy wartosci wchodza wylacznie
-- zakwalifikowane (D-61, D-79).
CREATE TABLE uczestnik_szkolenia (
  id                        TEXT PRIMARY KEY,
  uczestnik_id              TEXT NOT NULL,
  wniosek_szkolenie_id      TEXT NOT NULL,
  wniosek_id                TEXT NOT NULL,
  instytucja_id             TEXT NOT NULL,
  termin_id                 TEXT REFERENCES terminy (id),
  cena                      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cena >= 0),
  status_kwalifikacji       TEXT NOT NULL DEFAULT 'zakwalifikowany'
                            CHECK (status_kwalifikacji IN ('zakwalifikowany','niezakwalifikowany')),
  powod_niezakwalifikowania TEXT,
  komentarz                 TEXT,
  UNIQUE (uczestnik_id, wniosek_szkolenie_id),
  UNIQUE (id, wniosek_id, instytucja_id),
  FOREIGN KEY (uczestnik_id, wniosek_id, instytucja_id) REFERENCES uczestnicy (id, wniosek_id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (wniosek_szkolenie_id, wniosek_id, instytucja_id) REFERENCES wniosek_szkolenia (id, wniosek_id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_uczestnik_szkolenia_wniosek ON uczestnik_szkolenia (wniosek_id);
CREATE INDEX idx_uczestnik_szkolenia_termin ON uczestnik_szkolenia (termin_id);

-- --------------------------------------------------------------------------
-- 4. KONTA, ROLE I UPRAWNIENIA
-- --------------------------------------------------------------------------

-- Role kont: cztery domyslne i role wlasne; typ konta zapisany raz w roli (D-275, R-10).
CREATE TABLE role (
  id        TEXT PRIMARY KEY,
  nazwa     TEXT NOT NULL,
  opis      TEXT,
  -- Typ konta, pierwszy poziom uprawnien: pracownik (w tym administrator) albo instytucja
  -- (D-275, bez kont klienta D-252). Typ jest zapisany tylko tutaj, konto bierze go z roli (R-10).
  typ       TEXT NOT NULL CHECK (typ IN ('pracownik','instytucja')),
  systemowa INTEGER NOT NULL DEFAULT 1
);

-- Moduly aplikacji, do ktorych role dostaja features modul.view i modul.manage (D-211).
CREATE TABLE moduly (
  id        TEXT PRIMARY KEY,
  nazwa     TEXT NOT NULL,
  plik      TEXT,
  ikona     TEXT,
  grupa     TEXT,
  kolejnosc INTEGER NOT NULL DEFAULT 0
);

-- Katalog uprawnien w modelu features Open Mercato (D-176, D-211), odpowiednik
-- acl.ts: "modul.view" i "modul.manage" dla kazdego modulu (D-36) oraz
-- features pol (finanse.prowizja, klient.pesel...), ktorych framework nie ma
-- i ktore dobudowujemy (D-149). manage zalezy od view.
CREATE TABLE funkcje (
  id        TEXT PRIMARY KEY CHECK (id GLOB '?*.?*'),
  modul_id  TEXT REFERENCES moduly (id) ON DELETE CASCADE,
  rodzaj    TEXT NOT NULL CHECK (rodzaj IN ('modul','pole')),
  opis      TEXT NOT NULL,
  zalezy_od TEXT REFERENCES funkcje (id)
);

-- Nadania rolom, odpowiednik role_acls.features_json. Wartosc to feature albo
-- wildcard "modul.*" (wszystkie akcje modulu). Brak nadania = brak dostepu.
CREATE TABLE role_funkcje (
  rola_id TEXT NOT NULL REFERENCES role (id) ON DELETE CASCADE,
  funkcja TEXT NOT NULL CHECK (funkcja GLOB '?*.?*'),
  PRIMARY KEY (rola_id, funkcja)
);

-- Konta logowania: pracownicy LDIT i konta instytucji; zakres instytucji pracownika w uzytkownik_instytucja.
CREATE TABLE uzytkownicy (
  id                   TEXT PRIMARY KEY,
  login                TEXT NOT NULL UNIQUE,
  -- Haslo nigdy jawnie: skrot z sola (assets/haslo.js). Docelowo bcrypt z frameworka (D-176).
  haslo_skrot          TEXT NOT NULL,
  haslo_sol            TEXT NOT NULL,
  nieudane_proby       INTEGER NOT NULL DEFAULT 0,        -- licznik do blokady czasowej
  zablokowane_do       TIMESTAMPTZ,                              -- blokada po serii nieudanych prob
  imie_nazwisko        TEXT NOT NULL,
  rola_id              TEXT NOT NULL REFERENCES role (id),
  instytucja_id        TEXT REFERENCES instytucje (id),  -- konto IS: macierzysta instytucja
  wszystkie_instytucje INTEGER NOT NULL DEFAULT 0,       -- konto bez ograniczenia (D-113)
  ostatnie_logowanie   TIMESTAMPTZ,
  dwa_fa               INTEGER NOT NULL DEFAULT 0,
  zablokowane          INTEGER NOT NULL DEFAULT 0        -- admin LDIT blokuje konta IS (D-126)
);

-- Sesja logowania. Przegladarka trzyma wylacznie token, a rola i zakres sa
-- przy kazdym odczycie brane z bazy, wiec edycja pamieci przegladarki nie
-- podnosi uprawnien (D-179). Wzorzec tabeli sessions z Open Mercato.
CREATE TABLE sesje (
  token              TEXT PRIMARY KEY,
  uzytkownik_id      TEXT NOT NULL REFERENCES uzytkownicy (id) ON DELETE CASCADE,
  utworzono          TIMESTAMPTZ NOT NULL,
  wygasa             TIMESTAMPTZ NOT NULL,
  ostatnia_aktywnosc TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sesje_uzytkownik ON sesje (uzytkownik_id);

-- Opiekunowie instytucji: pracownicy, wybor wielokrotny (D-274, zastepuje pole opiekun_ldit)
CREATE TABLE instytucja_opiekunowie (
  id            TEXT PRIMARY KEY,
  instytucja_id TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  uzytkownik_id TEXT NOT NULL REFERENCES uzytkownicy (id) ON DELETE CASCADE,
  UNIQUE (instytucja_id, uzytkownik_id)
);

-- Przydzial pracownika do instytucji (D-113). Brak wiersza = brak dostepu.
-- Wiele do wielu: pracownik ma wiele instytucji, instytucja wielu pracownikow.
CREATE TABLE uzytkownik_instytucja (
  uzytkownik_id TEXT NOT NULL REFERENCES uzytkownicy (id) ON DELETE CASCADE,
  instytucja_id TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  PRIMARY KEY (uzytkownik_id, instytucja_id)
);

-- --------------------------------------------------------------------------
-- 5. PRACA BIEZACA, KOMUNIKACJA, AUDYT
-- --------------------------------------------------------------------------

-- Przebieg wniosku budowany z logow zmian etapu (D-145), zrodlo timeline'u.
-- Wpis reczny ma wykonawce etapu (inna osobe niz autor) i z niego powstaje zadanie (D-285).
CREATE TABLE przebieg_wniosku (
  id            TEXT PRIMARY KEY,
  wniosek_id    TEXT NOT NULL,
  instytucja_id TEXT NOT NULL,   -- instytucja wniosku, separacja (D-295)
  rodzaj        TEXT NOT NULL DEFAULT 'automatyczny' CHECK (rodzaj IN ('automatyczny','reczny')),
  czas          TIMESTAMPTZ NOT NULL,
  etap_z        INTEGER,
  etap_do       INTEGER,         -- pusty przy wpisie recznym bez zmiany etapu
  komentarz     TEXT,
  uzytkownik_id TEXT REFERENCES uzytkownicy (id),                       -- autor wpisu
  wykonawca_id  TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,    -- kto wykonuje etap
  zadanie_id    TEXT REFERENCES zadania (id) ON DELETE SET NULL,        -- zadanie utworzone z wpisu
  pozycja       INTEGER,  -- reczna kolejnosc na osi czasu, NULL = wg czasu (D-263)
  FOREIGN KEY (wniosek_id, instytucja_id) REFERENCES wnioski (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (rodzaj = 'reczny' OR etap_do IS NOT NULL)
);
CREATE INDEX idx_przebieg_wniosek ON przebieg_wniosku (wniosek_id, czas);

-- Modul zadan i powiadomien wrocil do zakresu (D-140, odwraca D-118).
CREATE TABLE zadania (
  id             TEXT PRIMARY KEY,
  tytul          TEXT NOT NULL,
  typ            TEXT NOT NULL CHECK (typ IN ('reczne','automatyczne')),
  wniosek_id     TEXT REFERENCES wnioski (id) ON DELETE CASCADE,
  przypisane_do  TEXT REFERENCES uzytkownicy (id),
  termin         DATE,
  status         TEXT NOT NULL DEFAULT 'otwarte' CHECK (status IN ('otwarte','zrobione','anulowane')),
  zrodlo_statusu TEXT,  -- status wniosku, ktory wygenerowal zadanie automatyczne
  -- Notatka z terminem z karty wniosku (D-239): zadanie pokazuje sie na liscie
  -- dopiero przypomnij_dni dni przed terminem. NULL = widoczne od razu.
  opis           TEXT,
  przypomnij_dni INTEGER CHECK (przypomnij_dni IS NULL OR przypomnij_dni >= 0),
  utworzono      TIMESTAMPTZ,
  utworzyl_id    TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  pozycja        INTEGER   -- reczna kolejnosc na osi czasu wniosku, NULL = wg terminu (D-263)
);
CREATE INDEX idx_zadania_termin ON zadania (status, termin);

-- Notatki klienta i notatki wniosku osobno (D-284). instytucja_id to instytucja klienta albo
-- wniosku, pilnowana zlozonym kluczem obcym: kolumna do separacji danych (D-295), nie wybor.
CREATE TABLE notatki_klienta (
  id            TEXT PRIMARY KEY,
  klient_id     TEXT NOT NULL,
  instytucja_id TEXT NOT NULL,
  czas          TIMESTAMPTZ NOT NULL,
  autor_id      TEXT REFERENCES uzytkownicy (id),
  tresc         TEXT NOT NULL,
  FOREIGN KEY (klient_id, instytucja_id) REFERENCES klienci (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_notatki_klienta ON notatki_klienta (klient_id);

-- Notatki do wniosku z autorem i czasem, z instytucja wniosku (D-284).
CREATE TABLE notatki_wniosku (
  id            TEXT PRIMARY KEY,
  wniosek_id    TEXT NOT NULL,
  instytucja_id TEXT NOT NULL,
  czas          TIMESTAMPTZ NOT NULL,
  autor_id      TEXT REFERENCES uzytkownicy (id),
  tresc         TEXT NOT NULL,
  FOREIGN KEY (wniosek_id, instytucja_id) REFERENCES wnioski (id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_notatki_wniosku ON notatki_wniosku (wniosek_id);

-- Korespondencja wspolna dla wszystkich wnioskow klienta (D-53, warsztat 1:46:06)
CREATE TABLE korespondencja (
  id            TEXT PRIMARY KEY,
  klient_id     TEXT REFERENCES klienci (id) ON DELETE CASCADE,
  instytucja_id TEXT REFERENCES instytucje (id) ON DELETE CASCADE,
  data          TIMESTAMPTZ NOT NULL,
  kierunek      TEXT,
  od_kogo       TEXT,
  temat         TEXT,
  skrzynka      TEXT,
  zalaczniki    INTEGER NOT NULL DEFAULT 0,
  -- Synchronizacja Microsoft 365 (D-286): adres, po ktorym dopasowano klienta, i id wiadomosci.
  -- Adres pasujacy do klientow w kilku instytucjach: mail czeka na reczne przypisanie.
  adres_email   TEXT,
  id_m365       TEXT UNIQUE,
  przypisanie   TEXT NOT NULL DEFAULT 'przypisany' CHECK (przypisanie IN ('przypisany','niejednoznaczny'))
);

-- Formularze zgloszeniowe czekajace na akceptacje. Bramka anty-spam (D-105),
-- zrodlo licznika "wnioski oczekujace na akceptacje" (D-140). Po akceptacji
-- rekord staje sie klientem (klient_id). Formularz wypelnia klient, handlowiec
-- albo sama instytucja (D-181, D-223); rozpatruje pracownik LDIT albo administrator.
CREATE TABLE formularze_oczekujace (
  id            TEXT PRIMARY KEY,
  data          TIMESTAMPTZ NOT NULL,
  firma         TEXT NOT NULL,
  nip           TEXT,
  instytucja_id TEXT REFERENCES instytucje (id) ON DELETE CASCADE,
  osob          INTEGER NOT NULL DEFAULT 0,
  szkolenie     TEXT,
  kontakt       TEXT,
  wypelnil      TEXT NOT NULL DEFAULT 'instytucja'
                CHECK (wypelnil IN ('pracownik','handlowiec','instytucja')),  -- D-223, D-275, klient nie wypelnia (D-244)
  zrodlo        TEXT NOT NULL DEFAULT 'reczny' CHECK (zrodlo IN ('reczny','csv','xlsx','pdf')),  -- D-244, D-287; plik w tabeli pliki
  handlowiec_id TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,  -- D-210
  status        TEXT NOT NULL DEFAULT 'oczekuje'
                CHECK (status IN ('oczekuje','zaakceptowany','odrzucony')),
  -- Szczegoly do panelu akceptacji (D-223)
  miasto        TEXT,
  pup_id        TEXT REFERENCES urzedy_pracy (id),
  wielkosc      TEXT CHECK (wielkosc IN ('mikro','mały','średni','duży','inny')),
  email         TEXT,
  telefon       TEXT,
  uwagi         TEXT,
  -- Dane z formularza klienta (D-245). Formularz z brakami jest przyjmowany,
  -- a wysylajacy dostaje komunikat o brakach.
  adres_siedziby       TEXT,
  liczba_zatrudnionych INTEGER,
  numer_konta          TEXT,
  -- Pelny formularz klienta (D-256, D-257), te same kolumny co w tabeli klienci
  telefon_biura             TEXT,
  email_firmy               TEXT,
  stanowisko_kontaktowej    TEXT,
  nazwa_banku               TEXT,
  etaty                     NUMERIC(6,2) CHECK (etaty IS NULL OR etaty >= 0),
  liczba_innych_umow        INTEGER CHECK (liczba_innych_umow IS NULL OR liczba_innych_umow >= 0),
  forma_opodatkowania       TEXT,
  stawka_podatku            NUMERIC(5,2) CHECK (stawka_podatku IS NULL OR stawka_podatku BETWEEN 0 AND 100),
  reprezentant_1            TEXT,
  reprezentant_1_stanowisko TEXT,
  reprezentant_2            TEXT,
  reprezentant_2_stanowisko TEXT,
  zadluzenie                TEXT CHECK (zadluzenie IN ('brak','zus','us','zus_us','inne')),
  zadluzenie_ugoda          INTEGER CHECK (zadluzenie_ugoda IN (0,1)),
  konto_praca_gov           INTEGER CHECK (konto_praca_gov IN (0,1)),
  uczestnicy_json      TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(uczestnicy_json) AND json_type(uczestnicy_json) = 'array'),
  zglosil_id    TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  rozpatrzyl_id TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  rozpatrzono   TIMESTAMPTZ,
  powod_odrzucenia TEXT,
  klient_id     TEXT REFERENCES klienci (id) ON DELETE SET NULL,     -- klient utworzony albo dopasowany po akceptacji
  UNIQUE (id, instytucja_id)       -- cel zlozonych kluczy obcych (D-295)
);
CREATE INDEX idx_formularze_inst ON formularze_oczekujace (instytucja_id, status);

-- Zmiany danych zgloszone przez instytucje: dane o sobie i o swoich klientach.
-- Nic nie zmienia sie od razu, zmiane zatwierdza pracownik LDIT albo administrator (D-224).
-- zmiany: JSON {kolumna: {"przed": ..., "po": ...}}.
CREATE TABLE propozycje_zmian (
  id               TEXT PRIMARY KEY,
  instytucja_id    TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  tabela           TEXT NOT NULL CHECK (tabela IN ('instytucje','klienci')),
  rekord_id        TEXT NOT NULL,
  zmiany           TEXT NOT NULL,
  uzasadnienie     TEXT,
  zglosil_id       TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  zgloszono        TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'oczekuje'
                   CHECK (status IN ('oczekuje','zatwierdzona','odrzucona')),
  rozpatrzyl_id    TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  rozpatrzono      TIMESTAMPTZ,
  powod_odrzucenia TEXT
);
CREATE INDEX idx_propozycje_inst ON propozycje_zmian (instytucja_id, status);

-- Szablony maili w HTML z tematem, zeby wysylka szla w poprawnym formacie (D-289)
CREATE TABLE szablony_maili (
  id         TEXT PRIMARY KEY,
  nazwa      TEXT NOT NULL,
  odbiorca   TEXT,
  autor      TEXT,
  uzyc       INTEGER NOT NULL DEFAULT 0,
  temat      TEXT,
  tresc_html TEXT
);

-- Wewnetrzna baza incydentow, wylacznie admin i pracownicy LDIT (D-107)
CREATE TABLE zgloszenia (
  id          TEXT PRIMARY KEY,
  data        DATE NOT NULL,
  podmiot_typ TEXT,
  podmiot     TEXT NOT NULL,
  typ         TEXT,
  powod       TEXT,
  opis        TEXT,
  autor       TEXT,
  waga        TEXT,
  klient_id   TEXT REFERENCES klienci (id) ON DELETE SET NULL   -- incydent klienta (D-249)
);
CREATE INDEX idx_zgloszenia_klient ON zgloszenia (klient_id);

-- Certyfikaty wystawione dla szkolen uczestnikow (D-290). Wystawia pracownik albo
-- administrator; plik PDF trafia do paczki. Z tej tabeli wynika znacznik Certyfikat wniosku.
CREATE TABLE certyfikaty (
  id                     TEXT PRIMARY KEY,
  uczestnik_szkolenie_id TEXT NOT NULL UNIQUE,
  wniosek_id             TEXT NOT NULL,
  instytucja_id          TEXT NOT NULL,
  numer                  TEXT NOT NULL,
  wystawiono             DATE NOT NULL,
  wystawil_id            TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  UNIQUE (instytucja_id, numer),  -- numeracja ciagla, osobna dla instytucji (D-200)
  UNIQUE (id, instytucja_id),     -- cel zlozonego klucza obcego plikow (D-295)
  FOREIGN KEY (uczestnik_szkolenie_id, wniosek_id, instytucja_id) REFERENCES uczestnik_szkolenia (id, wniosek_id, instytucja_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_certyfikaty_wniosek ON certyfikaty (wniosek_id);

-- Powiadomienia dla pracownikow i administratora na panelu i dashboardzie (D-297):
-- urzad ze zrodla spoza slownika (D-272), mail pasujacy do klientow w kilku instytucjach (D-286).
CREATE TABLE powiadomienia (
  id           TEXT PRIMARY KEY,
  rodzaj       TEXT NOT NULL CHECK (rodzaj IN ('nieznany_urzad','mail_niejednoznaczny')),
  tresc        TEXT NOT NULL,
  tabela       TEXT,          -- tabela rekordu, ktorego dotyczy
  rekord_id    TEXT,
  utworzono    TIMESTAMPTZ NOT NULL,
  rozwiazano   TIMESTAMPTZ,
  rozwiazal_id TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL
);

-- Rejestr zmian: kto, co i kiedy zmienil (D-32)
CREATE TABLE rejestr_aktywnosci (
  id     TEXT PRIMARY KEY,
  czas   TIMESTAMPTZ NOT NULL,
  kto    TEXT NOT NULL,
  typ    TEXT,
  obiekt TEXT,
  pole   TEXT,
  przed  TEXT,
  po     TEXT,
  partia TEXT,  -- wspolny identyfikator zmiany zbiorczej, pozwala ja cofnac (D-234)
  -- Historia rekordu (D-291): w aplikacji docelowej action_logs Open Mercato (R-13)
  tabela    TEXT,
  rekord_id TEXT
);
CREATE INDEX idx_aktywnosc_rekord ON rejestr_aktywnosci (tabela, rekord_id, czas);
CREATE INDEX idx_aktywnosc_czas ON rejestr_aktywnosci (czas);

-- Proby logowania (udane i nieudane) do audytu bezpieczenstwa.
CREATE TABLE logowania (
  id         TEXT PRIMARY KEY,
  czas       TIMESTAMPTZ NOT NULL,
  kto        TEXT NOT NULL,
  ip         TEXT,
  wynik      TEXT,
  urzadzenie TEXT
);

-- Warunki prowizji pracownikow za obrot na wnioskach (D-292, zastepuje tabele cele).
-- Osiagniety obrot liczy widok v_prowizje_pracownikow.
CREATE TABLE warunki_prowizji_pracownikow (
  id               TEXT PRIMARY KEY,
  uzytkownik_id    TEXT NOT NULL REFERENCES uzytkownicy (id) ON DELETE CASCADE,
  procent_prowizji NUMERIC(5,2) NOT NULL CHECK (procent_prowizji BETWEEN 0 AND 100),
  minimum_obrotu   NUMERIC(12,2) CHECK (minimum_obrotu IS NULL OR minimum_obrotu >= 0),  -- warunek: od jakiego obrotu
  obowiazuje_od    DATE NOT NULL,
  obowiazuje_do    DATE
);
CREATE INDEX idx_warunki_pracownika ON warunki_prowizji_pracownikow (uzytkownik_id, obowiazuje_od);

-- Zamkniete okresy prowizji (D-276, R-03): prowizje liczy silnik z warunkow i wnioskow na biezaco,
-- a po zamknieciu okresu jego wynik jest zamrozony tutaj i juz sie nie przelicza. Korekta
-- starego wniosku trafia do biezacego okresu (D-162).
CREATE TABLE prowizje_zamkniete (
  id            TEXT PRIMARY KEY,
  instytucja_id TEXT NOT NULL REFERENCES instytucje (id) ON DELETE CASCADE,
  okres         TEXT NOT NULL CHECK (okres GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),  -- RRRR-MM
  liczba_wnioskow INTEGER NOT NULL DEFAULT 0,
  podstawa      NUMERIC(12,2) NOT NULL DEFAULT 0,
  prowizja      NUMERIC(12,2) NOT NULL DEFAULT 0,
  zamknieto     TIMESTAMPTZ NOT NULL,
  zamknal_id    TEXT REFERENCES uzytkownicy (id) ON DELETE SET NULL,
  UNIQUE (instytucja_id, okres)
);

-- Podsumowania liczbowe lat, ktorych wnioskow nie przenosimy (D-129, D-160).
-- Zrodlo porownan rok do roku na dashboardzie (D-175). instytucja_id NULL = calosc.
CREATE TABLE podsumowania_historyczne (
  id            TEXT PRIMARY KEY,
  rok           TEXT NOT NULL,
  instytucja_id TEXT REFERENCES instytucje (id) ON DELETE CASCADE,
  miara         TEXT NOT NULL CHECK (miara IN ('wnioski_zlozone','wnioski_pozytywne','kwota_przyznana','obrot','prowizja')),
  wartosc       NUMERIC(14,2) NOT NULL,
  zrodlo        TEXT,
  UNIQUE (rok, instytucja_id, miara)
);

-- Ustawienia techniczne makiety, np. wersja bazy w przegladarce.
CREATE TABLE meta (
  klucz   TEXT PRIMARY KEY,
  wartosc TEXT
);

-- --------------------------------------------------------------------------
-- INDEKSY NA KLUCZACH OBCYCH (R-14)
-- Kazda kolumna klucza obcego ma indeks (wlasny albo jako pierwsza kolumna innego
-- indeksu lub klucza). Bez niego usuwanie rodzica i filtry po relacji skanuja tabele.
-- tools/test-praca-biezaca.mjs pilnuje, zeby nowy klucz obcy nie zostal bez indeksu.
-- --------------------------------------------------------------------------
CREATE INDEX idx_akcje_statusow_status_rozliczenia ON akcje_statusow (status_rozliczenia);
CREATE INDEX idx_akcje_statusow_status_decyzji ON akcje_statusow (status_decyzji);
CREATE INDEX idx_akcje_statusow_status_skladania ON akcje_statusow (status_skladania);
CREATE INDEX idx_ceny_szkolen_dodal_id ON ceny_szkolen (dodal_id);
CREATE INDEX idx_certyfikaty_wystawil_id ON certyfikaty (wystawil_id);
CREATE INDEX idx_faktury_faktura_pierwotna_id ON faktury (faktura_pierwotna_id);
CREATE INDEX idx_formularze_oczekujace_klient_id ON formularze_oczekujace (klient_id);
CREATE INDEX idx_formularze_oczekujace_rozpatrzyl_id ON formularze_oczekujace (rozpatrzyl_id);
CREATE INDEX idx_formularze_oczekujace_zglosil_id ON formularze_oczekujace (zglosil_id);
CREATE INDEX idx_formularze_oczekujace_pup_id ON formularze_oczekujace (pup_id);
CREATE INDEX idx_formularze_oczekujace_handlowiec_id ON formularze_oczekujace (handlowiec_id);
CREATE INDEX idx_funkcje_zalezy_od ON funkcje (zalezy_od);
CREATE INDEX idx_funkcje_modul_id ON funkcje (modul_id);
CREATE INDEX idx_instytucja_opiekunowie_uzytkownik_id ON instytucja_opiekunowie (uzytkownik_id);
CREATE INDEX idx_klienci_pup_id ON klienci (pup_id);
CREATE INDEX idx_korespondencja_instytucja_id ON korespondencja (instytucja_id);
CREATE INDEX idx_korespondencja_klient_id ON korespondencja (klient_id);
CREATE INDEX idx_notatki_klienta_autor_id ON notatki_klienta (autor_id);
CREATE INDEX idx_notatki_wniosku_autor_id ON notatki_wniosku (autor_id);
CREATE INDEX idx_pliki_dodal_id ON pliki (dodal_id);
CREATE INDEX idx_pliki_instytucja_id ON pliki (instytucja_id);
CREATE INDEX idx_podsumowania_historyczne_instytucja_id ON podsumowania_historyczne (instytucja_id);
CREATE INDEX idx_powiadomienia_rozwiazal_id ON powiadomienia (rozwiazal_id);
CREATE INDEX idx_propozycje_zmian_rozpatrzyl_id ON propozycje_zmian (rozpatrzyl_id);
CREATE INDEX idx_propozycje_zmian_zglosil_id ON propozycje_zmian (zglosil_id);
CREATE INDEX idx_prowizje_zamkniete_zamknal_id ON prowizje_zamkniete (zamknal_id);
CREATE INDEX idx_przebieg_wniosku_zadanie_id ON przebieg_wniosku (zadanie_id);
CREATE INDEX idx_przebieg_wniosku_wykonawca_id ON przebieg_wniosku (wykonawca_id);
CREATE INDEX idx_przebieg_wniosku_uzytkownik_id ON przebieg_wniosku (uzytkownik_id);
CREATE INDEX idx_terminy_szkolenie_id ON terminy (szkolenie_id);
CREATE INDEX idx_uczestnik_szkolenia_wniosek_szkolenie_id ON uczestnik_szkolenia (wniosek_szkolenie_id);
CREATE INDEX idx_uzytkownicy_instytucja_id ON uzytkownicy (instytucja_id);
CREATE INDEX idx_uzytkownicy_rola_id ON uzytkownicy (rola_id);
CREATE INDEX idx_uzytkownik_instytucja_instytucja_id ON uzytkownik_instytucja (instytucja_id);
CREATE INDEX idx_wniosek_opiekunowie_uzytkownik_id ON wniosek_opiekunowie (uzytkownik_id);
CREATE INDEX idx_wniosek_szkolenia_szkolenie_id ON wniosek_szkolenia (szkolenie_id);
CREATE INDEX idx_wnioski_status_finansowy ON wnioski (status_finansowy);
CREATE INDEX idx_wnioski_status_decyzji ON wnioski (status_decyzji);
CREATE INDEX idx_wnioski_status_skladania ON wnioski (status_skladania);
CREATE INDEX idx_wnioski_prog_dofinansowania_id ON wnioski (prog_dofinansowania_id);
CREATE INDEX idx_wnioski_formularz_id ON wnioski (formularz_id);
CREATE INDEX idx_wnioski_handlowiec_id ON wnioski (handlowiec_id);
CREATE INDEX idx_wnioski_szkolenie_glowne_id ON wnioski (szkolenie_glowne_id);
CREATE INDEX idx_wnioski_nabor_id ON wnioski (nabor_id);
CREATE INDEX idx_wnioski_pup_id ON wnioski (pup_id);
CREATE INDEX idx_wnioski_rok ON wnioski (rok);
CREATE INDEX idx_zadania_utworzyl_id ON zadania (utworzyl_id);
CREATE INDEX idx_zadania_przypisane_do ON zadania (przypisane_do);
CREATE INDEX idx_zadania_wniosek_id ON zadania (wniosek_id);
