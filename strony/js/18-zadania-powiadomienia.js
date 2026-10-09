/* Zadania i powiadomienia: powiadomienia systemu dla pracownikow i administratora (D-297),
   np. urzad z pliku naborow spoza slownika (D-272). "Zalatwione" zapisuje, kto i kiedy
   zamknal sprawe; wpis zostaje w bazie. Mail z adresu kilku klientow pracownik przypisuje
   recznie do jednego z nich, z tych w swoim zakresie (D-286). Tylko deklaracje. */

var ETYKIETY_POWIADOMIEN_18 = { nieznany_urzad: "Nieznany urząd w pliku naborów", mail_niejednoznaczny: "Mail do przypisania" };

/* Powiadomienie o mailu widzi tylko konto, ktore ma w zakresie choc jednego pasujacego klienta:
   tresc wymienia klienta, a pracownik innej instytucji nie moze sie o nim dowiedziec (D-148) */
function otwartePowiadomienia18() {
  return Store.query("SELECT * FROM powiadomienia WHERE instytucja_id IS NULL AND rozwiazano IS NULL ORDER BY utworzono DESC").filter(function (p) {
    if (p.rodzaj !== "mail_niejednoznaczny") return true;
    var mail = Store.find("korespondencja", p.rekord_id);
    return !!mail && kandydaciMaila18(mail).length > 0;
  });
}

function zamknijPowiadomienie18(id) {
  Store.update("powiadomienia", id, { rozwiazano: new Date().toISOString(), rozwiazal_id: Auth.sesja().uzytkownik_id });
}

/* Klienci z zakresu konta, do ktorych pasuje adres maila (zakres null = wszyscy klienci) */
function kandydaciMaila18(mail) {
  var zakres = Auth.klienciWZakresie();
  return Store.query("SELECT id, nazwa, instytucja_id FROM klienci WHERE email = ? OR email_firmy = ? ORDER BY nazwa", [mail.adres_email, mail.adres_email])
    .filter(function (k) { return zakres === null || zakres.indexOf(k.id) >= 0; });
}

function przypiszMail18(powId, klientId) {
  var p = Store.find("powiadomienia", powId), mail = p && Store.find("korespondencja", p.rekord_id);
  var klient = mail && kandydaciMaila18(mail).filter(function (k) { return k.id === klientId; })[0];
  if (!klient) return { ok: false, bledy: ["Wybierz klienta, do którego pasuje adres maila."] };
  Store.update("korespondencja", mail.id, { klient_id: klient.id, instytucja_id: klient.instytucja_id, przypisanie: "przypisany" });
  zamknijPowiadomienie18(powId);
  return { ok: true };
}

function wyborKlientaMaila18(p) {
  var mail = p.tabela === "korespondencja" ? Store.find("korespondencja", p.rekord_id) : null;
  if (!mail || mail.przypisanie !== "niejednoznaczny" || !Auth.edytujeModul("dofin")) return "";
  var opcje = kandydaciMaila18(mail).map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.nazwa + " (" + k.instytucja_id + ")") + "</option>"; }).join("");
  return '<div style="display:flex;gap:6px;margin-top:4px"><select class="inp" id="mailKlient_' + esc(p.id) + '" aria-label="Klient maila"><option value="">wybierz klienta</option>' + opcje + "</select>" +
    '<button class="btn xs" onclick="klikPrzypiszMail18(\'' + escJs(p.id) + '\')">Przypisz</button></div>';
}

function klikPrzypiszMail18(powId) {
  var wynik = przypiszMail18(powId, document.getElementById("mailKlient_" + powId).value);
  if (!wynik.ok) { window.alert(wynik.bledy.join(" ")); return; }
  renderPowiadomienia18();
}

/* Przejscie do miejsca, w ktorym sprawe sie zalatwia: slownik urzedow i nabory albo karty pasujacych klientow */
function linkiPowiadomienia18(p) {
  var linki = [];
  if (p.rodzaj === "nieznany_urzad") {
    if (Auth.widziModul("ustaw")) linki.push('<a href="11-konta-uprawnienia.html">Słownik urzędów w Ustawieniach</a>');
    if (Auth.widziModul("nabory")) linki.push('<a href="05-nabory.html">Nabory</a>');
  }
  if (p.rodzaj === "mail_niejednoznaczny") {
    var mail = Store.find("korespondencja", p.rekord_id);
    (mail ? kandydaciMaila18(mail) : []).forEach(function (k) {
      linki.push('<a href="19-klient.html?id=' + encodeURIComponent(k.id) + '">' + esc(k.nazwa) + "</a>");
    });
  }
  return linki.length ? '<div class="small" style="margin-top:4px">Przejdź: ' + linki.join(" · ") + "</div>" : "";
}

function renderPowiadomienia18() {
  var lista = otwartePowiadomienia18();
  document.getElementById("badgePow").textContent = lista.length || "";
  document.getElementById("listaPow").innerHTML = lista.length ? lista.map(function (p) {
    return '<div class="small" style="padding:8px 0;border-bottom:1px solid var(--line)">' +
      '<div class="strong">' + esc(ETYKIETY_POWIADOMIEN_18[p.rodzaj] || p.rodzaj) + ' <span class="muted">' + esc(DB.fmtDate(p.utworzono)) + "</span></div>" +
      "<div>" + esc(p.tresc) + "</div>" + linkiPowiadomienia18(p) + wyborKlientaMaila18(p) +
      (Auth.edytujeModul("zadania") ? '<button class="btn xs" style="margin-top:4px" onclick="zamknijPowiadomienie18(\'' + escJs(p.id) + '\')">Załatwione</button>' : "") +
      "</div>";
  }).join("") : '<div class="small muted">Brak otwartych powiadomień.</div>';
}
