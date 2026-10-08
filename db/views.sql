-- ============================================================================
-- Widoki: reguly biznesowe zapisane w SQL.
-- Wszystko, co w dokumentacji jest "polem wyliczanym", jest tutaj wyrazone
-- jako zapytanie. Dzieki temu regula ma jedno miejsce, a nie kopie w kazdym
-- ekranie makiety. Przy przepisaniu na Postgresa te widoki przenosza sie
-- bez zmian i staja sie warstwa domenowa aplikacji.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Warunki prowizyjne obowiazujace dzisiaj (D-22, D-162). Wersja zaplanowana
-- na przyszlosc nie jest jeszcze aktywna, a zamknieta juz nie jest.
-- --------------------------------------------------------------------------
CREATE VIEW v_warunki_aktywne AS
SELECT w.*
FROM warunki_prowizyjne w
WHERE w.obowiazuje_od <= date('now')
  AND (w.obowiazuje_do IS NULL OR w.obowiazuje_do = '' OR w.obowiazuje_do >= date('now'));

-- --------------------------------------------------------------------------
-- Finanse wniosku. Realizuje D-131, D-132, D-134, D-135, D-19, D-79, D-171 - D-174.
--
-- Kolejnosc wyliczen:
--   1. wielkosc przedsiebiorstwa: nadpisanie per wniosek, inaczej z klienta (D-132)
--   2. prog dofinansowania: wybrany recznie we wniosku albo dobrany regula
--      z wielkosci i daty wniosku (D-131, D-171)
--   3. koszt calkowity: koszt z doplata minus doplata dodatkowa (D-134)
--   4. przyznano: koszt calkowity razy procent progu, tylko decyzja pozytywna (D-135)
--   5. wklad wlasny: reszta, koszt minus przyznano, wiec rownanie zawsze sie
--      spina (D-172, D-173, D-184)
--   6. podstawa prowizji: koszt z doplata, gdy doplata jest na fakturze KFS,
--      inaczej koszt calkowity bez doplaty (D-64, D-174)
--
-- Kazde pole wyliczane wystepuje w dwoch wariantach:
--   *_wyliczony/e - wartosc z reguly, liczona zawsze, nawet gdy regula wylaczona
--   *_efektywny/e - wartosc pokazywana uzytkownikowi (regula albo reczne nadpisanie)
-- To jest techniczna realizacja zasady "Przywroc regule" (D-19).
-- --------------------------------------------------------------------------
CREATE VIEW v_wniosek_finanse AS
WITH baza AS (
  SELECT
    w.*,
    COALESCE(w.wielkosc_przedsiebiorstwa, k.wielkosc_przedsiebiorstwa) AS wielkosc_ef,
    (SELECT p.id FROM progi_dofinansowania p
      WHERE p.wielkosc = COALESCE(w.wielkosc_przedsiebiorstwa, k.wielkosc_przedsiebiorstwa)
        AND p.obowiazuje_od <= COALESCE(w.data_wniosku, w.data_wplyniecia_formularza, '9999-12-31')
        AND (p.obowiazuje_do IS NULL OR p.obowiazuje_do >= COALESCE(w.data_wniosku, '0001-01-01'))
      ORDER BY p.obowiazuje_od DESC LIMIT 1) AS prog_wyliczony_id,
    ROUND(COALESCE(w.koszt_calkowity_z_doplata, 0) - COALESCE(w.kwota_doplaty_dodatkowej, 0), 2)
      AS koszt_wyliczony
  FROM wnioski w
  JOIN klienci k ON k.id = w.klient_id
),
progi AS (
  SELECT b.*,
    CASE WHEN b.prog_regula_aktywna = 1 THEN b.prog_wyliczony_id ELSE b.prog_dofinansowania_id END
      AS prog_efektywny_id,
    CASE WHEN b.koszt_regula_aktywna = 1 THEN b.koszt_wyliczony ELSE b.koszt_calkowity END
      AS koszt_efektywny
  FROM baza b
),
przyznane AS (
  SELECT g.*,
    COALESCE(pd.procent_dofinansowania, 70) AS procent,
    CASE WHEN g.status_decyzji = 'Pozytywna' AND g.koszt_efektywny IS NOT NULL
         THEN ROUND(g.koszt_efektywny * COALESCE(pd.procent_dofinansowania, 70) / 100, 2)
    END AS przyznano_wyliczone
  FROM progi g
  LEFT JOIN progi_dofinansowania pd ON pd.id = g.prog_efektywny_id
),
koncowe AS (
  SELECT z.*,
    CASE WHEN z.przyznano_regula_aktywna = 1 THEN z.przyznano_wyliczone ELSE z.przyznano END
      AS przyznano_efektywne
  FROM przyznane z
)
SELECT
  c.id AS wniosek_id,
  c.klient_id,
  c.instytucja_id,
  c.rok,
  c.usuniety,
  c.status_decyzji,
  c.wielkosc_ef AS wielkosc,
  c.prog_wyliczony_id,
  c.prog_efektywny_id,
  c.prog_regula_aktywna,
  c.procent AS procent_dofinansowania,

  c.koszt_calkowity_z_doplata,
  c.kwota_doplaty_dodatkowej,
  c.koszt_wyliczony AS koszt_calkowity_wyliczony,
  c.koszt_efektywny AS koszt_calkowity_efektywny,

  c.przyznano_wyliczone,
  c.przyznano_efektywne,

  -- Wklad wlasny jako reszta: jeden skladnik rownania nie jest osobno zaokraglany (D-184)
  CASE WHEN c.przyznano_efektywne IS NOT NULL
       THEN ROUND(c.koszt_efektywny - c.przyznano_efektywne, 2) END AS wklad_wlasny_wyliczony,
  CASE WHEN c.wklad_regula_aktywna = 1
       THEN CASE WHEN c.przyznano_efektywne IS NOT NULL
                 THEN ROUND(c.koszt_efektywny - c.przyznano_efektywne, 2) END
       ELSE c.wklad_wlasny
  END AS wklad_wlasny_efektywny,
  c.wklad_regula_aktywna,

  -- Suma warunkowa: tylko zakwalifikowane szkolenia uczestnikow (D-61, D-79, D-279)
  COALESCE((
    SELECT SUM(s.cena) FROM uczestnik_szkolenia s
    WHERE s.wniosek_id = c.id AND s.status_kwalifikacji = 'zakwalifikowany'
  ), 0) AS calkowita_wartosc_szkolenia,

  -- Kwota wnioskowana (Wartosc, D-259) z regula: suma zakwalifikowanych szkolen (D-281)
  CASE WHEN c.kwota_regula_aktywna = 1
       THEN COALESCE((SELECT SUM(s.cena) FROM uczestnik_szkolenia s
                      WHERE s.wniosek_id = c.id AND s.status_kwalifikacji = 'zakwalifikowany'), 0)
       ELSE c.kwota_wnioskowana
  END AS kwota_wnioskowana_efektywna,
  c.kwota_regula_aktywna,

  -- Osoby, nie wiersze szkolen: uczestnik z dwoma szkoleniami liczy sie raz
  (SELECT COUNT(*) FROM uczestnicy u WHERE u.wniosek_id = c.id) AS uczestnikow,
  (SELECT COUNT(DISTINCT s.uczestnik_id) FROM uczestnik_szkolenia s WHERE s.wniosek_id = c.id
     AND s.status_kwalifikacji = 'zakwalifikowany') AS uczestnikow_zakwalifikowanych,

  c.koszt_regula_aktywna,
  c.przyznano_regula_aktywna,
  c.przyznano AS przyznano_zapisane,
  c.prowizja_regula_aktywna,
  c.prowizja_typ_nadpisania,
  c.prowizja_wartosc,

  -- Podstawa prowizji LDIT (D-64) ze znacznikiem dopłaty (D-174)
  c.doplata_na_fakturze_kfs,
  CASE WHEN c.doplata_na_fakturze_kfs = 1 THEN c.koszt_calkowity_z_doplata
       ELSE c.koszt_efektywny END AS podstawa_prowizji,
  c.data_wystawienia_faktury
