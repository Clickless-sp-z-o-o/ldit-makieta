/* Ekran 20, czesc 2: panel szczegolow wybranego zgloszenia i decyzja (akceptacja,
   odrzucenie z powodem). Logika zapisu w assets/akceptacje.js. Same deklaracje. */

function wiersze20(pary) {
  return '<dl class="dl">' + pary.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + (r[1] || '<span class="muted">brak</span>') + "</dd>"; }).join("") + "</dl>";
}

function nazwaUrzedu20(id) {
  var p = DB.PUPY.filter(function (x) { return x.id === id; })[0];
  return p ? p.nazwa : id;
}

/* d: { rodzaj, isId, etykietaTak, opisTak, dodatkowe (np. zwrot do uzupelnienia), blokada (powod, gdy akceptacja niedostepna) }.
   Decyzje podejmuje opiekun instytucji albo administrator, zmiany instytucji i katalogu tylko administrator (D-330). */
function decyzja20(d) {
  if (!AkceptacjeUprawnienia.mozeRozpatrzyc(d.rodzaj, d.isId)) return '<div class="note mb0">Podgląd: ' + esc(AkceptacjeUprawnienia.powodOdmowy(d.rodzaj)) + '</div>';
  var tak = d.blokada ? '<button class="btn primary sm" disabled aria-describedby="blokada20">' + d.etykietaTak + '</button>'
    : '<button class="btn primary sm" onclick="zatwierdz20()">' + d.etykietaTak + '</button>';
  return '<div class="card mb0" style="margin-top:14px"><div class="card-body">' +
    '<div class="small muted" style="margin-bottom:8px">' + d.opisTak + '</div>' +
    (d.blokada ? '<div class="note warn mb0" id="blokada20" style="margin-bottom:8px">' + esc(d.blokada) + '</div>' : "") +
    '<div class="btn-row">' + tak + (d.dodatkowe || "") + '</div>' +
    '<label class="small" style="display:flex;flex-direction:column;gap:4px;margin-top:12px"><span class="muted">Powód odrzucenia (zobaczy instytucja)</span>' +
    '<textarea class="inp" id="powod" rows="2"></textarea></label>' +
    '<div class="btn-row" style="margin-top:8px"><button class="btn danger sm" onclick="odrzuc20()">Odrzuć</button></div>' +
    '<div class="small" id="komunikat20" role="status" style="margin-top:8px"></div></div></div>';
}

function zwrotFormularza20() {
  return '<button class="btn sm" onclick="zwroc20()" data-tip="Formularz wraca do instytucji z listą braków jako powodem. Schemat nie ma osobnego statusu zwrotu, więc zapisuje się jako odrzucony z powodem Niekompletne dane (D-269).">Zwróć do uzupełnienia</button>';
}

function rozpatrzenie20(r) {
  if (r.status === "oczekuje") return "";
  if (r.powod === Akceptacje.POWOD_WYCOFANIA) return '<div class="note mb0" style="margin-top:14px"><b>Wycofany przez instytucję do uzupełnienia</b>, ' +
    esc(DB.fmtDate(r.rozpatrzono || r.data)) + ". Wróci do akceptacji po zapisaniu poprawek.</div>";
  return '<div class="note mb0" style="margin-top:14px"><b>Rozpatrzone:</b> ' + esc(etykietaStatusu20(r)) + ", " + esc(DB.fmtDate(r.rozpatrzono)) +
    ", " + esc(imieKonta(r.rozpatrzyl)) + (r.powod ? "<br>Powód: " + esc(r.powod) : "") +
    (r.klientId ? '<br><a class="link-rekordu" href="' + esc(Nawigacja.adresKlienta(r.klientId)) + '">Karta klienta</a>' : "") + "</div>" +
    projektZFormularza20(r);
}

