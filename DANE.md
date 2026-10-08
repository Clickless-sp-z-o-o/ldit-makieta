# Warstwa danych makiety: SQLite w przeglądarce

Makieta nie trzyma już danych w JSON-ie. Pod spodem działa **prawdziwa baza SQLite**,
uruchamiana w przeglądarce przez [sql.js](https://github.com/sql-js/sql.js) (SQLite
skompilowany do WebAssembly, licencja MIT).

Powód jest praktyczny: model danych, który dziś obsługuje makietę, jest tym samym modelem,
który pojedzie do aplikacji. `schema.sql` przenosi się na Postgresa praktycznie bez zmian,
a reguły wyliczeń z `views.sql` stają się warstwą domenową. Makieta przestaje być rysunkiem
i staje się dowodem, że model się spina.

---

## Pliki

```
makieta/
  db/
    schema.sql          struktura: 33 tabele, klucze obce, CHECK, indeksy
    views.sql           reguły biznesowe jako widoki SQL
    seed.sql            dane startowe do czytania (generowane)
    seed-db.js          ta sama baza jako binarium base64 (generowane)
    sql-wasm.js         silnik sql.js
    sql-wasm-data.js    binarium WebAssembly wklejone jako base64
  assets/
    sqlite.js           start silnika, zapis stanu (przeglądarka albo plik na dysku), eksport .sqlite
    store.js            dostęp do danych: get / query / insert / update / remove
    haslo.js            skrót hasła SHA-256 z solą
    funkcje.js          dopasowanie features z wildcardem "modul.*"
    auth.js             logowanie, sesja z tabeli sesje, role, features (maFunkcje, poziom, moze)
    walidacja.js        walidacja na granicy zapisu (odpowiednik Zod)
    straznik.js         strażnik zapisów: moduł, wiersz, pole
    straznik-wlasnosc.js  strażnik: dane klienta i zadania tylko w swoim zakresie
    html.js             esc() i escJs() przeciw XSS
    zakres.js           separacja danych, filtr wierszy i pól
    prowizja.js         silnik prowizji
    db.js               adapter: składa window.DB dla stron
    db-format.js        formatowanie kwot, liczb i dat (dd.mm.rrrr)
    db-klienci.js       adapter: klienci i formularze z pełnym formularzem klienta
    podglad-roli.js     podgląd roli i konta dla administratora (D-268): menu, pola, zakres danych, tylko odczyt
    boot.js             start strony, brama dostępu
tools/
    build-sqlite.mjs    buduje bazę ze schema.sql, views.sql i db.json
    sqlite-migracja.mjs mapowanie starych danych na nowy schemat
    migracja-uprawnienia.mjs  dane funkcji i nadań rolom (features)
    migracja-slowniki.mjs     dane słowników
    serwer.mjs          lokalny serwer: makieta plus baza w pliku na dysku
```

Każda strona ładuje ten łańcuch:

```
sql-wasm.js → sql-wasm-data.js → seed-db.js → sqlite.js → store.js → haslo.js
→ funkcje.js → auth.js → walidacja.js → straznik-wlasnosc.js → straznik.js → zakres.js → prowizja.js → db-format.js → db-klienci.js → db.js → lata.js → html.js → podglad-roli.js → tips.js → boot.js
```

Potem ładują się skrypty konkretnej strony z `makieta/strony/js/*.js` (każdy poniżej 300 linii, wcześniej siedziały w plikach HTML).

---

## Dlaczego działa z dwukliku

Przeglądarka na protokole `file://` blokuje `fetch()` plików lokalnych, więc standardowe
ładowanie `.wasm` by nie zadziałało. Dlatego binarium WebAssembly jest wklejone jako base64
do `db/sql-wasm-data.js`, a baza startowa do `db/seed-db.js`. Nie ma żadnego serwera,
`index.html` otwiera się dwuklikiem, wszystko działa offline.

Koszt: około 1,9 MB dwóch wygenerowanych plików w repozytorium.