FROM koncowe c;

-- --------------------------------------------------------------------------
-- Dokumenty wniosku (D-290, R-09): certyfikat i faktura wynikaja z tabel, nie z flag.
-- Certyfikat: kazde zakwalifikowane szkolenie uczestnika ma certyfikat (i jest choc jedno).
-- Faktura: wniosek wskazuje fakture albo ma date jej wystawienia z importu.
-- --------------------------------------------------------------------------
CREATE VIEW v_wniosek_dokumenty AS
SELECT w.id AS wniosek_id,
  w.umowa_wystawiona AS umowa,
  CASE WHEN w.faktura_id IS NOT NULL OR w.data_wystawienia_faktury IS NOT NULL THEN 1 ELSE 0 END AS faktura,
  (SELECT COUNT(*) FROM certyfikaty c WHERE c.wniosek_id = w.id) AS certyfikatow,
  (SELECT COUNT(*) FROM uczestnik_szkolenia s WHERE s.wniosek_id = w.id AND s.status_kwalifikacji = 'zakwalifikowany') AS do_certyfikatu,
  CASE WHEN EXISTS (SELECT 1 FROM uczestnik_szkolenia s WHERE s.wniosek_id = w.id AND s.status_kwalifikacji = 'zakwalifikowany')
        AND NOT EXISTS (SELECT 1 FROM uczestnik_szkolenia s WHERE s.wniosek_id = w.id AND s.status_kwalifikacji = 'zakwalifikowany'
                        AND NOT EXISTS (SELECT 1 FROM certyfikaty c WHERE c.uczestnik_szkolenie_id = s.id))
       THEN 1 ELSE 0 END AS certyfikat