/* Akceptacja od razu zaklada projekt (D-328). Gdy sie nie udalo (np. szkolenia nie ma w katalogu), projekt
   zaklada sie ta sama sciezka co recznie, z danymi formularza (D-264 pkt 4) */
function projektZFormularza20(r) {
  if (r.status !== "zaakceptowany" || !r.klientId) return "";
  if (r.projektId) {
    return '<div class="small" style="margin-top:8px">Projekt z tego formularza: <a class="link-rekordu" href="' +
      esc(Nawigacja.adresKarty(r.projektId)) + '">' + esc(r.projektId) + "</a></div>";
  }
  if (!Auth.edytujeModul("dofin")) return "";
  var adres = Nawigacja.adresWnioskow({ nowyProjekt: r.klientId, formularz: r.id });
  return '<div class="btn-row" style="margin-top:10px"><a class="btn primary sm" href="' + esc(adres) +
    '" data-tip="Otwiera okno Nowy projekt, to samo co przy ręcznym zakładaniu, z klientem, urzędem, szkoleniem i uczestnikami z formularza (D-264).">Załóż projekt z formularza</a></div>';
}

/* NIP z formularza czesto ma literowke: zatwierdzajacy moze go poprawic przed akceptacja */
function poleNip20(f) {
  if (f.status !== "oczekuje" || !AkceptacjeUprawnienia.mozeRozpatrzyc("formularz", f.isId)) return '<span class="mono">' + esc(f.nip) + "</span>";
  var bledy = f.nip ? Walidacja.bledy("klienci", { nip: f.nip }) : [];
  return '<input class="inp mono" id="poprawNip" value="' + esc(f.nip) + '" style="width:160px">' +
    (bledy.length ? '<div class="small" style="color:var(--neg-ink)">' + esc(bledy[0].komunikat) + ', popraw przed akceptacją</div>' : "");
}

/* Klient o tym NIP jest juz w tej instytucji: akceptacja uzupelni go, nie utworzy drugiego.
   Ta sama firma w innej instytucji to osobny klient i nie jest tu pokazywana (D-282). */
function ostrzezenieDuplikatu20(f, duplikat) {
  var link = '<a class="link-rekordu" href="' + esc(Nawigacja.adresKlienta(duplikat)) + '">karta klienta</a>';
  return '<div class="note warn mb0" style="margin-top:12px">Klient o tym NIP już jest w tej instytucji: ' + link +
    '. Akceptacja uzupełni jego puste dane, nie utworzy drugiego rekordu.</div>';
}

function wartosc20(k, v) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return '<span class="muted">puste</span>';
  if (Array.isArray(v)) return esc(v.map(DB.fmtPLN).join(", "));
  return esc(k === "pup_id" ? nazwaUrzedu20(v) : v);
}

function panelZmiany20(p) {
  el20("tytulPanelu").textContent = p.is + ": " + opisRekordu20(p);
  el20("subPanelu").textContent = "zmiana " + p.id;
  var pola = p.tabela === "katalog_szkolen" ? AkceptacjeKatalog.POLA : Akceptacje.POLA[p.tabela] || {};
  var tabela = '<table class="tbl"><thead><tr><th>Pole</th><th>Teraz</th><th>Po zmianie</th></tr></thead><tbody>' +
    Object.keys(p.zmiany).map(function (k) {
      return "<tr><td class='strong'>" + esc(pola[k] || k) + "</td><td class='zmiana-przed'>" + wartosc20(k, p.zmiany[k].przed) +
        "</td><td><span class='zmiana-po'>" + wartosc20(k, p.zmiany[k].po) + "</span></td></tr>";
    }).join("") + "</tbody></table>";
  var link = p.tabela === "katalog_szkolen" ? '<a class="link-rekordu" href="06-instytucje.html' + esc(Nawigacja.zbudujZapytanie({ id: p.isId, zakladka: "p-katalog" })) + '">katalog instytucji</a>'
    : p.tabela === "klienci" ? '<a class="link-rekordu" href="' + esc(Nawigacja.adresKlienta(p.rekord)) + '">karta klienta</a>'
    : '<a class="link-rekordu" href="06-instytucje.html' + esc(Nawigacja.zbudujZapytanie({ id: p.rekord })) + '">karta instytucji</a>';
  el20("panel").innerHTML = wiersze20([
    ["Instytucja", esc(p.is)], ["Dotyczy", esc(opisRekordu20(p)) + " · " + link],
    ["Zgłosił", esc(imieKonta(p.zglosil)) + ", " + esc(DB.fmtDate(p.zgloszono))], ["Uzasadnienie", esc(p.uzasadnienie)]
  ]) + tabela +
  (p.status === "oczekuje" ? decyzja20({ rodzaj: p.tabela, isId: p.isId, etykietaTak: "Zatwierdź i wprowadź zmianę",
    opisTak: "Zatwierdzenie wprowadza nowe wartości do danych i zapisuje je w rejestrze aktywności." }) : rozpatrzenie20(p));
}

