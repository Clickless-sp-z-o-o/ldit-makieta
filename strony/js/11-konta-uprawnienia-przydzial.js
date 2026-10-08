/* Konta i uprawnienia, zakladka 4: przypisanie pracownikow LDIT do instytucji (siatka, jedyny edytor kont LDIT) */
function przydzialy() {
  var m = {};
  Store.query("SELECT uzytkownik_id, instytucja_id FROM uzytkownik_instytucja").forEach(function (r) {
    (m[r.uzytkownik_id] = m[r.uzytkownik_id] || []).push(r.instytucja_id);
  });
  return m;
}
function pracownicyLdit() {
  return DB.UZYTKOWNICY.filter(function (u) { var r = rolaPoId(u.rolaId); return r && r.typ === "pracownik"; });
}

function renderPrzydzial() {
  var inst = DB.INSTYTUCJE, przydzial = przydzialy();
  document.getElementById("hdrPrzyp").innerHTML =
    '<th>Pracownik LDIT</th>' +
    inst.map(function (i) { return '<th class="c" title="' + esc(i.nazwa) + '">' + esc(i.skrot) + '</th>'; }).join("") +
    '<th class="c">Razem</th>';

  document.getElementById("bodyPrzyp").innerHTML = pracownicyLdit().map(function (u) {
    var wsz = u.inst === "wszystkie", moje = przydzial[u.login] || [], n = 0;
    var kom = inst.map(function (i) {
      var on = wsz || moje.indexOf(i.id) >= 0;
      if (on) n++;
      return '<td class="c"><label class="chk"><input type="checkbox" class="pchk" data-u="' + esc(u.login) +
        '" data-i="' + esc(i.id) + '"' + (on ? " checked" : "") + (wsz ? " disabled" : "") + '></label></td>';
    }).join("");
    return '<tr><td class="strong">' + esc(u.imie) +
      '<div class="small muted">' + esc(u.rola) + (wsz ? ", przydział niekonfigurowalny" : "") + '</div></td>' +
      kom + '<td class="c"><span class="tag ' + (n === inst.length ? "set" : n ? "info" : "mute") + '">' +
      n + " z " + inst.length + '</span></td></tr>';
  }).join("");
}

function nazwyInstytucji(ids) {
  return ids.map(function (id) {
    var i = DB.INSTYTUCJE.filter(function (x) { return x.id === id; })[0];
    return i ? i.skrot : id;
  }).join(", ") || "brak";
}

function zapiszPrzydzialUsera(login, chce, ma) {
  ma.filter(function (id) { return chce.indexOf(id) < 0; }).forEach(function (id) {
    Store.exec("DELETE FROM uzytkownik_instytucja WHERE uzytkownik_id = ? AND instytucja_id = ?", [login, id]);
  });
  chce.filter(function (id) { return ma.indexOf(id) < 0; }).forEach(function (id) {
    Store.insert("uzytkownik_instytucja", { uzytkownik_id: login, instytucja_id: id });
  });
  wpiszAktywnosc("Zmiana uprawnień", login, "Przydział instytucji", nazwyInstytucji(ma), nazwyInstytucji(chce));
}

function zapiszPrzydzial() {
  var stan = przydzialy(), chce = {};
  document.querySelectorAll("#bodyPrzyp .pchk:not(:disabled)").forEach(function (c) {
    chce[c.dataset.u] = chce[c.dataset.u] || [];
    if (c.checked) chce[c.dataset.u].push(c.dataset.i);
  });
  var zmienione = Object.keys(chce).filter(function (login) {
    var ma = stan[login] || [];
    return ma.length !== chce[login].length || ma.some(function (id) { return chce[login].indexOf(id) < 0; });
  });
  zmienione.forEach(function (login) { zapiszPrzydzialUsera(login, chce[login], stan[login] || []); });
  window.alert(zmienione.length
    ? "Przydział zapisany dla kont: " + zmienione.length + ". Zmiany są w rejestrze aktywności."
    : "Brak zmian do zapisania.");
}
