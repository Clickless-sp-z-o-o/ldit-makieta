/* Wysylka maili, zakladka 2, krok 3: ekran potwierdzenia (D-106) i jedna wysylka serii.
   Kazdy wyslany mail trafia do historii: korespondencja klienta (temat, adres, data) i rejestr
   aktywnosci z pelna trescia i wspolnym identyfikatorem wysylki (partia, D-122). Tylko deklaracje. */
var NADAWCA_09 = "powiadomienia@ldit.pl";

function tabelaPotwierdzenia(lista) {
  return lista.map(function (m) {
    var w = DB.WNIOSKI_WSZYSTKIE.filter(function (x) { return x.id === m.wniosekId; })[0] || {};
    return "<tr><td class='strong'>" + esc(m.klNazwa) + "</td>" +
      "<td class='mono small'>" + esc(m.do) + "</td>" +
      "<td class='small'>" + esc(m.temat) + (m.edytowany ? " <span class='tag info'>poprawiony</span>" : "") + "</td>" +
      "<td><span class='pill'>" + esc(m.nr) + "</span></td>" +
      "<td class='small muted'>" + esc(w.isNazwa || "") + "</td></tr>";
  }).join("");
}

function podsumowaniePotwierdzenia(lista, s) {
  return "<dt>Szablon</dt><dd>" + esc(s.nazwa) + "</dd>" +
    "<dt>Nadawca</dt><dd class='mono'>" + NADAWCA_09 + "</dd>" +
    "<dt>Liczba maili</dt><dd><b>" + lista.length + "</b> (wyłączonych: " + (SERIA_09.maile.length - lista.length) + ")</dd>" +
    "<dt>Poprawione ręcznie</dt><dd>" + lista.filter(function (m) { return m.edytowany; }).length + "</dd>" +
    "<dt>Kanał</dt><dd>e-mail <span class='tag mute'>SMS wyłączony</span></dd>" +
    "<dt>Zatwierdza</dt><dd>" + esc(Auth.sesja().imie) + "</dd>" +
    "<dt>Data</dt><dd>" + esc(new Date().toLocaleString("pl-PL")) + "</dd>";
}

function doKroku3() {
  var lista = doWyslania09();
  if (!lista.length) { alert("Wszystkie maile są wyłączone z wysyłki."); return; }
  var s = szablon09(SERIA_09.szablonId);
  document.getElementById("tbPotw").innerHTML = tabelaPotwierdzenia(lista);
  document.getElementById("potwPodsum").innerHTML = podsumowaniePotwierdzenia(lista, s);
  document.getElementById("wynikWysylki").innerHTML = "";
  document.getElementById("btnPotwierdz").disabled = false;
  document.getElementById("btnWrocDoPodgladu").disabled = false;
  pokazKrok09(3);
}

function czasTeraz() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Jeden mail: wpis w korespondencji klienta i w rejestrze aktywnosci z trescia */
function zapiszMail09(m, s, partia) {
  var czas = czasTeraz();
  var kor = Store.insert("korespondencja", { klient_id: m.klientId, instytucja_id: m.isId, data: czas, kierunek: "wychodzacy",
    od_kogo: NADAWCA_09, temat: m.temat, skrzynka: NADAWCA_09, zalaczniki: 0, adres_email: m.do, przypisanie: "przypisany" }, "KOR-");
  Store.insert("rejestr_aktywnosci", { czas: czas, kto: Auth.sesja().imie, typ: "Wysyłka maila", obiekt: m.klientId,
    pole: "Mail (" + s.nazwa + "): " + m.temat, przed: m.do, po: m.tresc, partia: partia, tabela: "korespondencja", rekord_id: kor.id }, "AKT-");
  return kor.id;
}

function postepWysylki09(zrobione, wszystkie) {
  document.getElementById("wynikWysylki").innerHTML = '<div class="note mt16 mb0" role="status">Wysyłanie: ' + zrobione + " z " + wszystkie + "...</div>";
}

/* Jedna wysylka calej serii. Maile ida po kolei, ekran pokazuje postep. Zwraca Promise z liczba wyslanych. */
function potwierdz() {
  var lista = doWyslania09(), s = szablon09(SERIA_09.szablonId);
  var partia = "WYS-" + czasTeraz().replace(/\D/g, "") + "-" + Auth.sesja().uzytkownik_id;
  document.getElementById("btnPotwierdz").disabled = true;
  document.getElementById("btnWrocDoPodgladu").disabled = true;
  return new Promise(function (gotowe) {
    var i = 0;
    function nastepny() {
      if (i < lista.length) {
        zapiszMail09(lista[i], s, partia);
        i++;
        postepWysylki09(i, lista.length);
        setTimeout(nastepny, 0);
        return;
      }
      Store.update("szablony_maili", s.id, { uzyc: (s.uzyc || 0) + lista.length });
      document.getElementById("wynikWysylki").innerHTML =
        '<div class="note mt16 mb0" role="status" style="border-left-color:var(--pos-ink);background:var(--pos-bg)">' +
        "<b>Wysłano " + lista.length + " " + (lista.length === 1 ? "mail" : "maili") + ".</b> Każdy jest w korespondencji klienta " +
        "i w rejestrze aktywności razem z treścią. <button class=\"btn xs\" onclick=\"doKroku1();renderOdb()\">Nowa wysyłka</button></div>";
      SERIA_09.maile = [];
      gotowe(lista.length);
    }
    nastepny();
  });
}
