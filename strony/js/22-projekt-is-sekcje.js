/* Ekran 22: sekcje widoku projektu i klienta dla instytucji, tylko do odczytu (D-319).
   Dane pochodza z warstwy zakresu (DB.*): handlowiec widzi tylko swoich klientow, PESEL bez
   funkcji klient.pesel i kwoty bez finanse.kwoty_wniosku sa juz wyczyszczone, prowizji nie ma
   nigdy (D-07). Zapytania do tabel podrzednych ida po wniosku sprawdzonym w zakresie i po
   instytucji konta. Same deklaracje. */

var BRAK_22 = '<span class="muted">-</span>';

function karta22(tytul, sub, tresc) {
  return '<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>' + esc(tytul) + "</h3>" +
    (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") + '</div><div class="card-body tight">' + tresc + "</div></div>";
}

function pole22(etykieta, wartosc) {
  return "<dt>" + esc(etykieta) + "</dt><dd>" + (wartosc == null || wartosc === "" ? BRAK_22 : wartosc) + "</dd>";
}

function tabela22(naglowki, wiersze, pusty) {
  if (!wiersze.length) return '<div class="empty" style="padding:16px"><div class="et">' + esc(pusty) + "</div></div>";
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + naglowki.map(function (n) { return "<th>" + esc(n) + "</th>"; }).join("") +
    "</tr></thead><tbody>" + wiersze.join("") + "</tbody></table></div>";
}

function statusProjektu22(w) {
  if (w.statusDec === "Pozytywna") return "decyzja pozytywna";
  if (w.statusDec === "Negatywna") return "decyzja negatywna";
  if (w.statusSkl === "Złożony") return "oczekuje na decyzję";
  return w.statusSkl ? w.statusSkl.toLowerCase() : "niezłożony";
}

function sekcjaDanych22(w) {
  var kwoty = Auth.moze("finanse.kwoty_wniosku") ? pole22("Wartość wnioskowana", w.kwotaWnioskowana != null ? esc(DB.fmtPLN(w.kwotaWnioskowana)) : null) +
    pole22("Przyznano", w.przyznano != null ? esc(DB.fmtPLN(w.przyznano)) : null) + pole22("Wkład własny", w.wklad != null ? esc(DB.fmtPLN(w.wklad)) : null) : "";
  return karta22("Dane projektu", "", '<dl class="dl" style="padding:12px 16px">' +
    pole22("Numer", '<span class="mono">' + esc(w.nr || w.id) + "</span>") +
    pole22("Klient", '<a href="22-projekt-is.html?klient=' + encodeURIComponent(w.klient) + '">' + esc(w.klNazwa) + "</a>") +
    pole22("Urząd pracy", esc(w.pupNazwa || "")) + pole22("Status", esc(statusProjektu22(w))) +
    pole22("Etap", w.etap ? esc(w.etap + ". " + (Statusy.ETAPY[w.etap] || "")) : null) + pole22("Rozliczenie", esc(w.rozliczenie || "")) +
    pole22("Data formularza", esc(DB.fmtDate(w.dataFormularza) || "")) + pole22("Data złożenia", esc(DB.fmtDate(w.dataWniosku) || "")) +
    pole22("Wykonawca", esc(w.wykonawca || "")) + kwoty + "</dl>");
}

function terminTekst22(id) {
  var t = DB.TERMINY.filter(function (x) { return x.id === id; })[0];
  return t ? esc(DB.fmtDate(t.od)) + " &rsaquo; " + esc(DB.fmtDate(t.do)) : '<span class="muted">termin nieustalony</span>';
}

function sekcjaSzkolen22(w) {
  var wiersze = (w.szkoleniaWniosku || []).map(function (s) {
    var osob = w.uczestnicy.filter(function (u) { return u.wniosekSzkolenie === s.id; }).length;
    return "<tr><td>" + esc(s.nazwa) + '</td><td class="num">' + osob + "</td></tr>";
  });
  return karta22("Szkolenia projektu", "", tabela22(["Szkolenie", "Uczestników"], wiersze, "Projekt nie ma jeszcze szkoleń."));
}

/* PESEL: null oznacza brak uprawnienia (zakres wyczyscil) albo brak w danych */
function pesel22(u) {
  if (u.pesel) return '<span class="mono">' + esc(u.pesel) + "</span>";
  return Auth.moze("klient.pesel") ? BRAK_22 : '<span class="muted">ukryty</span>';
}

function sekcjaUczestnikow22(w) {
  var wiersze = w.uczestnicy.map(function (u) {
    return "<tr><td class=\"strong\">" + esc(u.imie) + "</td><td>" + pesel22(u) + "</td><td>" + esc(u.szkNazwa || "") + "</td>" +
      '<td class="nowrap small">' + terminTekst22(u.termin) + "</td><td>" + esc(u.status || "") +
      (u.powod ? '<div class="small muted">' + esc(u.powod) + "</div>" : "") + "</td></tr>";
  });
  return karta22("Uczestnicy", w.uczestnicy.length + " os.", tabela22(["Osoba", "PESEL", "Szkolenie", "Termin", "Kwalifikacja"], wiersze, "Projekt nie ma uczestników."));
}

function znacznik22(tak, etykieta) {
  return '<span class="tag ' + (tak ? "pos" : "mute") + ' dot">' + esc(etykieta) + ": " + (tak ? "tak" : "nie") + "</span> ";
}

/* Certyfikaty i przebieg czytamy tylko dla wniosku z zakresu i tylko w instytucji konta */
function sekcjaDokumentow22(w) {
  var cert = Store.query("SELECT c.numer, c.wystawiono, uk.imie_nazwisko FROM certyfikaty c JOIN uczestnik_szkolenia s ON s.id = c.uczestnik_szkolenie_id " +
    "JOIN uczestnicy u ON u.id = s.uczestnik_id JOIN uczestnicy_klienta uk ON uk.id = u.uczestnik_klienta_id " +
    "WHERE c.wniosek_id = ? AND c.instytucja_id = ? ORDER BY c.numer", [w.id, w.is]);
  var wiersze = cert.map(function (c) {
    return '<tr><td class="mono">' + esc(c.numer) + "</td><td>" + esc(c.imie_nazwisko) + '</td><td class="nowrap">' + esc(DB.fmtDate(c.wystawiono)) + "</td></tr>";
  });
  return karta22("Dokumenty i certyfikaty", "", '<div style="padding:12px 16px">' + znacznik22(w.umowa, "Umowa z urzędem") +
    znacznik22(w.fakturaWystawiona, "Faktura") + znacznik22(w.certyfikat, "Certyfikaty") + "</div>" +
    tabela22(["Numer certyfikatu", "Uczestnik", "Wystawiono"], wiersze, "Certyfikaty jeszcze nie zostały wystawione."));
}

/* Tylko wpisy automatyczne (zmiany etapu): reczne wpisy to robocze notatki LDIT */
function sekcjaPrzebiegu22(w) {
  var wpisy = Store.query("SELECT czas, etap_z, etap_do FROM przebieg_wniosku WHERE wniosek_id = ? AND instytucja_id = ? AND rodzaj = 'automatyczny' ORDER BY czas", [w.id, w.is]);
  var wiersze = wpisy.map(function (p) {
    return '<tr><td class="nowrap mono small">' + esc(DB.fmtDate(String(p.czas).slice(0, 10))) + "</td><td>" +
      esc((Statusy.ETAPY[p.etap_z] || "start") + " › " + (Statusy.ETAPY[p.etap_do] || "")) + "</td></tr>";
  });
  return karta22("Przebieg projektu", "zmiany etapu", tabela22(["Kiedy", "Zmiana etapu"], wiersze, "Brak zapisanych zmian etapu."));
}