---

## Lokalna baza na dysku (tryb serwera)

Z dwukliku baza żyje w pamięci przeglądarki: jedna przeglądarka, jeden komputer, a wyczyszczenie
danych przeglądarki kasuje zmiany. Żeby dane leżały w zwykłym pliku bazy na dysku, uruchom:

```
node tools/serwer.mjs          # potem otwórz http://127.0.0.1:8080/
```

Wtedy:

- baza jest w pliku **`makieta/db/kfs.sqlite`** (poza repozytorium, w `.gitignore`), wspólnym dla
  wszystkich kart i przeglądarek na tym komputerze; plik otworzysz w DB Browser for SQLite,
- pierwszy start bierze bazę startową, każdy zapis w makiecie trafia do pliku,
- dwa okna nie nadpiszą sobie zmian: zapis ze starszej wersji dostaje odmowę i komunikat
  „odśwież stronę” (blokada wersji, jak optimistic locking w Open Mercato),
- `KFS.reset()` odkłada plik do `kfs.sqlite.bak` i wraca do bazy startowej,
- `KFS.tryb` mówi, który tryb działa: `serwer` albo `przegladarka`.

Serwer nasłuchuje wyłącznie na `127.0.0.1`, sprawdza nagłówki Host i Origin, ogranicza liczbę
zapisów na minutę i rozmiar pliku, przyjmuje tylko pliki SQLite i zapisuje atomowo. Podaje
wyłącznie katalogi `makieta/` i `dokumentacja/`, sam plik bazy nie jest dostępny jako plik
statyczny. Nadal to makieta: uprawnienia sprawdza przeglądarka, a ta ma całą bazę. Prawdziwą
barierą będą polityki w bazie i filtr w serwerze aplikacji [D-179].

---

## Jak działa start i zapis

1. `sqlite.js` uruchamia silnik i wczytuje bazę. W trybie serwera z pliku na dysku, z dwukliku:
   jeśli w `localStorage` leży zapisany stan
   roboczy (klucz `kfs_sqlite_v5`), bierze jego, w przeciwnym razie bazę startową.
2. Każdy zapis przez `Store` odkłada binarium bazy z powrotem do `localStorage`, więc
   **zmiany przeżywają odświeżenie strony**.
3. `KFS.reset()` kasuje stan roboczy i wraca do bazy startowej.
4. `KFS.pobierzPlik("kfs.sqlite")` pobiera bieżącą bazę jako plik, który otworzysz w DB Browser
   for SQLite albo dowolnym innym narzędziu.

Baza jest asynchroniczna (WebAssembly), a kod stron pisany tak, jakby dane były od razu.
Rozwiązuje to `boot.js`: skrypt strony siedzi w bloku `<script type="text/kfs-strona">`
i uruchamia się dopiero po wstaniu bazy.

---

## Czytanie danych

```js
Store.get("klienci")                              // cała tabela
Store.find("wnioski", "WN-2026-001")              // po id
Store.query("SELECT * FROM wnioski WHERE rok = ?", ["2026"])
Store.one("SELECT COUNT(*) AS n FROM uczestnicy")
```

Strony nadal czytają `window.DB.*` (gotowe widoki, formatery), ale pod spodem każdy z nich
powstaje z zapytania SQL. Adapter `db.js` jest jedynym miejscem, które tłumaczy tabele na
kształt oczekiwany przez ekrany.

## Zapis danych

```js
Store.insert("terminy", { instytucja_id: "IS-01", ... }, "TR-")
Store.update("wnioski", "WN-2026-001", { koszt_calkowity_z_doplata: 120000 })
Store.remove("klienci", "KL-0001")
```

`Store` przepuszcza wyłącznie kolumny, które istnieją w tabeli, a baza egzekwuje klucze obce
i wartości słownikowe. Próba zapisania wniosku do nieistniejącej instytucji albo wielkości
przedsiębiorstwa spoza słownika kończy się błędem, nie cichym zapisem śmiecia.

