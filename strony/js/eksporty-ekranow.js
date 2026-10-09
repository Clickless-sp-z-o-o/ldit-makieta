/* Eksporty ekranow LDIT do CSV i Excela (D-317), przez assets/eksport.js. Na stronie wystarczy
   <span class="eksport-ekranu" data-pozycje="wnioski,klienci"></span>: po starcie strony powstaje tam
   menu Eksport z pozycjami, do ktorych konto ma uprawnienia (bez zadnej pozycji menu znika).
   Eksport bierze biezacy widok ekranu (te same funkcje filtrow co tabela), wiec obejmuje
   tylko dane z zakresu konta. Kwoty wnioskow z finanse.kwoty_wniosku, prowizje i faktury
   z finanse.prowizja, dane klientow z klienci.eksport. Same deklaracje i jedno KFS.gotowe. */

function kwotyWniosku_E() { return Auth.moze("finanse.kwoty_wniosku"); }

function kolumnyWnioskow_E() {
  var k = [{ k: "nr", n: "Numer" }, { k: "klient", n: "Klient" }, { k: "nip", n: "NIP" }, { k: "is", n: "Instytucja" }, { k: "urzad", n: "Urząd pracy" },
    { k: "szkolenia", n: "Szkolenia" }, { k: "osob", n: "Osób" }, { k: "status", n: "Status" }, { k: "etap", n: "Etap" },
    { k: "przygotowal", n: "Przygotował" }, { k: "wykonawca", n: "Wykonawca" }, { k: "data", n: "Data wniosku" }];
  return kwotyWniosku_E() ? k.concat([{ k: "wartosc", n: "Wartość wnioskowana" }, { k: "przyznano", n: "Przyznano" },
    { k: "wklad", n: "Wkład własny" }, { k: "koszt", n: "Koszt całkowity z dopłatą" }]) : k;
}

function wierszWniosku_E(w) {
  return { nr: w.nr, klient: w.klNazwa, nip: w.nip, is: w.isNazwa, urzad: w.pupNazwa, osob: w.osob, etap: w.etap,
    szkolenia: (w.szkoleniaWniosku || []).map(function (s) { return s.nazwa; }).join(", "),
    status: [w.statusSkl, w.statusDec, w.rozliczenie].filter(Boolean).join(", "), przygotowal: w.przygotowal, wykonawca: w.wykonawca,
    data: DB.fmtDate(w.dataWniosku), wartosc: w.kwotaWnioskowana, przyznano: w.przyznano, wklad: w.wklad, koszt: w.kosztZDoplata };
}

