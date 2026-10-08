/* Konfigurator instytucji: statyczny panel zakladki Wzor certyfikatu. Tylko deklaracje. */
function panelCertyfikat07() {
  return `
      <div class="card-body">
        <div class="grid g-1-2">

          <div>
            <div class="card mb0">
              <div class="card-head"><h3>Wzór certyfikatu<span class="tip-mark" data-tip="Tu administrator wgrywa wzór certyfikatu przypisany do jednej instytucji (D-98). Przy generowaniu system podstawia placeholdery (imię uczestnika, nazwa szkolenia, termin, data, miejscowość). Miejscowość to zawsze siedziba instytucji, nigdy miejsce realizacji szkolenia (D-99). Sekcja istnieje, żeby każda instytucja mogła mieć własny wzór dokumentu przy wsadowym generowaniu certyfikatów.">i</span></h3><span class="sub" id="certSub"></span></div>
              <div class="card-body">
                <div class="field">
                  <label>Plik wzoru</label>
                  <div class="drop">
                    <div class="small muted" style="margin-bottom:9px">
                      Przeciągnij plik albo wybierz z dysku. Wzór jest przypisany do jednej instytucji
                      <span class="ref">D-98</span>.
                    </div>
                    <input type="file" class="inp" style="height:auto;padding:6px 8px">
                  </div>
                  <div class="hint">Aktualnie wgrany: <span class="mono" id="certPlik"></span></div>
                </div>

                <div class="field">
                  <label>Numeracja certyfikatów</label>
                  <select class="inp">
                    <option>Bez numeru</option>
                    <option>Numer kolejny w roku</option>
                    <option>Skrót instytucji / rok / numer</option>
                  </select>
                  <div class="hint">Pole opcjonalne. Reguła nie została ustalona.</div>
                </div>

                <div class="btn-row">
                  <button class="btn">Pobierz aktualny wzór</button>
                  <button class="btn primary">Podgląd na przykładzie</button>
                </div>
              </div>
            </div>

            <div class="note" style="margin-top:16px">
              <b>Generowanie jest wsadowe.</b> Jedno kliknięcie „Generuj certyfikaty” przy projekcie
              tworzy po jednym PDF na uczestnika zakwalifikowanego, pakuje je w ZIP i pobiera
              w przeglądarce. Konwencja nazwy pliku: <code>certyfikat_imie_nazwisko</code>.
              System nie wysyła certyfikatów mailem <span class="ref">D-49</span>, trafiają one do paczki
              rozliczeniowej przygotowywanej ręcznie.
            </div>

            <div class="note open">
              <span class="ref p">P-19</span> <b>Kto wgrywa wzór i w jakim formacie.</b>
              Nie ustalono, czy plik wgrywa administrator, czy sama instytucja, ani czy formatem jest
              Word, PDF czy HTML. Od tej decyzji zależy sposób podstawiania placeholderów.
            </div>

            <div class="note open mb0">
              <span class="ref p">P-40</span> <b>Brak reguły numeracji certyfikatów.</b>
              Klient powiedział tylko „ewentualny numer certyfikatu, jeżeli będzie wymagany”.
              Nie wiadomo, czy numeracja jest ciągła w skali systemu, per instytucja, czy per rok.
            </div>
          </div>

          <div>
            <div class="card mb0">
              <div class="card-head">
                <h3>Dostępne placeholdery</h3>
                <span class="sub">podstawiane automatycznie przy generowaniu</span>
              </div>
              <div class="card-body tight">
                <table class="tbl">
                  <thead><tr><th>Placeholder</th><th>Źródło danych</th><th>Przykład</th></tr></thead>
                  <tbody id="placeholdery"></tbody>
                </table>
              </div>
            </div>

            <div class="note warn" style="margin-top:16px">
              <b>Miejscowość to zawsze siedziba instytucji</b> <span class="ref">D-99</span>,
              nigdy miejsce realizacji szkolenia. Szkolenie stacjonarne w Gdańsku prowadzone przez
              instytucję z siedzibą w Katowicach ma na certyfikacie <b>Katowice</b>.
              Wartość pochodzi z karty instytucji, pola „siedziba”.
            </div>

            <div class="card mb0">
              <div class="card-head"><h3>Podgląd</h3><span class="sub">dane przykładowe z projektu</span></div>
              <div class="card-body">
                <div class="cert" id="podgladCert"></div>
              </div>
            </div>
          </div>

        </div>
      </div>
`;
}
