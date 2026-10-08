/* Konta i uprawnienia, zakladka 1: formularz konta (D-116). Zapis w 11-konta-uprawnienia-konto-zapis.js */
function poleTekstowe(idp, label, val, ro) {
  return '<label class="small" style="display:flex;flex-direction:column;gap:3px">' +
    '<span class="muted">' + label + '</span>' +
    '<input class="inp" id="uf_' + idp + '" value="' + esc(val) + '"' + (ro ? " readonly" : "") + '></label>';
}

function instytucjaKonta(login) {
  var r = Store.one("SELECT instytucja_id FROM uzytkownicy WHERE id = ?", [login]);
  return r ? r.instytucja_id : null;
}

function opcjeRol(rolaId) {
  return DB.ROLE.map(function (r) {
    return '<option value="' + esc(r.id) + '"' + (r.id === rolaId ? " selected" : "") + '>' + esc(r.nazwa) + '</option>';
  }).join("");
}
function opcjeInstytucji(instId) {
  return '<option value="">wybierz instytucję</option>' + DB.INSTYTUCJE.map(function (i) {
    return '<option value="' + esc(i.id) + '"' + (i.id === instId ? " selected" : "") + '>' + esc(i.nazwa) + '</option>';
  }).join("");
}

function userFormHTML(u, tytul) {
  var rolaId = u ? u.rolaId : DB.ROLE[0].id;
  var instId = u ? instytucjaKonta(u.login) : null;
  return '<div class="card mb0"><div class="card-body">' +
    '<div class="small strong" style="margin-bottom:10px">' + esc(tytul) + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      poleTekstowe("imie", "Imię i nazwisko", u ? u.imie : "", false) +
      poleTekstowe("login", "Login (e-mail)", u ? u.login : "", !!u) +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px"><span class="muted">Rola</span>' +
        '<select class="inp" id="uf_rola" onchange="przelaczPoleInstytucji()">' + opcjeRol(rolaId) + '</select></label>' +
      '<label class="small" style="display:flex;flex-direction:column;gap:3px" id="uf_instWrap">' +
        '<span class="muted">Instytucja (dokładnie jedna)</span>' +
        '<select class="inp" id="uf_inst">' + opcjeInstytucji(instId) + '</select></label>' +
      '<div class="small muted" id="uf_instHint" style="align-self:end">Przydział instytucji kont LDIT ustawiasz w zakładce Przypisanie do instytucji.</div>' +
      '<label class="small" style="display:flex;align-items:center;gap:8px;margin-top:6px">' +
        '<input type="checkbox" id="uf_2fa"' + (u && u["2fa"] ? " checked" : "") + '> Wymuszone 2FA</label>' +
    '</div>' +
    '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn primary sm" onclick="zapiszUsera()">Zapisz</button>' +
      '<button class="btn sm" onclick="zamknijUserForm()">Anuluj</button>' +
    '</div></div></div>';
}

function przelaczPoleInstytucji() {
  var jedna = czyRolaInstytucji(document.getElementById("uf_rola").value);
  document.getElementById("uf_instWrap").style.display = jedna ? "flex" : "none";
  document.getElementById("uf_instHint").style.display = jedna ? "none" : "block";
}
function otworzUserForm(u, tytul) {
  var el = document.getElementById("userForm");
  el.innerHTML = userFormHTML(u, tytul);
  el.style.display = "block";
  przelaczPoleInstytucji();
}
function zamknijUserForm() {
  var el = document.getElementById("userForm");
  el.style.display = "none"; el.innerHTML = ""; STAN_11.edytowany = null;
}
function edytujUsera(login) {
  STAN_11.edytowany = login;
  var u = DB.UZYTKOWNICY.filter(function (x) { return x.login === login; })[0];
  otworzUserForm(u, "Edycja konta: " + (u ? u.imie : login));
}