var EKSPORTY_EKRANOW = {
  wnioski: { etykieta: "Wnioski (widok listy)", wymaga: "klienci.eksport",
    dane: function () { return { kolumny: kolumnyWnioskow_E(), wiersze: filtrujWnioski().map(wierszWniosku_E) }; } },
  klienci: { etykieta: "Klienci (widok listy)", wymaga: "klienci.eksport",
    dane: function () {
      return { kolumny: [{ k: "nr", n: "Numer" }, { k: "nazwa", n: "Nazwa" }, { k: "nip", n: "NIP" }, { k: "miasto", n: "Miasto" },
        { k: "osoba", n: "Osoba kontaktowa" }, { k: "tel", n: "Telefon" }, { k: "mail", n: "E-mail" }, { k: "wielkosc", n: "Wielkość" }, { k: "nabor", n: "Nabór" }],
        wiersze: filtrujKlientow().map(function (r) {
          var k = r.kl;
          return { nr: k.nr, nazwa: k.nazwa, nip: k.nip, miasto: k.miasto, osoba: k.osoba, tel: k.tel, mail: k.mail, wielkosc: k.wielkosc, nabor: r.status };
        }) };
    } },
  nabory: { etykieta: "Nabory w urzędach",
    dane: function () {
      return { kolumny: [{ k: "pup", n: "Urząd pracy" }, { k: "woj", n: "Województwo" }, { k: "rodzaj", n: "Rodzaj" }, { k: "status", n: "Status" },
        { k: "od", n: "Od" }, { k: "do", n: "Do" }, { k: "srodki", n: "Środki" }, { k: "prognoza", n: "Prognoza" }, { k: "link", n: "Link" }],
        wiersze: STAN_05.N.map(function (n) {
          return { pup: n.pup, woj: n.woj, rodzaj: n.rodzaj, status: n.status, od: DB.fmtDate(n.od), do: DB.fmtDate(n.do), srodki: n.srodki, prognoza: n.prognoza, link: n.link };
        }) };
    } },
  instytucje: { etykieta: "Instytucje (widok listy)",
    dane: function () {
      return { kolumny: [{ k: "nazwa", n: "Nazwa" }, { k: "nip", n: "NIP" }, { k: "miasto", n: "Miasto" }, { k: "kontakt", n: "Osoba kontaktowa" },
        { k: "tel", n: "Telefon" }, { k: "mail", n: "E-mail" }, { k: "opiekunowie", n: "Opiekunowie" }],
        wiersze: widoczne().map(function (i) {
          return { nazwa: i.nazwa, nip: i.nip, miasto: i.miasto, kontakt: i.kontakt, tel: i.tel, mail: i.mail, opiekunowie: (i.opiekunowie || []).join(", ") };
        }) };
    } },
  zgloszenia: { etykieta: "Zgłoszenia (widok listy)",
    dane: function () {
      return { kolumny: [{ k: "data", n: "Data" }, { k: "podmiot", n: "Podmiot" }, { k: "typ", n: "Typ" }, { k: "powod", n: "Powód" },
        { k: "opis", n: "Opis" }, { k: "autor", n: "Autor" }, { k: "waga", n: "Waga" }],
        wiersze: widoczneZgloszenia10().map(function (z) {
          return { data: DB.fmtDate(z.data), podmiot: z.podmiot, typ: z.typ, powod: z.powod, opis: z.opis, autor: z.autor, waga: z.waga };
        }) };
    } },
  skutecznosc: { etykieta: "Skuteczność pracowników",
    dane: function () {
      var rok = document.getElementById("okres") ? document.getElementById("okres").value : String(new Date().getFullYear());
      return { kolumny: [{ k: "imie", n: "Pracownik" }, { k: "rok", n: "Rok" }, { k: "przygotowane", n: "Przygotowane" },
        { k: "pozytywne", n: "Pozytywne" }, { k: "negatywne", n: "Negatywne" }, { k: "proc", n: "Skuteczność %" }],
        wiersze: DB.SKUTECZNOSC.filter(function (r) { return String(r.rok) === String(rok); }) };
    } },
  prowizje: { etykieta: "Prowizje per instytucja", wymaga: "finanse.prowizja",
    dane: function () {
      return { kolumny: [{ k: "is", n: "Instytucja" }, { k: "n", n: "Wniosków" }, { k: "obrot", n: "Obrót" }, { k: "prow", n: "Prowizja" }, { k: "rozl", n: "Rozliczono" }],
        wiersze: wierszeProwizji(document.getElementById("okres").value).map(function (r) {
          return { is: r.inst.nazwa, n: r.n, obrot: r.obrot, prow: r.prow, rozl: r.rozl };
        }) };
    } },
  faktury: { etykieta: "Faktury", wymaga: "finanse.prowizja",
    dane: function () {
      return { kolumny: [{ k: "nr", n: "Numer" }, { k: "is", n: "Instytucja" }, { k: "kwota", n: "Kwota" }, { k: "vat", n: "VAT" },
        { k: "wystawiona", n: "Wystawiona" }, { k: "termin", n: "Termin płatności" }, { k: "status", n: "Status" }],
        wiersze: DB.FAKTURY.map(function (f) {
          return { nr: f.nr, is: f.is, kwota: f.kwota, vat: f.vat, wystawiona: DB.fmtDate(f.wystawiona), termin: DB.fmtDate(f.termin), status: f.status };
        }) };
    } }
};

function eksportEkranu(klucz, format) {
  var d = EKSPORTY_EKRANOW[klucz];
  if (d.wymaga && !Auth.moze(d.wymaga)) return;
  var dane = d.dane();
  Eksport.pobierz({ nazwa: klucz, kolumny: dane.kolumny, wiersze: dane.wiersze, format: format, arkusz: d.etykieta, opis: d.etykieta });
}

function podepnijEksportyEkranu() {
  Array.prototype.forEach.call(document.querySelectorAll(".eksport-ekranu"), function (miejsce, i) {
    var pozycje = miejsce.getAttribute("data-pozycje").split(",").filter(function (k) {
      var d = EKSPORTY_EKRANOW[k];
      return d && (!d.wymaga || Auth.moze(d.wymaga));
    }).map(function (k) { return { klucz: k, etykieta: EKSPORTY_EKRANOW[k].etykieta }; });
    miejsce.hidden = !pozycje.length;
    miejsce.innerHTML = pozycje.length ? Eksport.menuHtml("menuEksportu" + i, pozycje, "eksportEkranu") : "";
  });
}

if (window.KFS && KFS.gotowe) KFS.gotowe(podepnijEksportyEkranu);
