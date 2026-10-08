/* Wysylka maili, zakladka 3: przelacznik "Automatyczna prosba o ustalenie terminu" per instytucja (D-247).
   Zapis do instytucje.mail_prosba_o_termin przez Store.update. Instytucje z terminem z gory
   dostaja tylko potwierdzenie po decyzji pozytywnej. Tylko deklaracje. */
var MODEL_Z_GORY = "z_gory";

function czyProsbaWlaczona(instytucjaId) {
  var r = Store.find("instytucje", instytucjaId);
  return !!r && r.mail_prosba_o_termin !== 0;
}

function przelaczProsbeOTermin(instytucjaId, wlaczona) {
  Store.update("instytucje", instytucjaId, { mail_prosba_o_termin: wlaczona ? 1 : 0 });
  renderProsbaTermin();
}

function wierszProsbyOTermin(i, edycja) {
  var on = czyProsbaWlaczona(i.id);
  var zGory = i.modelTerminow === MODEL_Z_GORY;
  return "<tr><td class=\"strong\">" + esc(i.nazwa) + "</td>" +
    "<td class=\"small\">" + (zGory ? "termin z góry (tylko potwierdzenie po decyzji pozytywnej)" : "kalendarz instytucji") + "</td>" +
    "<td class=\"c\"><label class=\"switch\"><input type=\"checkbox\" id=\"pt_" + esc(i.id) + "\" data-id=\"" + esc(i.id) + "\"" +
    (on ? " checked" : "") + (edycja ? "" : " disabled") + "> " + (on ? "włączona" : "wyłączona") + "</label></td></tr>";
}

function renderProsbaTermin() {
  var box = document.getElementById("prosbaTerminBox");
  if (!box) return;
  var edycja = Auth.edytujeModul("komun");
  box.innerHTML = "<div class=\"card\"><div class=\"card-head\"><h3>Automatyczna prośba o ustalenie terminu</h3>" +
    "<span class=\"sub\">per instytucja <span class=\"ref\">D-247</span></span></div><div class=\"card-body tight\">" +
    "<div class=\"note mb0\" style=\"margin:12px\">Po decyzji pozytywnej automat wysyła prośbę o ustalenie terminu tylko do instytucji z włączonym przełącznikiem. " +
    "Instytucje, które mają termin z góry, dostają wyłącznie potwierdzenie po decyzji pozytywnej. " +
    "Rezygnujemy z alertów dla uczestników szkolenia (to po stronie instytucji) i z komunikatu „wniosek w trakcie przygotowania”. Zostają instrukcje, a alert można dodać ręcznie.</div>" +
    "<table class=\"tbl\"><thead><tr><th>Instytucja</th><th>Model terminów</th><th class=\"c\">Prośba o termin</th></tr></thead><tbody>" +
    DB.INSTYTUCJE.map(function (i) { return wierszProsbyOTermin(i, edycja); }).join("") + "</tbody></table></div></div>";
  Array.prototype.forEach.call(box.querySelectorAll("input[data-id]"), function (c) {
    c.addEventListener("change", function () { przelaczProsbeOTermin(c.getAttribute("data-id"), c.checked); });
  });
}
