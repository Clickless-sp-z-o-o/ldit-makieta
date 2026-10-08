/* Wysylka maili, zakladka 2, krok 2: ekran potwierdzenia i zapis do rejestru (D-106, D-122) */
function tabelaPotwierdzenia(lista) {
  return lista.map(function (w) {
    return "<tr><td class='strong'>" + esc(w.klNazwa) + "</td>" +
      "<td class='mono small'>" + esc(adresMaila(w) || "brak") + "</td>" +
      "<td><span class='pill'>" + esc(w.id) + "</span></td>" +
      "<td class='small muted'>" + esc(w.isNazwa) + "</td></tr>";
  }).join("");
}

function podsumowaniePotwierdzenia(lista, s) {
  return "<dt>Szablon</dt><dd>" + esc(s.nazwa) + "</dd>" +
    "<dt>Nadawca</dt><dd class='mono'>powiadomienia@ldit.pl</dd>" +
    "<dt>Liczba adresatów</dt><dd><b>" + lista.length + "</b></dd>" +
    "<dt>Kanał</dt><dd>e-mail <span class='tag mute'>SMS wyłączony</span></dd>" +
    "<dt>Zatwierdza</dt><dd>" + esc(Auth.sesja().imie) + "</dd>" +
    "<dt>Data</dt><dd>" + esc(new Date().toLocaleString("pl-PL")) + "</dd>";
}

function doKroku2() {
  var lista = wybrane();
  if (!lista.length) { alert("Nie wybrano żadnego adresata."); return; }
  var id = document.getElementById("wySzablon").value;
  var s = DB.SZABLONY.filter(function (x) { return x.id === id; })[0];

  document.getElementById("tbPotw").innerHTML = tabelaPotwierdzenia(lista);
  document.getElementById("potwPodsum").innerHTML = podsumowaniePotwierdzenia(lista, s);
  document.getElementById("wynikWysylki").innerHTML = "";
  document.getElementById("btnPotwierdz").disabled = false;
  document.getElementById("krok1").style.display = "none";
  document.getElementById("krok2").style.display = "block";
  document.getElementById("st1").classList.remove("on");
  document.getElementById("st2").classList.add("on");
}

function doKroku1() {
  document.getElementById("krok2").style.display = "none";
  document.getElementById("krok1").style.display = "block";
  document.getElementById("st2").classList.remove("on");
  document.getElementById("st1").classList.add("on");
}

function czasTeraz() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Kazdy adresat = jeden wpis typu "Wysylka maila" w rejestrze aktywnosci, autor z sesji (D-122) */
function potwierdz() {
  var lista = wybrane();
  var s = DB.SZABLONY.filter(function (x) { return x.id === document.getElementById("wySzablon").value; })[0];
  document.getElementById("btnPotwierdz").disabled = true;
  lista.forEach(function (w) {
    Store.insert("rejestr_aktywnosci", {
      czas: czasTeraz(), kto: Auth.sesja().imie, typ: "Wysyłka maila", obiekt: w.klient,
      pole: "Szablon", przed: "", po: s.nazwa
    }, "AKT-");
  });
  document.getElementById("wynikWysylki").innerHTML =
    '<div class="note mt16 mb0" style="border-left-color:var(--pos-ink);background:var(--pos-bg)">' +
    "<b>Zatwierdzono wysyłkę do " + lista.length + " adresatów.</b> Wpisy trafiły do rejestru aktywności.</div>";
}
