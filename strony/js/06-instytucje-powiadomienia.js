/* Ekran Instytucje: przelacznik "Wysylaj automatyczne powiadomienia do instytucji" (spotkanie 14.10.2026),
   kolumna instytucje.powiadomienia_auto, w widoku DB.INSTYTUCJE[i].powiadomieniaAuto. Przy wylaczonym
   automatyzacje z Wysylki maili nie wysylaja do instytucji nic (prosba o termin, przypomnienie przed
   szkoleniem). Przyklad: Metal Maniak ma kalendarz na caly rok, terminy wpisuje LDIT. Zmienia tylko rola
   z edycja modulu Instytucje (straznik), kazda zmiana trafia do rejestru aktywnosci. Tylko deklaracje. */

var OPIS_POWIADOMIEN_06 = "Prośba o ustalenie terminu po decyzji pozytywnej i przypomnienie przed szkoleniem. " +
  "Wyłączone: automatyzacje nic nie wysyłają do tej instytucji, mail ręczny z Wysyłki maili nadal można wysłać.";

function powiadomieniaWlaczone06(id) {
  var r = Store.find("instytucje", id);
  return !!r && r.powiadomienia_auto !== 0;
}

function tagPowiadomien06(wlaczone) {
  return wlaczone ? '<span class="tag pos dot">włączone</span>' : '<span class="tag mute dot">wyłączone</span>';
}

function czasZmiany06() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Zapis przelacznika z wpisem do rejestru. Zwraca nowy stan albo rzuca blad straznika. */
function przelaczPowiadomienia06(id, wlaczone) {
  var przed = powiadomieniaWlaczone06(id);
  if (przed === !!wlaczone) return przed;
  Store.update("instytucje", id, { powiadomienia_auto: wlaczone ? 1 : 0 });
  Store.insert("rejestr_aktywnosci", { czas: czasZmiany06(), kto: Auth.sesja().imie, typ: "Zmiana instytucji", obiekt: id,
    pole: "Automatyczne powiadomienia do instytucji", przed: przed ? "włączone" : "wyłączone", po: wlaczone ? "włączone" : "wyłączone",
    tabela: "instytucje", rekord_id: id }, "AKT-");
  return !!wlaczone;
}

/* Karta "Komunikacja z instytucja" w zakladce Konto instytucji: przelacznik dla roli edytujacej instytucje,
   dla pozostalych sam stan */
function renderPowiadomieniaIS06(i) {
  var box = el("powiadomieniaIS06");
  if (!box) return;
  var on = powiadomieniaWlaczone06(i.id), edycja = moznaEdytowac();
  box.innerHTML = '<div class="card mb0 komunikacja-is"><div class="card-head"><h3>Komunikacja z instytucją</h3></div><div class="card-body">' +
    (edycja
      ? '<label class="chk przelacznik-is"><input type="checkbox" id="przelPowiadomienia06"' + (on ? " checked" : "") + "> " +
        "<b>Wysyłaj automatyczne powiadomienia do instytucji</b></label>"
      : '<div><b>Automatyczne powiadomienia do instytucji:</b> ' + tagPowiadomien06(on) + "</div>") +
    '<div class="small muted" style="margin-top:6px">' + esc(OPIS_POWIADOMIEN_06) + "</div>" +
    '<div class="small" id="powiadomieniaKomunikat06" role="status" style="margin-top:6px"></div></div></div>';
  if (!edycja) return;
  el("przelPowiadomienia06").addEventListener("change", function () {
    var c = this, kom;
    try {
      var stan = przelaczPowiadomienia06(i.id, c.checked);
      /* Zapis przebudowuje ekran (db:changed), wiec komunikat trafia do nowej karty */
      kom = el("powiadomieniaKomunikat06");
      kom.textContent = stan ? "Automatyczne powiadomienia włączone." : "Automatyczne powiadomienia wyłączone. Automatyzacje pominą tę instytucję.";
      kom.style.color = "var(--pos-ink)";
    } catch (e) {
      if (e.name !== "StraznikError") throw e;
      c.checked = !c.checked;
      kom = el("powiadomieniaKomunikat06");
      kom.textContent = e.message;
      kom.style.color = "var(--neg-ink)";
    }
  });
}