FROM wnioski w;

-- --------------------------------------------------------------------------
-- Faktura ze szczegolami z wnioskow (D-170). Szkolenie, klient i liczba
-- projektow nie sa przepisywane do faktury, tylko czytane z wnioskow, ktore
-- ta faktura rozlicza. Okres rozliczeniowy to miesiac daty wystawienia, takze
-- dla korekty (D-161).
-- --------------------------------------------------------------------------
CREATE VIEW v_faktura_szczegoly AS
SELECT
  f.id AS faktura_id,
  f.numer,
  f.instytucja_id,
  f.rodzaj,
  f.faktura_pierwotna_id,
  f.kwota,
  f.data_wystawienia,
  substr(f.data_wystawienia, 1, 7) AS okres_rozliczeniowy,
  COALESCE(f.klient_id, (SELECT w.klient_id FROM wnioski w WHERE w.faktura_id = f.id LIMIT 1)) AS klient_id,
  (SELECT COUNT(*) FROM wnioski w WHERE w.faktura_id = f.id) AS liczba_wnioskow,
  (SELECT GROUP_CONCAT(DISTINCT s.nazwa) FROM wnioski w
     JOIN katalog_szkolen s ON s.id = w.szkolenie_glowne_id
    WHERE w.faktura_id = f.id) AS szkolenia
FROM faktury f;

-- --------------------------------------------------------------------------
-- Podsumowanie roku pod dashboard (D-175). Lata przeniesione licza sie z
-- wnioskow, lata nieprzeniesione biora liczby z podsumowan historycznych.
-- --------------------------------------------------------------------------
CREATE VIEW v_podsumowanie_roku AS
SELECT w.rok, w.instytucja_id, 'wnioski_zlozone' AS miara, COUNT(*) AS wartosc, 'wnioski' AS zrodlo
FROM wnioski w WHERE w.rok IS NOT NULL AND w.usuniety = 0 AND w.status_skladania = 'Złożony'
GROUP BY w.rok, w.instytucja_id
UNION ALL
SELECT w.rok, w.instytucja_id, 'wnioski_pozytywne', COUNT(*), 'wnioski'
FROM wnioski w WHERE w.rok IS NOT NULL AND w.usuniety = 0 AND w.status_decyzji = 'Pozytywna'
GROUP BY w.rok, w.instytucja_id
UNION ALL
-- Obrot jak w podsumowaniach 2025: koszt calkowity wnioskow pozytywnych
SELECT f.rok, f.instytucja_id, 'obrot', ROUND(SUM(f.koszt_calkowity_efektywny), 2), 'wnioski'
FROM v_wniosek_finanse f WHERE f.rok IS NOT NULL AND f.usuniety = 0 AND f.status_decyzji = 'Pozytywna'
GROUP BY f.rok, f.instytucja_id
UNION ALL
SELECT h.rok, h.instytucja_id, h.miara, h.wartosc, 'podsumowanie historyczne'
FROM podsumowania_historyczne h
WHERE NOT EXISTS (SELECT 1 FROM wnioski w WHERE w.rok = h.rok);

-- --------------------------------------------------------------------------
-- Nabory z liczba dni naboru wyliczana z dat (D-271). Pierwszy i ostatni dzien
-- wliczone; prognoza bez daty konca nie ma liczby dni.
-- --------------------------------------------------------------------------
CREATE VIEW v_nabory AS
SELECT n.*,
  CASE WHEN n.data_od IS NOT NULL AND n.data_do IS NOT NULL
       THEN CAST(julianday(n.data_do) - julianday(n.data_od) AS INTEGER) + 1 END AS liczba_dni,
  u.nazwa AS urzad, u.wojewodztwo, u.powiat
