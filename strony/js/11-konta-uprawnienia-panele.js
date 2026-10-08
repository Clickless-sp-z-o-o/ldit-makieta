/* Konta i uprawnienia: statyczna tresc zakladek 3 (macierz) i 4 (przypisanie do instytucji).
   Wstawiana przy starcie, zeby plik HTML ekranu miescil sie w limicie dlugosci. */
function trescMacierz11() {
  return [
    "      <div class=\"card-body\">",
    "        <div class=\"note\">",
    "          Podsumowanie wszystkich ról naraz, tylko do odczytu. Macierz jest wygenerowana z tych samych",
    "          tabel co Konfigurator ról (funkcje i role_funkcje), więc nie może pokazywać innych wartości.",
    "          Zmiany wprowadzasz wyłącznie w zakładce Konfigurator ról.",
    "        </div>",
    "",
    "        <div class=\"legend\" style=\"margin-bottom:12px\">",
    "          <span><i style=\"background:var(--pos-bg);border-color:#86efac\"></i>edycja lub uprawnienie nadane</span>",
    "          <span><i style=\"background:var(--info-bg);border-color:#7dd3fc\"></i>tylko podgląd</span>",
    "          <span><i style=\"background:var(--surface-3);border-color:var(--line-strong)\"></i>brak</span>",
    "        </div>",
    "      </div>",
    "",
    "      <div class=\"tbl-wrap\">",
    "        <table class=\"tbl matrix\">",
    "          <thead><tr id=\"hdrMx\"></tr></thead>",
    "          <tbody id=\"bodyMx\"></tbody>",
    "        </table>",
    "      </div>",
    "",
    "      <div class=\"card-body\">",
    "        <div class=\"note warn mb0\">",
    "          <b>Trzy warstwy separacji, których macierz nie może naruszyć.</b>",
    "          Instytucja nie widzi cudzych klientów, instytucja nie widzi żadnej stawki prowizji",
    "          (ani swojej, ani cudzej) <span class=\"ref\">D-07</span>, pracownik nie widzi zysków firmy",
    "          <span class=\"ref\">D-19</span>. Separacja egzekwowana na poziomie danych, nie interfejsu,",
    "          identycznie w widokach, wyszukiwarce, eksportach i formularzach.",
    "        </div>",
    "      </div>"
  ].join("\n");
}

function trescPrzypisanie11() {
  return [
    "      <div class=\"card-body\">",
    "        <div class=\"note\">",
    "          <b>To jest drugi, niezależny wymiar uprawnień <span class=\"ref\">D-113</span>.</b>",
    "          Macierz rola x moduł mówi <i>jakie zakładki</i> użytkownik widzi. Przypisanie do instytucji",
    "          mówi <i>czyje dane</i> w tych zakładkach zobaczy. Pracownik LDIT widzi wyłącznie klientów,",
    "          wnioski i zestawienia instytucji ze swojego przydziału, a rozwijana lista w zakładce",
    "          Dofinansowania jest do tego przydziału ograniczona. Dwie osoby z identyczną rolą mogą więc",
    "          widzieć zupełnie różne zbiory danych.<br><br>",
    "          <b>Bartek (3:12:21):</b> „pracownik Łucjan ma dostęp tylko do Metal Maniak, pracownik Martyna",
    "          ma dostęp do Odczaruj Power BI [i] Dron Fortech.”",
    "        </div>",
    "      </div>",
    "",
    "      <div class=\"tbl-wrap\">",
    "        <table class=\"tbl\">",
    "          <thead><tr id=\"hdrPrzyp\"></tr></thead>",
    "          <tbody id=\"bodyPrzyp\"></tbody>",
    "        </table>",
    "      </div>",
    "",
    "      <div class=\"card-body\">",
    "        <div class=\"btn-row\" style=\"margin-bottom:14px\">",
    "          <button class=\"btn primary\" onclick=\"zapiszPrzydzial()\">Zapisz przydział</button>",
    "          <a class=\"btn\" href=\"12-rejestr-aktywnosci.html\">Historia zmian w rejestrze aktywności</a>",
    "        </div>",
    "        <div class=\"note mb0\">",
    "          Konta instytucji szkoleniowych i ich handlowców nie występują w tej tabeli. Takie konto ma",
    "          dokładnie jedną instytucję, wybieraną w formularzu konta, i nie da się jej poszerzyć. Konto",
    "          administratora ma dostęp do wszystkich instytucji i nie da się tego odznaczyć.",
    "        </div>",
    "      </div>"
  ].join("\n");
}

function wstawPanele11() {
  document.getElementById("t3").innerHTML = trescMacierz11();
  document.getElementById("t4").innerHTML = trescPrzypisanie11();
}