function renderPanel20() {
  var r = zrodlo20(STAN_20.widok).filter(function (x) { return x.id === STAN_20.wybrany; })[0];
  if (!r) {
    el20("tytulPanelu").textContent = "Szczegóły";
    el20("subPanelu").textContent = "";
    el20("panel").innerHTML = '<div class="empty"><div class="ei">&#10003;</div><div class="et">Wybierz zgłoszenie z listy</div>Kliknij wiersz, żeby zobaczyć szczegóły i podjąć decyzję.</div>';
    return;
  }
  if (STAN_20.widok === "formularze") panelFormularza20(r); else panelZmiany20(r);
  /* Wynik akceptacji (projekt zalozony albo powod, dla ktorego nie powstal) nad szczegolami, jednorazowo */
  if (STAN_20.komunikat) {
    el20("panel").insertAdjacentHTML("afterbegin", '<div class="note mb0" id="wynik20" role="status" style="margin-bottom:10px">' + esc(STAN_20.komunikat) + "</div>");
    STAN_20.komunikat = "";
  }
}

/* Blad decyzji (brak powodu, odmowa straznika, np. bledny NIP) pokazujemy przy przyciskach;
   inne bledy leca dalej */
function wykonaj20(akcja) {
  try { akcja(); }
  catch (e) {
    if (!(e instanceof Akceptacje.AkceptacjeError) && e.name !== "StraznikError") throw e;
    el20("komunikat20").textContent = e.message;
    el20("komunikat20").style.color = "var(--neg-ink)";
  }
}

function zatwierdz20() {
  wykonaj20(function () {
    if (STAN_20.widok === "formularze") {
      var nip = document.getElementById("poprawNip");
      var wynik = ProjektZFormularza.zaakceptujIZaloz(STAN_20.wybrany, Akceptacje.ktoTeraz(), nip ? { nip: nip.value.trim() } : null);
      STAN_20.komunikat = wynik.projekt.ok ? "Formularz zaakceptowany, założono projekt " + wynik.projekt.id + "."
        : "Formularz zaakceptowany. Projektu nie założono automatycznie: " + wynik.projekt.bledy.join(" ");
      render20();
    }
    else Akceptacje.zatwierdzZmiane(STAN_20.wybrany, Akceptacje.ktoTeraz());
  });
}

function zwroc20() {
  wykonaj20(function () { Akceptacje.zwrocFormularz(STAN_20.wybrany, Akceptacje.ktoTeraz()); });
}

function odrzuc20() {
  var powod = el20("powod").value;
  wykonaj20(function () {
    if (STAN_20.widok === "formularze") Akceptacje.odrzucFormularz(STAN_20.wybrany, powod, Akceptacje.ktoTeraz());
    else Akceptacje.odrzucZmiane(STAN_20.wybrany, powod, Akceptacje.ktoTeraz());
  });
}
