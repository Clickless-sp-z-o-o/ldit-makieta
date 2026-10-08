/* Konfigurator instytucji: statyczny panel zakladki Warunki prowizyjne. Tylko deklaracje. */
function panelProwizje07() {
  return `
      <div class="card-body">
        <div class="grid g-2-1">
          <div>
            <div class="card mb0">
              <div class="card-head">
                <h3>Warunki obowiązujące dziś<span class="tip-mark" data-tip="Warunki prowizyjne opisują, jak LDIT nalicza swoją prowizję od współpracy z tą instytucją. Wybrany model (A, B, C lub D) decyduje o sposobie liczenia: A - próg miesięczny od całości obrotu, B - skala roczna narastająco od nadwyżki, C - próg miesięczny od nadwyżki, D - stała stawka bez kumulacji. Prowizja jest zawsze procentowa (D-21), a podstawą jest koszt całkowity z dopłatą (D-18).">i</span></h3>
                <span class="sub" id="obowOd"></span>
                <div class="ch-actions">
                  <a href="15-konfigurator-prowizji.html" class="btn primary">Otwórz kalkulator</a>
                </div>
              </div>
              <div class="card-body" id="warunkiAkt"></div>
            </div>

            <div class="note" style="margin-top:16px">
              <b>Stawka warunków jest procentowa.</b> Indywidualne nadpisanie na wniosku może być procentem
              albo kwotą <span class="ref">D-136</span> i wlicza się do puli progowej <span class="ref">D-137</span>.
              Podstawą naliczenia jest <b>koszt całkowity z dopłatą</b>, nie kwota przyznana przez urząd
              <span class="ref">D-18</span>. Nadpisanie robi się na karcie wniosku, a podgląd wyniku jest w module Administracja
              <span class="ref">D-138</span>.
            </div>

            <div class="note open mb0">
              <span class="ref p">P-01</span> <b>Okres rozliczeniowy nie jest rozstrzygnięty.</b>
              Na warsztacie padły dwie wersje: okresem jest data wystawienia faktury albo prognoza
              z kalendarza szkoleń. Kalkulator liczy dziś po dacie faktury. Do potwierdzenia u klienta
              przed uruchomieniem silnika.
            </div>
          </div>

          <div>
            <div class="card mb0">
              <div class="card-head">
                <h3>Historia wersji warunków</h3>
                <span class="sub">wersjonowanie <span class="ref">D-22</span></span>
              </div>
              <div class="card-body">
                <div class="timeline" id="historia"></div>
              </div>
            </div>

            <div class="note warn" style="margin-top:16px">
              <b>Historia rozliczeń nie jest przeliczana wstecz</b> <span class="ref">D-23</span> <span class="ref">D-162</span>.
              Nowe warunki działają od swojej daty, nigdy wstecz. Dodanie wersji tworzy nowy wiersz z datą
              obowiązywania (dzisiejszą lub przyszłą) i zamyka poprzedni dniem wcześniej. Projekty rozliczone
              na starych warunkach zostają na nich na zawsze, nawet jeśli nowa stawka jest korzystniejsza.
            </div>

            <div class="card mb0" id="cardNowaWersja" style="margin-top:16px">
              <div class="card-head"><h3>Nowa wersja warunków</h3></div>
              <div class="card-body">
                <div class="btn-row" id="polaWersji" style="align-items:center"></div>
                <div class="small" id="bladWersji" style="color:var(--neg-ink);margin-top:6px"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="sep"></div>

        <div class="card mb0">
          <div class="card-head">
            <h3>Rozliczenia wg wersji warunków</h3>
            <span class="sub">ile projektów przypada na którą wersję, prowizję naliczoną pokazuje moduł Administracja</span>
          </div>
          <div class="card-body tight">
            <table class="tbl">
              <thead>
                <tr><th>Wersja</th><th>Okres obowiązywania</th><th>Sposób liczenia</th>
                    <th class="num">Projektów</th><th class="num">Podstawa</th></tr>
              </thead>
              <tbody id="rozlWersje"></tbody>
            </table>
          </div>
        </div>

        <div class="sep"></div>

        <div class="card mb0">
          <div class="card-head">
            <h3>Progi dofinansowania KFS<span class="tip-mark" data-tip="Progi dofinansowania KFS są konfigurowalne i datowane (D-131), a nie zaszyte na sztywno. Reguły KFS zmieniają się co roku, na przykład w przyszłym roku może obowiązywać 80/20 zamiast 90/10. Dlatego każdy wskaźnik ma datę 'obowiązuje od', a system dobiera zestaw progów po dacie projektu. Koryguje D-59, gdzie procenty były wpisane na stałe.">i</span></h3>
            <span class="sub">konfigurowalne, wersjonowane datą <span class="ref">D-131</span> <span class="ref">D-59</span></span>
            <div class="ch-actions"><span class="tag mute" id="progiInfo"></span></div>
          </div>
          <div class="card-body tight">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Wielkość przedsiębiorstwa</th>
                  <th class="num">Procent dofinansowania</th>
                  <th class="num">Procent wkładu własnego</th>
                  <th>Obowiązuje od</th>
                  <th>Obowiązuje do</th>
                </tr>
              </thead>
              <tbody id="progiDof"></tbody>
            </table>

            <div id="formProgi" style="padding:14px 16px;border-top:1px solid var(--line)">
              <div class="small muted" style="margin-bottom:8px">
                <b>Nowa wersja progów.</b> Zamyka obowiązujące wiersze dniem poprzedzającym i dodaje nowe,
                stare wiersze zostają bez zmian <span class="ref">D-131</span>. Zmienia tylko administrator <span class="ref">D-190</span>.
              </div>
              <div class="btn-row" id="polaProgi" style="align-items:center"></div>
              <div class="small" id="bladProgi" style="color:var(--neg-ink);margin-top:6px"></div>
            </div>

            <div class="note warn" style="margin-top:16px;margin-bottom:0">
              <b>Progi KFS zmieniają się co roku, dlatego są konfigurowalne i datowane</b>
              <span class="ref">D-131</span>. Dziś mikroprzedsiębiorca (do 9 osób na umowie o pracę) ma
              90% dofinansowania i 10% wkładu własnego, pozostali 70% i 30%. Gdyby w kolejnym roku KFS
              wprowadził na przykład 80/20, administrator dodaje nową wersję z datą obowiązywania,
              a stare projekty zostają na progach z dnia rozliczenia. Wartości nie są zaszyte na sztywno
              w kodzie <span class="ref">D-59</span>.
            </div>
          </div>
        </div>
      </div>
`;
}