FROM nabory n JOIN urzedy_pracy u ON u.id = n.pup_id;

-- --------------------------------------------------------------------------
-- Urzad z najblizszym naborem ogloszonym i prognozowanym w jednym wierszu (D-272).
-- Urzad wystepuje raz, wiec slownik urzedow sie nie dubluje, a kolumny naboru
-- liczy widok zamiast tabeli odswiezanej co godzine (R-06).
-- Nabor ogloszony: trwajacy, potem oczekujacy (najwczesniejszy start), na koncu
-- ostatnio zakonczony. Prognoza: najwczesniejsza data rozpoczecia.
-- --------------------------------------------------------------------------
CREATE VIEW v_urzedy_nabory AS
WITH ogl AS (
  SELECT v.*, ROW_NUMBER() OVER (PARTITION BY v.pup_id ORDER BY
    CASE v.status WHEN 'trwa' THEN 0 WHEN 'oczekuje' THEN 1 ELSE 2 END,
    CASE WHEN v.status = 'zakończony' THEN NULL ELSE v.data_od END,
    v.data_do DESC) AS nr
  FROM v_nabory v WHERE v.rodzaj = 'ogloszony'
), prog AS (
  SELECT v.*, ROW_NUMBER() OVER (PARTITION BY v.pup_id ORDER BY v.data_od) AS nr
  FROM v_nabory v WHERE v.rodzaj = 'prognozowany'
)
SELECT u.id, u.nazwa, u.wojewodztwo, u.powiat, u.aliasy,
  o.id AS ogloszony_id, o.status AS ogloszony_status, o.data_od AS ogloszony_data_od, o.data_do AS ogloszony_data_do,
  o.liczba_dni AS ogloszony_liczba_dni, o.srodki AS ogloszony_srodki, o.link AS ogloszony_link,
  o.podsumowanie AS ogloszony_podsumowanie,
  p.id AS prognozowany_id, p.data_od AS prognozowany_data_od, p.data_do AS prognozowany_data_do,
  p.prognoza_opis AS prognozowany_opis
FROM urzedy_pracy u
LEFT JOIN ogl o ON o.pup_id = u.id AND o.nr = 1
LEFT JOIN prog p ON p.pup_id = u.id AND p.nr = 1;

-- --------------------------------------------------------------------------
-- Priorytet w Bazie klientow wyznacza ostatni dzien naboru, rosnaco (D-130).
-- Klient bez naboru laduje na koncu listy. Nabor urzedu z v_urzedy_nabory.
-- --------------------------------------------------------------------------
CREATE VIEW v_klient_priorytet AS
SELECT
  k.id AS klient_id,
  k.nazwa,
  k.numer_klienta,
  k.instytucja_id,
  k.zainteresowany_naborem,
  n.ogloszony_data_do AS koniec_naboru,
  COALESCE(n.ogloszony_status, CASE WHEN n.prognozowany_id IS NOT NULL THEN 'prognozowany' END) AS status_naboru,
  (SELECT COUNT(*) FROM wnioski w WHERE w.klient_id = k.id AND w.usuniety = 0) AS liczba_wnioskow
FROM klienci k
LEFT JOIN v_urzedy_nabory n ON n.id = k.pup_id;

