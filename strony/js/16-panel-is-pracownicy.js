/* Panel instytucji: pracownicy instytucji (D-126, D-318). Widzi i edytuje tylko Administrator IS:
   imie i nazwisko, rola (wylacznie role instytucji, nie sobie) i przypisanie klientow wraz z ich
   wnioskami. Kont nie dodaje, nie usuwa i nie blokuje: to administrator LDIT. Granice pilnuje
   StraznikWlasnosc.pracownicyInstytucji. Kazda zmiana w rejestrze aktywnosci. Same deklaracje. */

var PRACOWNICY_16 = { edytowany: null };

function adminInstytucji16() {
  return Auth.sesja().rola_typ === "instytucja" && Auth.moze("zakres.cala_instytucja") && Auth.edytujeModul("panelIS");
}

function pracownicyInstytucji16() {
  return Store.query("SELECT u.id, u.login, u.imie_nazwisko, u.rola_id, r.nazwa AS rola, u.ostatnie_logowanie, u.zablokowane, " +
    "(SELECT COUNT(*) FROM klienci k WHERE k.handlowiec_id = u.id) AS klientow " +
    "FROM uzytkownicy u JOIN role r ON r.id = u.rola_id WHERE u.instytucja_id = ? ORDER BY u.imie_nazwisko", [STAN_16.inst.id]);
}

function wierszPracownika16(p) {
  var ja = p.id === Auth.sesja().uzytkownik_id;
  return '<tr><td class="strong">' + esc(p.imie_nazwisko) + (ja ? ' <span class="tag mute">Ty</span>' : "") +
    '<div class="small muted">' + esc(p.login) + '</div></td><td>' + esc(p.rola) + '</td>' +
    '<td class="num">' + Number(p.klientow) + '</td><td class="small nowrap">' + esc(p.ostatnie_logowanie ? DB.fmtDate(p.ostatnie_logowanie) : "-") + '</td>' +
    '<td>' + (p.zablokowane ? '<span class="tag neg">zablokowane</span>' : '<span class="tag pos">aktywne</span>') + '</td>' +
    '<td class="right"><button class="btn xs" onclick="edytujPracownika16(\'' + escJs(p.id) + '\')" aria-label="Edytuj pracownika ' + esc(p.imie_nazwisko) + '">Edytuj</button></td></tr>';
}

function renderPracownicy16() {
  var karta = el16("kartaPracownikow16");
  if (!karta) return;
  karta.hidden = !adminInstytucji16();
  if (karta.hidden) return;
  el16("listaPracownikow16").innerHTML = wiersze16(pracownicyInstytucji16(), wierszPracownika16);
  if (!PRACOWNICY_16.edytowany) el16("edycjaPracownika16").innerHTML = "";
}

function opcjeRol16(p, ja) {
  var role = Store.query("SELECT id, nazwa FROM role WHERE typ = 'instytucja' ORDER BY nazwa");
  return '<select class="inp" id="rolaPracownika16"' + (ja ? " disabled" : "") + '>' + role.map(function (r) {
    return '<option value="' + esc(r.id) + '"' + (r.id === p.rola_id ? " selected" : "") + '>' + esc(r.nazwa) + '</option>';
  }).join("") + '</select>';
}

/* Klienci instytucji z zaznaczeniem tych przypisanych do edytowanego pracownika */
function listaKlientow16(p) {
  var nazwy = {};
  pracownicyInstytucji16().forEach(function (x) { nazwy[x.id] = x.imie_nazwisko; });
  var klienci = Store.query("SELECT id, nazwa, handlowiec_id FROM klienci WHERE instytucja_id = ? ORDER BY nazwa", [STAN_16.inst.id]);
  return klienci.map(function (k) {
    var inny = k.handlowiec_id && k.handlowiec_id !== p.id ? ' <span class="small muted">teraz: ' + esc(nazwy[k.handlowiec_id] || k.handlowiec_id) + '</span>' : "";
    return '<label class="small" style="display:flex;gap:6px;align-items:center;padding:2px 0"><input type="checkbox" class="klient-pracownika16" value="' + esc(k.id) + '"' +
      (k.handlowiec_id === p.id ? " checked" : "") + '>' + esc(k.nazwa) + inny + '</label>';
  }).join("");
}