---

## Reguły biznesowe w SQL

Widok `v_wniosek_finanse` liczy wszystko, co dokumentacja nazywa polem wyliczanym:

| Pole | Reguła | Decyzja |
|---|---|---|
| wielkość przedsiębiorstwa | nadpisanie per wniosek, w razie braku z klienta | D-132 |
| procent dofinansowania | z tabeli progów, wersja ważna w dniu wniosku | D-131 |
| koszt całkowity | koszt z dopłatą minus dopłata dodatkowa | D-134 |
| próg dofinansowania | wybrany we wniosku albo dobrany regułą z wielkości i daty | D-171 |
| przyznano | koszt całkowity razy procent progu, tylko decyzja pozytywna | D-135 |
| wkład własny | reszta: koszt minus przyznano, nadpisywalny ręcznie | D-172, D-184 |
| całkowita wartość szkolenia | suma po uczestnikach zakwalifikowanych | D-61, D-79 |
| podstawa prowizji | koszt z dopłatą, gdy dopłata jest na fakturze KFS, inaczej bez niej | D-64, D-174 |

Obok: `v_faktura_szczegoly` (faktura ze szkoleniem i klientem z wniosków, okres rozliczeniowy
także dla korekty, D-161, D-170) i `v_podsumowanie_roku` (liczby na dashboard, dla 2025 z
podsumowań historycznych, D-175).

Każde pole wyliczane występuje w dwóch wariantach: `*_wyliczony` (zawsze z reguły, nawet gdy
reguła jest wyłączona) i `*_efektywny` (to, co widzi użytkownik). Dzięki temu przycisk
**Przywróć regułę** ma do czego wracać [D-19].

---

## Separacja danych

Filtr zakładany jest w `zakres.js`, na wyniku adaptera, **zanim jakakolwiek strona zobaczy dane**.
Ukrycie kolumny w HTML nie jest zabezpieczeniem, bo dane i tak leżą w pamięci strony i widać je
w narzędziach deweloperskich. Po zalogowaniu na konto pracownika LDIT stawki prowizji nie są
w ogóle wczytane, nie tylko schowane.

Trzy poziomy kontroli:

| Poziom | Pytanie | Źródło |
|---|---|---|
| moduł | czy rola widzi zakładkę i co może w niej zrobić | features rodzaju `modul` w `funkcje`, nadania w `role_funkcje` |
| pole | czy widzi prowizję, PESEL (`klient.pesel`), zysk firmy | features rodzaju `pole` w `funkcje` |
| wiersz | czyje instytucje i czyich klientów | tabela `uzytkownik_instytucja`, widok `v_zakres_uzytkownika`, kolumny `handlowiec_id` |

Uprawnienia to features w modelu Open Mercato [D-211]: `funkcje` to katalog (`id` w formie
`modul.akcja`, `rodzaj`, `zalezy_od`), `role_funkcje` to nadania rolom, także z wildcardem
`modul.*`. Poziom modułu: podgląd = `<m>.view`, edycja = `<m>.*`. Sprawdzają to `Auth.maFunkcje`,
`Auth.poziom` i `Auth.moze`.

Filtr handlowca [D-210]: bez feature `zakres.cala_instytucja` (nadanej tylko roli `is`) konto
instytucji jest handlowcem i widzi tylko swoich klientów i wnioski (`handlowiec_id` w
`klient_instytucja`, `wnioski` i `formularze_oczekujace`). Filtr siedzi w `zakresHandlowca`
(`zakres.js`) i w `Auth.klienciWZakresie`. Handlowiec nie ma statystyk [D-209].

Walidacja: `walidacja.js` sprawdza dane przy każdym zapisie, zanim dojdą do bazy (e-mail,
telefon, NIP i PESEL z cyfrą kontrolną, URL, daty, kwoty nieujemne, liczby całkowite, pola
wymagane, `data_do >= data_od` w terminach). Przy edycji sprawdzane są tylko zmieniane pola.
Błąd to `StraznikError` z kodem `walidacja`. Tryb systemowy `Store` nie jest publiczny
(`Store.odbierzTrybSystemowy`, jednorazowo dla `auth.js`), a eksport całej bazy wymaga `ustaw.manage`.

