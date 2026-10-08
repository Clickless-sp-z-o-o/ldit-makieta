/* Konfigurator instytucji: statyczne panele zakladek Dane do faktury i Formularz zgloszeniowy. Tylko deklaracje. */
function panelFaktura07() {
  return `
      <div class="card-body">
        <div class="grid g-2-1">
          <div>
            <div class="card mb0">
              <div class="card-head">
                <h3>Szablon maila „dane do faktury”<span class="tip-mark" data-tip="Sekcja definiuje gotowy szablon maila z danymi firmy do wystawienia faktury: nazwa klienta, adres, NIP, odbiorca FV, szkolenie, liczba osób, ceny i termin płatności. Pola są uzupełniane automatycznie z karty klienta i projektu. Akcja jest uruchamiana na żądanie z karty projektu (D-104), a mail wymaga zatwierdzenia przed wysłaniem. Sekcja istnieje, żeby ujednolicić treść i uniknąć ręcznego przepisywania danych firmy.">i</span></h3>
                <span class="sub">akcja na żądanie z karty projektu <span class="ref">D-104</span></span>
                <div class="ch-actions"><button class="btn sm">Edytuj szablon</button></div>
              </div>
              <div class="card-body">
                <div class="mail-preview" id="mailFakt"></div>
                <div id="uwagaProc"></div>
              </div>
            </div>

            <div class="note warn" style="margin-top:16px">
              <b>Procent finansowania w klauzuli jest parametryzowany.</b>
              Wartość pochodzi z progu dofinansowania wniosku (tabela progów),
              nie jest wpisana na sztywno w szablonie. Do potwierdzenia u klienta przed pierwszą wysyłką.
            </div>

            <div class="note mb0">
              <b>Wymagane zatwierdzenie przed wysyłką.</b> Mail nie wychodzi automatycznie, użytkownik
              widzi gotową treść i klika „Wyślij”. Zasada obowiązuje w całym module wysyłki, żeby
              uniknąć przypadkowego kliknięcia.
            </div>
          </div>

          <div>
            <div class="card mb0">
              <div class="card-head"><h3>Pola uzupełniane automatycznie</h3></div>
              <div class="card-body tight">
                <table class="tbl">
                  <thead><tr><th>Pole</th><th>Źródło</th></tr></thead>
                  <tbody>
                    <tr><td class="strong">Nazwa klienta</td><td class="muted">Klient</td></tr>
                    <tr><td class="strong">Adres siedziby</td><td class="muted">Klient</td></tr>
                    <tr><td class="strong">NIP</td><td class="muted">Klient</td></tr>
                    <tr><td class="strong">Imię i nazwisko odbiorcy FV</td><td class="muted">Projekt</td></tr>
                    <tr><td class="strong">Szkolenie, ilość osób</td><td class="muted">Uczestnicy zakwalifikowani</td></tr>
                    <tr><td class="strong">Cena jednostkowa i całkowita</td><td class="muted">Projekt</td></tr>
                    <tr><td class="strong">Lista uczestników</td><td class="muted">Uczestnicy zakwalifikowani</td></tr>
                    <tr><td class="strong">Termin realizacji</td><td class="muted">Termin szkolenia</td></tr>
                    <tr><td class="strong">Termin płatności</td><td class="muted">Ustawienie instytucji</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="field mt16">
              <label>Domyślny odbiorca maila</label>
              <select class="inp" id="odbiorcaFakt"></select>
              <div class="hint">Osoba od faktur z karty instytucji. Zmiana nie wpływa na już wysłane maile.</div>
            </div>

            <div class="field">
              <label>Domyślny termin płatności</label>
              <select class="inp">
                <option>14 dni od wystawienia</option>
                <option>21 dni od wystawienia</option>
                <option>30 dni od wystawienia</option>
              </select>
            </div>
          </div>
        </div>
      </div>
`;
}

function panelFormularz07() {
  return `
      <div class="card-body">
        <div class="grid g-2-1">
          <div>
            <div class="card mb0">
              <div class="card-head">
                <h3>Formularz zgłoszeniowy instytucji</h3>
                <span class="sub">własna kopia per instytucja <span class="ref">D-70</span></span>
                <div class="ch-actions">
                  <button class="btn sm">Kopiuj link</button>
                  <button class="btn sm primary" onclick="alert('Wysyła zgłoszenie oznaczone jako testowe.\\nTrafia do kolejki akceptacji z etykietą TEST i nie tworzy klienta w bazie.')">Zgłoszenie testowe</button>
                </div>
              </div>
              <div class="card-body">
                <div class="field">
                  <label>Link do formularza</label>
                  <input class="inp mono" id="linkForm" readonly>
                  <div class="hint">
                    Każda instytucja ma własną kopię formularza, około 20 kopii na start. Link osadza się
                    na stronie instytucji albo wysyła handlowiec. Wypełnia go klient końcowy, nie handlowiec.
                  </div>
                </div>

                <div class="grid g2">
                  <div class="kpi"><div class="k-label">Klientów w bazie</div><div class="k-value" id="kfWyp"></div><div class="k-foot">przypisanych do instytucji</div></div>
                  <div class="kpi"><div class="k-label">Oczekuje akceptacji</div><div class="k-value" id="kfKol"></div><div class="k-foot">bramka anty-spam</div></div>
                </div>
              </div>
            </div>

            <div class="note" style="margin-top:16px">
              <b>Instytucja widzi tylko licznik i przycisk zgłoszenia testowego.</b>
              Nie ma dostępu do treści zgłoszeń innych instytucji ani do wspólnej kolejki akceptacji.
              Zgłoszenie staje się klientem dopiero po akceptacji administratora.
            </div>

            <div class="note open mb0">
              <span class="ref p">P-24</span> <b>Technologia formularza nie została ustalona.</b>
              Rekomendacja wykonawcy to formularz natywny w systemie, nie Google Forms: PESEL nie może
              trafiać poza infrastrukturę systemu, 20 kopii w Google to ryzyko rozjazdu wersji, a lista
              szkoleń musi pochodzić z katalogu w systemie <span class="ref p">P-23</span>.
            </div>
          </div>

          <div>
            <div class="card mb0">
              <div class="card-head"><h3>Pola formularza</h3><span class="sub">wzorowane na obecnym pliku Excel</span></div>
              <div class="card-body tight">
                <table class="tbl">
                  <thead><tr><th>Pole</th><th>Typ</th><th class="c">Wymagane</th></tr></thead>
                  <tbody id="polaForm"></tbody>
                </table>
              </div>
            </div>

            <div class="note warn" style="margin-top:16px">
              <b>Liczba zatrudnionych na umowę o pracę</b> wyznacza wielkość przedsiębiorstwa i wskaźnik
              dofinansowania: do 9 osób to mikroprzedsiębiorca i 90% dofinansowania, powyżej 70%.
              Błąd w tym polu przekłada się bezpośrednio na kwoty w projekcie.
            </div>

            <div class="note mb0">
              <b>Szkolenie wybierane z listy, nie wpisywane ręcznie</b> <span class="ref">D-82</span>.
              Lista pochodzi z katalogu instytucji wraz z ceną widoczną dla wypełniającego, dzięki czemu
              nazwy pozostają spójne z katalogiem i z certyfikatami.
            </div>
          </div>
        </div>
      </div>
`;
}