function edytujPracownika16(id) {
  var p = pracownicyInstytucji16().filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  PRACOWNICY_16.edytowany = id;
  var ja = id === Auth.sesja().uzytkownik_id;
  el16("edycjaPracownika16").innerHTML = '<div class="card mb0" style="margin-top:12px"><div class="card-body">' +
    '<div class="small strong" style="margin-bottom:8px">Pracownik: ' + esc(p.login) + '</div>' +
    '<div class="grid g2"><label class="small">Imię i nazwisko<input class="inp" id="imiePracownika16" value="' + esc(p.imie_nazwisko) + '"></label>' +
    '<label class="small">Rola' + opcjeRol16(p, ja) + '</label></div>' +
    (ja ? '<div class="small muted">Roli własnego konta nie zmieniasz.</div>' : "") +
    '<div class="small strong" style="margin:12px 0 6px">Klienci przypisani do pracownika (razem z ich wnioskami)</div>' +
    '<div style="max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:6px;padding:6px 10px">' + listaKlientow16(p) + '</div>' +
    '<div class="btn-row" style="margin-top:10px"><button class="btn primary sm" onclick="zapiszPracownika16()">Zapisz</button>' +
    '<button class="btn sm" onclick="anulujPracownika16()">Anuluj</button></div>' +
    '<div class="small" id="komunikatPracownika16" role="status" style="margin-top:6px"></div></div></div>';
  el16("edycjaPracownika16").scrollIntoView({ block: "start" });
}

function anulujPracownika16() { PRACOWNICY_16.edytowany = null; el16("edycjaPracownika16").innerHTML = ""; }

function doRejestru16(kto, obiekt, pole, przed, po) {
  Store.insert("rejestr_aktywnosci", { czas: kto.czas, kto: kto.imie, typ: "Pracownicy instytucji", obiekt: obiekt, pole: pole,
    przed: przed == null || przed === "" ? "brak" : String(przed), po: po == null || po === "" ? "brak" : String(po) }, "AKT-");
}

/* Przypisanie klienta przenosi tez jego wnioski, bo handlowiec widzi wnioski po wnioski.handlowiec_id (D-210) */
function przypiszKlienta16(klientId, handlowiecId, kto) {
  Store.update("klienci", klientId, { handlowiec_id: handlowiecId });
  Store.query("SELECT id FROM wnioski WHERE klient_id = ?", [klientId]).forEach(function (w) {
    Store.update("wnioski", w.id, { handlowiec_id: handlowiecId });
  });
  doRejestru16(kto, klientId, "Pracownik klienta", null, handlowiecId || "brak");
}

function zmianyKonta16(p) {
  var zmiany = {};
  var imie = el16("imiePracownika16").value.trim();
  if (imie && imie !== p.imie_nazwisko) zmiany.imie_nazwisko = imie;
  var rola = el16("rolaPracownika16");
  if (!rola.disabled && rola.value !== p.rola_id) zmiany.rola_id = rola.value;
  return zmiany;
}

function zapiszPracownika16() {
  var id = PRACOWNICY_16.edytowany;
  var p = pracownicyInstytucji16().filter(function (x) { return x.id === id; })[0];
  var kto = Akceptacje.ktoTeraz();
  try {
    if (!el16("imiePracownika16").value.trim()) throw new Akceptacje.AkceptacjeError("brak_imienia", "Podaj imię i nazwisko pracownika.");
    var zmiany = zmianyKonta16(p);
    if (Object.keys(zmiany).length) {
      Store.update("uzytkownicy", id, zmiany);
      Object.keys(zmiany).forEach(function (k) { doRejestru16(kto, id, k, p[k], zmiany[k]); });
    }
    var klienci = Store.query("SELECT id, handlowiec_id FROM klienci WHERE instytucja_id = ?", [STAN_16.inst.id]);
    var zaznaczeni = Array.prototype.map.call(document.querySelectorAll(".klient-pracownika16:checked"), function (c) { return c.value; });
    klienci.forEach(function (k) {
      var ma = zaznaczeni.indexOf(k.id) >= 0;
      if (ma && k.handlowiec_id !== id) przypiszKlienta16(k.id, id, kto);
      else if (!ma && k.handlowiec_id === id) przypiszKlienta16(k.id, null, kto);
    });
    PRACOWNICY_16.edytowany = null;
    DB.przebuduj();
    renderPracownicy16();
  } catch (e) {
    if (!(e instanceof Akceptacje.AkceptacjeError) && e.name !== "StraznikError") throw e;
    el16("komunikatPracownika16").textContent = e.message;
    el16("komunikatPracownika16").style.color = "var(--neg-ink)";
  }
}
