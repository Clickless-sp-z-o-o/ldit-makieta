/* Wspolne pola formularzy klienta i uczestnika klienta, bez zapisu (D-235, D-236).
   Uzywaja ich karta klienta (19) i Baza klientow (04). Pola maja id "<prefiks>_<nazwa>",
   a zbieranie zwraca nazwy kolumn z tabel klienci i uczestnicy_klienta. Nazwa skrocona idzie za pelna
   nazwa, dopoki nie zostanie skrocona recznie; przy NIP przycisk Pobierz dane z GUS (atrapa gusPobierz
   z 16-formularz-pola.js, tylko na stronach, ktore go laduja: karta klienta). Spotkanie 14.10.2026. */
(function (global) {
  "use strict";

  var STYL_POLA = 'style="display:flex;flex-direction:column;gap:3px"';
  var STYL_SIATKI = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:10px 0";
  var TAK_NIE = [["", "nie podano"], ["1", "tak"], ["0", "nie"]];
  var TAK_NIE_ZOB = [["", "nie podano"], ["tak", "TAK"], ["nie", "NIE"]];
  var TAK_NIE_UGODA = [["", "nie podano"], ["1", "TAK"], ["0", "NIE"]];

  function v(x) { return x == null ? "" : x; }
  function podpowiedz(tip) { return tip ? ' data-tip="' + global.esc(tip) + '"' : ""; }
  function pole(p, nazwa, etykieta, wartosc, typ, tip, dodatki) {
    var atrybuty = (typ === "number" ? ' min="0" step="1"' : "") + (dodatki || "");
    return '<label class="small" ' + STYL_POLA + podpowiedz(tip) + '><span class="muted">' + etykieta + '</span>' +
      '<input class="inp" id="' + p + "_" + nazwa + '" type="' + (typ || "text") + '"' + atrybuty + ' value="' + global.esc(v(wartosc)) + '"></label>';
  }
  function wybor(p, nazwa, etykieta, opcje, wartosc, tip) {
    return '<label class="small" ' + STYL_POLA + podpowiedz(tip) + '><span class="muted">' + etykieta + '</span>' +
      '<select class="inp" id="' + p + "_" + nazwa + '">' + opcje.map(function (o) {
        return '<option value="' + global.esc(o[0]) + '"' + (o[0] === wartosc ? " selected" : "") + ">" + global.esc(o[1]) + "</option>";
      }).join("") + '</select></label>';
  }
  function dane(p, nazwa) { var e = document.getElementById(p + "_" + nazwa); return e ? e.value : ""; }

  var TYPY_WEJSCIA = { tel: "tel", email: "email", liczba: "number" };

  /* Pole zwyklego typu na podstawie deklaracji z KlientPola */
  function poleDeklaracji(p, d, wiersz) {
    var wartosc = wiersz ? wiersz[d.kol] : null;
    if (d.typ === "wybor") return wybor(p, d.kol, d.etyk, d.opcje, v(wartosc), d.tip);
    if (d.typ === "pup") {
      var pupy = global.DB.PUPY.map(function (x) { return [x.id, x.nazwa]; });
      return wybor(p, d.kol, d.etyk, pupy, wiersz ? wiersz.pup_id : (pupy[0] || [])[0], d.tip);
    }
    if (d.typ === "tn") return wybor(p, d.kol, d.etyk, TAK_NIE, wartosc == null ? "" : String(wartosc), d.tip);
    if (d.kol === "nazwa_skrocona") {
      return pole(p, d.kol, d.etyk, wartosc, "text", d.tip, ' placeholder="kopiuje się z nazwy firmy" data-zrodlo="' + global.esc(v(wiersz && wiersz.nazwa)) + '"');
    }
    if (d.kol === "nip") return pole(p, d.kol, d.etyk, wartosc, "text", d.tip) + przyciskGus(p, typeof global.gusPobierz === "function");
    if (d.typ === "kolejny") {
      return '<label class="small" style="display:flex;gap:8px;align-items:center"' + podpowiedz(d.tip) + '><input type="checkbox" id="' + p +
        '_kolejny"' + (wiersz && wiersz.zainteresowany_naborem ? " checked" : "") + '> Zainteresowany kolejnym naborem</label>';
    }
    return pole(p, d.kol, d.etyk, wartosc, TYPY_WEJSCIA[d.typ] || "text", d.tip);
  }

  /* Zobowiazania: dwa pytania TAK/NIE, przy NIE pytanie o ugode jest ukryte (D-256, spotkanie 14.10).
     Stary rodzaj (ZUS, US) to TAK. */
  function zobowiazaniaHtml(p, wiersz) {
    var zad = wiersz ? wiersz.zadluzenie : null;
    var jestTak = global.KlientPola.tak(zad);
    var stan = !zad ? "" : jestTak ? "tak" : "nie";
    var ukryj = jestTak ? "" : ' style="display:none"';
    return wybor(p, "zob", "Czy firma posiada nieuregulowane zobowiązania?", TAK_NIE_ZOB, stan) +
      '<div data-zob="tak"' + ukryj + '>' + wybor(p, "zadluzenie_ugoda", "Czy zostało zawarte porozumienie bądź ugoda?", TAK_NIE_UGODA,
        wiersz && wiersz.zadluzenie_ugoda != null ? String(wiersz.zadluzenie_ugoda) : "") + '</div>';
  }

  /* ---------- Nazwa skrocona i dane z GUS (spotkanie 14.10) ---------- */
  function nadazSkrocona(p) {
    var s = document.getElementById(p + "_nazwa_skrocona"), n = document.getElementById(p + "_nazwa");
    if (!s || !n) return;
    if (!s.value.trim() || s.value === s.getAttribute("data-zrodlo")) s.value = n.value;
    s.setAttribute("data-zrodlo", n.value);
  }

  /* Bez gusPobierz na stronie (nowy klient w Bazie klientow, decyzja 15.10.2026) przycisk jest atrapa bez dzialania */
  function przyciskGus(p, dziala) {
    if (!dziala) {
      return '<div class="small kl-gus"><span class="muted">Dane firmy po NIP</span>' +
        '<button type="button" class="btn xs atrapa" data-tip="W aplikacji docelowej: nazwa, adres siedziby i miasto z rejestru REGON GUS po NIP.">Pobierz dane z GUS</button></div>';
    }
    return '<div class="small kl-gus"><span class="muted">Dane firmy po NIP</span>' +
      '<button type="button" class="btn xs" onclick="KlientFormularz.pobierzZGus(\'' + p + '\')" data-tip="Uzupełnia nazwę, adres siedziby i miasto. W aplikacji z rejestru REGON GUS, w makiecie atrapa.">Pobierz dane z GUS</button>' +
      '<div id="' + p + '_gusInfo" role="status"></div></div>';
  }

  /* Nazwa, adres i miasto z GUS nadpisuja pola (dalej edytowalne), zapis dopiero przyciskiem Zapisz */
  function pobierzZGus(p) {
    var wynik = global.gusPobierz(dane(p, "nip"));
    var info = document.getElementById(p + "_gusInfo");
    info.textContent = wynik.komunikat;
    info.style.color = wynik.ok ? "var(--pos-ink)" : "var(--neg-ink)";
    if (!wynik.ok) return;
    document.getElementById(p + "_nazwa").value = wynik.dane.nazwa;
    nadazSkrocona(p);
    if (wynik.dane.adres_siedziby) document.getElementById(p + "_adres_siedziby").value = wynik.dane.adres_siedziby;
    if (wynik.dane.miasto) document.getElementById(p + "_miasto").value = wynik.dane.miasto;
  }

  document.addEventListener("input", function (e) {
    if (e.target.id && /_nazwa$/.test(e.target.id)) nadazSkrocona(e.target.id.replace(/_nazwa$/, ""));
  });

  function sekcjaHtml(p, s, wiersz) {
    var pola = s.zob ? zobowiazaniaHtml(p, wiersz) : s.pola.map(function (d) { return poleDeklaracji(p, d, wiersz); }).join("");
    return '<details open data-sekcja="' + s.id + '" style="border-top:1px solid var(--line)"><summary class="small strong" style="cursor:pointer;padding:8px 0"' +
      podpowiedz(s.tip) + '>' + global.esc(s.tytul) + '</summary><div style="' + STYL_SIATKI + '">' + pola + '</div></details>';
  }

  /* Pelny formularz klienta w zwijanych sekcjach (D-256, D-257). wiersz = rekord z tabeli klienci albo null dla nowego klienta. */
  function klientHtml(p, wiersz) {
    return global.KlientPola.SEKCJE.map(function (s) { return sekcjaHtml(p, s, wiersz); }).join("");
  }

  /* Wartosci pol w nazwach kolumn tabeli klienci, gotowe dla KlientLogika.zapiszDaneKlienta */
  function zbierzKlienta(p) {
    var o = {};
    global.KlientPola.SEKCJE.forEach(function (s) {
      s.pola.forEach(function (d) {
        if (d.typ === "zob") return;
        if (d.typ === "kolejny") o.zainteresowany_naborem = document.getElementById(p + "_kolejny").checked;
        else o[d.kol] = dane(p, d.kol);
      });
    });
    var zob = dane(p, "zob");
    o.zadluzenie = zob === "nie" ? "brak" : zob === "tak" ? "tak" : "";
    o.zadluzenie_ugoda = zob === "tak" ? dane(p, "zadluzenie_ugoda") : "";
    return o;
  }

  /* Zmiana odpowiedzi o zobowiazaniach pokazuje albo ukrywa pytania dodatkowe, dla kazdego prefiksu formularza */
  document.addEventListener("change", function (e) {
    if (!e.target.id || !/_zob$/.test(e.target.id)) return;
    var sekcja = e.target.closest("[data-sekcja]");
    if (!sekcja) return;
    Array.prototype.forEach.call(sekcja.querySelectorAll("[data-zob]"), function (el) {
      el.style.display = e.target.value === "tak" ? "" : "none";
    });
  });

  /* PESEL pokazujemy tylko kontu z feature klient.pesel (dane wrazliwe) */
  function uczestnikHtml(p, u) {
    var rodzaje = [["", "wybierz"]].concat(global.KlientLogika.RODZAJE_ZATRUDNIENIA);
    var peselPole = global.Auth.moze("klient.pesel") ? pole(p, "pesel", "PESEL (wiek liczy się z niego)", u && u.pesel) : "";
    return pole(p, "imie", "Imię i nazwisko", u && u.imie) +
      wybor(p, "rodzaj", "Rodzaj zatrudnienia", rodzaje, u && u.zatrudnienie ? u.zatrudnienie : "") +
      pole(p, "do", "Termin zatrudnienia (do)", u && u.zatrudnienieDo, "date") +
      pole(p, "wyksz", "Wykształcenie", u && u.wyksztalcenie) + peselPole + pole(p, "zawod", "Zawód", u && u.zawod);
  }
  function zbierzUczestnika(p) {
    return {
      imie_nazwisko: dane(p, "imie"), rodzaj_zatrudnienia: dane(p, "rodzaj"), zatrudnienie_do: dane(p, "do"),
      wyksztalcenie: dane(p, "wyksz"), pesel: dane(p, "pesel"), zawod: dane(p, "zawod")
    };
  }

  global.KlientFormularz = {
    klientHtml: klientHtml, zbierzKlienta: zbierzKlienta, uczestnikHtml: uczestnikHtml, zbierzUczestnika: zbierzUczestnika,
    pobierzZGus: pobierzZGus
  };
})(window);