Te same trzy poziomy pilnują zapisów. `straznik.js` przechwytuje każdy `Store.insert`,
`update` i `remove`: rola musi mieć edycję modułu, do którego należy tabela, zapisywany wiersz
musi należeć do instytucji z zakresu konta (przy edycji sprawdzany jest stan przed i po, więc
rekordu nie da się przenieść do konkurencji), a pola prowizji zmienia tylko rola z feature
`finanse.prowizja`. Rejestr aktywności jest tylko do dopisywania. Odrzucony zapis pokazuje
komunikat na ekranie.

## Logowanie i sesja

- Hasło nie leży w bazie jawnie: `uzytkownicy.haslo_skrot` to SHA-256 z solą (`haslo_sol`),
  iterowany 1000 razy. Docelowo bcrypt z frameworka Open Mercato [D-176].
- Błąd logowania ma jeden komunikat, który nie zdradza, czy konto istnieje.
- Po 5 nieudanych próbach konto czeka 15 minut (`nieudane_proby`, `zablokowane_do`).
- Przeglądarka trzyma wyłącznie losowy token. Rola, zakres i blokada są przy każdym odczycie
  czytane z tabeli `sesje` i `uzytkownicy`, więc podmiana czegokolwiek w pamięci przeglądarki
  nie podnosi uprawnień. Sesja wygasa po 30 minutach bezczynności i po 8 godzinach.
- Zablokowanie konta przez administratora kończy trwającą sesję.

---

## Konta demonstracyjne

Hasło do wszystkich kont: **`demo`** (w bazie jako skrót z solą; jawnie tylko w `meta.haslo_demo`
na potrzeby listy kont na ekranie logowania).
Lista kont jest na ekranie logowania, klikasz i formularz się wypełnia.

| Konto | Rola | Co widzi |
|---|---|---|
| bartek@ldit.pl | Administrator | wszystko, w tym prowizje i rejestry |
| martyna@ldit.pl | Pracownik LDIT | 3 instytucje z 20, bez prowizji i faktur |
| biuro@odczarujpowerbi.pl | Instytucja szkoleniowa | wyłącznie własnych klientów |
| mirka@dronfortech.pl | Pracownik IS | dane kontaktowe, bez kwot i numerów PESEL |
| kontakt@stalmetspzoospk.pl | Klient końcowy | wyłącznie własny wniosek |

---

## Przebudowa bazy

```
node tools/build-db.mjs        # dane demonstracyjne do makieta/data/db.json
node tools/build-sqlite.mjs    # db.json + schema.sql + views.sql -> seed.sql i seed-db.js
node tools/wire-pages.mjs      # łańcuch skryptów w 18 stronach (idempotentne)
```

## Testy

```
node tools/verify-parity.mjs      # migracja nie zmieniła żadnej liczby w makiecie
node tools/smoke-crud.mjs         # CRUD, ograniczenia schematu, pola wyliczane
node tools/test-uprawnienia.mjs   # role, uprawnienia, separacja danych
node tools/test-zgodnosc-pol.mjs  # formularze zapisują do istniejących kolumn
node tools/test-prowizja.mjs      # przypadki z docs/07, korekty w okresie wystawienia, warunki od daty
node tools/test-lata.mjs          # zakładki lat, nieprzypisane wnioski, brak wniosków z 2025
node tools/test-bezpieczenstwo.mjs # hasła, blokada, sesja, strażnik zapisów, XSS
node tools/test-walidacja.mjs     # walidacja danych na granicy zapisu
node tools/test-serwer.mjs        # lokalny serwer bazy
node tools/test-model.mjs         # dane interaktywnego diagramu tabel
```
