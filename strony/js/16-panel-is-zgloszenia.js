/* Panel instytucji: zgloszenia do LDIT (tylko deklaracje).
   Instytucja i jej handlowiec dodaja formularz klienta do akceptacji (D-223) oraz
   zglaszaja zmiany danych instytucji i swoich klientow (D-224). Nic nie zmienia sie
   od razu: decyzje podejmuje pracownik LDIT albo administrator na ekranie Do akceptacji. */

var WIELKOSCI_16 = ["mikro", "mały", "średni", "duży", "inny"];

function pole16(id, etykieta, wartosc, typ) {
  return '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">' + etykieta + '</span>' +
    (typ === "textarea" ? '<textarea class="inp" id="' + id + '" rows="2">' + esc(wartosc) + '</textarea>'
      : '<input class="inp" id="' + id + '" value="' + esc(wartosc) + '"' + (typ ? ' type="' + typ + '"' : "") + '>') + '</label>';
}
function wybor16(id, etykieta, opcje, wybrana) {
  return '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">' + etykieta + '</span>' +
    '<select class="inp" id="' + id + '"><option value="">wybierz</option>' + opcje.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === wybrana ? " selected" : "") + '>' + esc(o[1]) + '</option>';
    }).join("") + '</select></label>';
}
function siatka16(pola) { return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + pola.join("") + '</div>'; }
function przyciski16(zapisz) {
  return '<div class="btn-row" style="margin-top:10px"><button class="btn primary sm" onclick="' + zapisz + '()">Wyślij do akceptacji LDIT</button>' +
    '<button class="btn sm" onclick="zamknijZgloszenie16()">Anuluj</button></div><div class="small" id="komunikat16" style="margin-top:6px"></div>';
}

function pokazFormularzKlienta16() {
  zfPokaz({
    kontener: "zgloszenieForm", instytucjaId: STAN_16.inst.id,
    szkolenia: STAN_16.SZ.map(function (x) { return [x.nazwa, x.nazwa]; }),
    poWyslaniu: function (nowy, braki) {
      el16("komunikatZgloszen").textContent = "Wysłano do akceptacji LDIT. " + tekstBrakowFormularza(braki);
      el16("komunikatZgloszen").style.color = braki.length ? "var(--neg-ink)" : "var(--pos-ink)";
    }
  });
}

/* Formularz zmiany: aktualne wartosci pol z Akceptacje.POLA, do propozycji trafia roznica */
function pokazZmiane16(tabela) {
  var klienci = STAN_16.KL.map(function (k) { return [k.id, k.nazwa]; });
  var naglowek = tabela === "instytucje" ? "Zmiana danych instytucji " + esc(STAN_16.inst.nazwa)
    : "Zmiana danych klienta " + wybor16("zmKlient", "Klient", klienci, "");
  el16("zgloszenieForm").innerHTML = '<div class="small strong" style="margin-bottom:8px">' + naglowek + '</div><div id="zmPola"></div>' +
    pole16("zmUzasadnienie", "Uzasadnienie", "", "textarea") + przyciski16(tabela === "instytucje" ? "wyslijZmianeInstytucji16" : "wyslijZmianeKlienta16");
  el16("zgloszenieForm").style.display = "";
  if (tabela === "instytucje") rysujPolaZmiany16("instytucje", STAN_16.inst.id);
  else el16("zmKlient").addEventListener("change", function () { rysujPolaZmiany16("klienci", this.value); });
}

function rysujPolaZmiany16(tabela, id) {
  var rekord = id ? Store.find(tabela, id) : null;
  var pola = Akceptacje.POLA[tabela];
  el16("zmPola").innerHTML = rekord ? siatka16(Object.keys(pola).map(function (k) {
    if (k === "pup_id") return wybor16("zm_" + k, pola[k], DB.PUPY.map(function (p) { return [p.id, p.nazwa]; }), rekord[k]);
    if (k === "wielkosc_przedsiebiorstwa") return wybor16("zm_" + k, pola[k], WIELKOSCI_16.map(function (w) { return [w, w]; }), rekord[k]);
    return pole16("zm_" + k, pola[k], rekord[k] == null ? "" : rekord[k], k === "opis_dzialalnosci" ? "textarea" : "");
  })) : "";
}