-- --------------------------------------------------------------------------
-- Zakres widzialnosci instytucji per uzytkownik. Jedno miejsce, ktore
-- odpowiada na pytanie "czyje dane moze zobaczyc ten uzytkownik" (D-113, D-35).
-- Konto z wszystkie_instytucje = 1 widzi wszystko, pozostale tylko przypisane.
-- --------------------------------------------------------------------------
CREATE VIEW v_zakres_uzytkownika AS
SELECT u.id AS uzytkownik_id, i.id AS instytucja_id
FROM uzytkownicy u
JOIN instytucje i ON u.wszystkie_instytucje = 1
UNION
SELECT ui.uzytkownik_id, ui.instytucja_id
FROM uzytkownik_instytucja ui
UNION
SELECT u.id, u.instytucja_id
FROM uzytkownicy u
WHERE u.instytucja_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Uczestnicy klienta z wiekiem liczonym z numeru PESEL (D-236). Miesiac w PESEL
-- koduje stulecie: +20 dla lat 2000-2099, +80 dla 1800-1899.
-- --------------------------------------------------------------------------
CREATE VIEW v_uczestnicy_klienta AS
WITH p AS (
  SELECT u.*,
    CASE WHEN length(u.pesel) = 11 AND u.pesel GLOB '[0-9]*' THEN
      CAST(substr(u.pesel, 3, 2) AS INTEGER) END AS mm_kod
  FROM uczestnicy_klienta u
),
d AS (
  SELECT p.*,
    CASE
      WHEN mm_kod IS NULL THEN NULL
      WHEN mm_kod > 80 THEN 1800 + CAST(substr(pesel, 1, 2) AS INTEGER)
      WHEN mm_kod > 20 THEN 2000 + CAST(substr(pesel, 1, 2) AS INTEGER)
      ELSE 1900 + CAST(substr(pesel, 1, 2) AS INTEGER)
    END AS rok_ur,
    CASE WHEN mm_kod IS NULL THEN NULL ELSE mm_kod % 20 END AS mies_ur,
    CAST(substr(pesel, 5, 2) AS INTEGER) AS dzien_ur
  FROM p
)
SELECT d.id, d.klient_id, d.imie_nazwisko, d.pesel, d.rodzaj_zatrudnienia, d.zatrudnienie_do,
  d.wyksztalcenie, d.zawod, d.utworzono,
  CASE WHEN d.rok_ur IS NULL THEN NULL ELSE
    CAST(strftime('%Y', 'now') AS INTEGER) - d.rok_ur
      - (CASE WHEN printf('%02d-%02d', d.mies_ur, d.dzien_ur) > strftime('%m-%d', 'now') THEN 1 ELSE 0 END)
  END AS wiek
FROM d;

-- --------------------------------------------------------------------------
-- Czarna lista klientow (D-249). Regula: co najmniej dwa zgloszenia z powodem
-- "Niezlozony wniosek" z dwoch roznych dat. Reczne ustawienie flagi wylacza
-- regule (D-19), "Przywroc regule" wraca do wartosci wyliczonej.
-- --------------------------------------------------------------------------
CREATE VIEW v_klient_czarna_lista AS
SELECT k.id AS klient_id,
  (SELECT COUNT(DISTINCT z.data) FROM zgloszenia z
    WHERE z.klient_id = k.id AND z.powod = 'Niezłożony wniosek') AS niezlozonych,
  CASE WHEN (SELECT COUNT(DISTINCT z.data) FROM zgloszenia z
              WHERE z.klient_id = k.id AND z.powod = 'Niezłożony wniosek') >= 2 THEN 1 ELSE 0 END
    AS czarna_lista_wyliczona,
  k.czarna_lista_regula_aktywna,
  CASE WHEN k.czarna_lista_regula_aktywna = 1 THEN
    CASE WHEN (SELECT COUNT(DISTINCT z.data) FROM zgloszenia z
                WHERE z.klient_id = k.id AND z.powod = 'Niezłożony wniosek') >= 2 THEN 1 ELSE 0 END
  ELSE k.czarna_lista END AS czarna_lista_efektywna
FROM klienci k;

-- --------------------------------------------------------------------------
-- Skutecznosc osob przygotowujacych wnioski (D-242). Liczymy tylko wnioski
-- z decyzja: pozytywne i negatywne. Wnioski, ktorych klient nie zlozyl, nie
-- wchodza do mianownika. Obok liczba wszystkich przygotowanych wnioskow,
-- niezaleznie od statusu (D-270). Wniosek usuniety z listy nie jest liczony (D-261).
-- --------------------------------------------------------------------------
CREATE VIEW v_skutecznosc_pracownikow AS
SELECT w.przygotowal_id AS uzytkownik_id, w.rok,
  COUNT(*) AS przygotowane,
  SUM(CASE WHEN w.status_decyzji = 'Pozytywna' THEN 1 ELSE 0 END) AS pozytywne,
  SUM(CASE WHEN w.status_decyzji = 'Negatywna' THEN 1 ELSE 0 END) AS negatywne,
  ROUND(100.0 * SUM(CASE WHEN w.status_decyzji = 'Pozytywna' THEN 1 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN w.status_decyzji IN ('Pozytywna','Negatywna') THEN 1 ELSE 0 END), 0), 1)
    AS skutecznosc_proc
FROM wnioski w
WHERE w.przygotowal_id IS NOT NULL AND w.usuniety = 0
GROUP BY w.przygotowal_id, w.rok;