function noweWartosci16(tabela) {
  var nowe = {};
  Object.keys(Akceptacje.POLA[tabela]).forEach(function (k) { nowe[k] = el16("zm_" + k).value.trim(); });
  return nowe;
}

function wyslijZmianeInstytucji16() {
  wyslij16(function () {
    Akceptacje.zglosZmiane("instytucje", STAN_16.inst.id, STAN_16.inst.id, noweWartosci16("instytucje"),
                           el16("zmUzasadnienie").value.trim(), Akceptacje.ktoTeraz());
  });
}
function wyslijZmianeKlienta16() {
  var id = el16("zmKlient").value;
  wyslij16(function () {
    if (!id) throw new Akceptacje.AkceptacjeError("brak_klienta", "Wybierz klienta.");
    Akceptacje.zglosZmiane("klienci", id, STAN_16.inst.id, noweWartosci16("klienci"),
                           el16("zmUzasadnienie").value.trim(), Akceptacje.ktoTeraz());
  });
}

/* Komunikat o bledzie zgloszenia przy formularzu; po wyslaniu ekran odswieza sie z bazy */
function wyslij16(akcja) {
  try {
    akcja();
    zamknijZgloszenie16();
    el16("komunikatZgloszen").textContent = "Wysłano do akceptacji LDIT. Status zobaczysz w liście poniżej.";
  } catch (e) {
    if (!(e instanceof Akceptacje.AkceptacjeError) && e.name !== "StraznikError") throw e;
    el16("komunikat16").textContent = e.message;
    el16("komunikat16").style.color = "var(--neg-ink)";
  }
}
function zamknijZgloszenie16() { el16("zgloszenieForm").style.display = "none"; el16("zgloszenieForm").innerHTML = ""; }

/* Zwrot do uzupelnienia to odrzucenie z powodem zaczynajacym sie od Akceptacje.PREFIKS_ZWROTU (D-269) */
function tagStatusu16(status, powod) {
  var klasa = status === "oczekuje" ? "warn" : status === "zaakceptowany" || status === "zatwierdzona" ? "pos" : "neg";
  var zwrot = status === "odrzucony" && powod && powod.indexOf(Akceptacje.PREFIKS_ZWROTU) === 0;
  return '<span class="tag ' + klasa + ' dot">' + esc(zwrot ? "zwrócony do uzupełnienia" : status) + '</span>';
}

function renderMojeZgloszenia16() {
  var formularze = DB.KOLEJKA.filter(function (k) { return k.isId === STAN_16.inst.id; })
    .map(function (k) { return { data: k.data, co: "Klient: " + k.firma, status: k.status, powod: k.powod }; });
  var zmiany = DB.PROPOZYCJE.filter(function (p) { return p.isId === STAN_16.inst.id; }).map(function (p) {
    return { data: p.zgloszono, co: "Zmiana " + (p.tabela === "instytucje" ? "danych instytucji" : "danych klienta") + ": " +
      Object.keys(p.zmiany).map(function (k) { return Akceptacje.POLA[p.tabela][k] || k; }).join(", "), status: p.status, powod: p.powod };
  });
  var lista = formularze.concat(zmiany).sort(function (a, b) { return b.data < a.data ? -1 : 1; });
  el16("mojeZgloszenia").innerHTML = lista.length ? lista.map(function (z) {
    return '<tr><td class="small nowrap mono">' + esc(DB.fmtDate(z.data)) + '</td><td>' + esc(z.co) +
      (z.powod ? '<div class="small" style="color:var(--neg-ink)">Powód: ' + esc(z.powod) + '</div>' : "") + '</td><td>' + tagStatusu16(z.status, z.powod) + '</td></tr>';
  }).join("") : '<tr><td colspan="3" class="small muted">Brak zgłoszeń wysłanych z panelu.</td></tr>';
}

function podepnijZgloszenia16() {
  var formularze = Auth.moze("formularze.zglaszanie"), zmiany = Auth.moze("zmiany.zglaszanie");
  el16("kartaZgloszen").hidden = !formularze && !zmiany;
  el16("btnZglosKlienta").hidden = !formularze;
  el16("btnZmianaInstytucji").hidden = !zmiany || Auth.handlowiec() !== null;
  el16("btnZmianaKlienta").hidden = !zmiany;
  renderMojeZgloszenia16();
  window.addEventListener("db:changed", renderMojeZgloszenia16);
}