-- --------------------------------------------------------------------------
-- Prowizje pracownikow (D-292): obrot na wnioskach z decyzja pozytywna, ktore pracownik
-- przygotowal w okresie obowiazywania warunku. Prowizja nalezy sie od calego obrotu,
-- gdy przekroczy minimum. Widok zamiast tabeli przeliczanej co godzine (R-06).
-- --------------------------------------------------------------------------
CREATE VIEW v_prowizje_pracownikow AS
SELECT wp.id, wp.uzytkownik_id, u.imie_nazwisko, wp.procent_prowizji, wp.minimum_obrotu,
  wp.obowiazuje_od, wp.obowiazuje_do,
  COALESCE(SUM(f.podstawa_prowizji), 0) AS osiagniety_obrot,
  COUNT(f.wniosek_id) AS wnioskow,
  CASE WHEN COALESCE(SUM(f.podstawa_prowizji), 0) >= COALESCE(wp.minimum_obrotu, 0) THEN 1 ELSE 0 END AS osiagniety,
  CASE WHEN COALESCE(SUM(f.podstawa_prowizji), 0) >= COALESCE(wp.minimum_obrotu, 0)
       THEN ROUND(COALESCE(SUM(f.podstawa_prowizji), 0) * wp.procent_prowizji / 100, 2) ELSE 0 END AS prowizja
FROM warunki_prowizji_pracownikow wp
JOIN uzytkownicy u ON u.id = wp.uzytkownik_id
LEFT JOIN wnioski w ON w.przygotowal_id = wp.uzytkownik_id AND w.usuniety = 0 AND w.status_decyzji = 'Pozytywna'
  AND COALESCE(w.data_wniosku, w.data_wplyniecia_formularza) >= wp.obowiazuje_od
  AND (wp.obowiazuje_do IS NULL OR COALESCE(w.data_wniosku, w.data_wplyniecia_formularza) <= wp.obowiazuje_do)
LEFT JOIN v_wniosek_finanse f ON f.wniosek_id = w.id
GROUP BY wp.id;

-- --------------------------------------------------------------------------
-- Podstawa prowizji instytucji per okres (miesiac faktury) liczona w locie (D-276, R-06).
-- Stawki i progi naklada silnik prowizji (assets/prowizja.js). Okres zamkniety ma
-- zamrozony wynik w prowizje_zamkniete i nie jest juz przeliczany (R-03).
-- --------------------------------------------------------------------------
CREATE VIEW v_prowizje_podstawa AS
SELECT f.instytucja_id, substr(f.data_wystawienia_faktury, 1, 7) AS okres,
  COUNT(*) AS liczba_wnioskow, ROUND(SUM(f.podstawa_prowizji), 2) AS podstawa,
  EXISTS (SELECT 1 FROM prowizje_zamkniete z WHERE z.instytucja_id = f.instytucja_id
          AND z.okres = substr(f.data_wystawienia_faktury, 1, 7)) AS zamkniety
FROM v_wniosek_finanse f
WHERE f.usuniety = 0 AND f.status_decyzji = 'Pozytywna' AND f.data_wystawienia_faktury IS NOT NULL
GROUP BY f.instytucja_id, substr(f.data_wystawienia_faktury, 1, 7);

-- --------------------------------------------------------------------------
-- Rejestr zmian (D-291): wpis bez wskazanej tabeli dostaje ja z prefiksu obiektu, zeby
-- historia rekordu dzialala dla kazdego zapisu. Wzorzec action_logs Open Mercato (R-13).
-- --------------------------------------------------------------------------
CREATE TRIGGER tr_rejestr_rekord AFTER INSERT ON rejestr_aktywnosci
WHEN NEW.tabela IS NULL AND NEW.obiekt IS NOT NULL
BEGIN
  UPDATE rejestr_aktywnosci SET
    tabela = CASE WHEN NEW.obiekt LIKE 'PR-%' THEN 'wnioski' WHEN NEW.obiekt LIKE 'KL-%' THEN 'klienci'
                  WHEN NEW.obiekt LIKE 'IS-%' THEN 'instytucje' WHEN NEW.obiekt LIKE 'FO-%' THEN 'formularze_oczekujace' END,
    rekord_id = CASE WHEN NEW.obiekt LIKE 'PR-%' OR NEW.obiekt LIKE 'KL-%' OR NEW.obiekt LIKE 'IS-%' OR NEW.obiekt LIKE 'FO-%'
                     THEN NEW.obiekt END
  WHERE id = NEW.id;
END;
