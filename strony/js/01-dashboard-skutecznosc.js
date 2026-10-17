/* Dashboard: skutecznosc pracownikow (D-242). Dane z DB.SKUTECZNOSC, ktore warstwa danych
   (assets/zakres.js) zawęza: administrator widzi wszystkich, pracownik tylko siebie.
   Miara glowna to kwota przyznana na wnioskach przygotowanych przez osobe (D-325, ankieta
   klienta 09.10.2026), ranking idzie wedlug niej. Liczba decyzji i procent pozytywnych
   zostaja jako informacja pomocnicza. Same deklaracje. */

/* Kwota przyznana per osoba i rok z wnioskow z decyzja pozytywna. Rola bez kwot wniosku
   (zakres.js zeruje przyznano) dostaje null, a nie zero, zeby nie pokazac falszywej kwoty. */
function kwotyPrzyznane(rok) {
  var kwoty = {}, znane = Auth.moze("finanse.kwoty_wniosku");
  DB.WNIOSKI_WSZYSTKIE.forEach(function (w) {
    if (String(w.rok) !== String(rok) || w.statusDec !== "Pozytywna" || !w.przygotowal) return;
    kwoty[w.przygotowal] = (kwoty[w.przygotowal] || 0) + (w.przyznano || 0);
  });
  return function (uzytkownik) { return znane ? kwoty[uzytkownik] || 0 : null; };
}

function wierszeSkutecznosci(rok) {
  var kwota = kwotyPrzyznane(rok);
  return DB.SKUTECZNOSC.filter(function (r) { return String(r.rok) === String(rok); })
    .map(function (r) { return Object.assign({}, r, { kwota: kwota(r.uzytkownik) }); })
    .sort(function (a, b) { return (b.kwota || 0) - (a.kwota || 0) || (b.proc || 0) - (a.proc || 0); });
}

/* Liczba z przejsciem do listy wnioskow osoby (Zestawienia, filtry przyg i status, D-270) */
function liczbaZLinkiem(wartosc, r, status) {
  var tekst = DB.fmtNum(wartosc);
  if (!Auth.widziModul("dofin") || !wartosc) return tekst;
  var href = Nawigacja.adresWnioskow({ rok: r.rok, przyg: r.uzytkownik, status: status });
  return '<a class="strong" href="' + esc(href) + '" title="Pokaż te wnioski w Zestawieniach">' + tekst + '</a>';
}

function wierszSkutecznosci(r) {
  var proc = r.proc == null ? 0 : r.proc;
  return '<tr><td class="strong">' + esc(r.imie) + '</td>' +
    '<td class="num strong">' + (r.kwota == null ? '<span class="muted">-</span>' : esc(DB.fmtPLN(r.kwota))) + '</td>' +
    '<td class="num">' + liczbaZLinkiem(r.przygotowane, r, "") + '</td>' +
    '<td class="num">' + liczbaZLinkiem(r.pozytywne, r, "Pozytywna") + '</td>' +
    '<td class="num">' + liczbaZLinkiem(r.negatywne, r, "Negatywna") + '</td>' +
    '<td class="num">' + (r.proc == null ? '<span class="muted">-</span>' : esc(DB.fmtPct(r.proc))) + '</td>' +
    '<td style="width:20%"><div style="background:var(--surface-2);border-radius:4px;height:8px">' +
    '<div style="width:' + Math.max(0, Math.min(100, proc)) + '%;background:var(--st-poz-mark);height:8px;border-radius:4px"></div></div></td>' +
    '<td class="c">' + (Auth.widziModul("dofin") && r.przygotowane
      ? '<a class="btn sm" href="' + esc(Nawigacja.adresWnioskow({ rok: r.rok, przyg: r.uzytkownik })) + '">Szczegóły</a>' : "") + '</td></tr>';
}

function renderSkutecznosc() {
  var el = document.getElementById("skutecznosc");
  if (!el) return;
  var wszystkich = Auth.moze("statystyki.zbiorcze");
  var wiersze = wierszeSkutecznosci(STAN_01.rok);
  var tytul = wszystkich ? "Skuteczność pracowników" : "Twoja skuteczność";
  var tip = "Skuteczność mierzymy kwotą przyznaną na wnioskach przygotowanych przez pracownika, ranking idzie według niej. " +
    "Procent to decyzje pozytywne podzielone przez pozytywne i negatywne razem.";
  el.innerHTML =
    '<div class="card-head"><h3>' + tytul + ' ' + esc(STAN_01.rok) + '<span class="tip-mark" data-tip="' + esc(tip) + '">i</span></h3>' +
    '</div>' +
    '<div class="card-body tight">' + (wiersze.length
      ? '<table class="tbl"><thead><tr><th>Pracownik</th><th class="num">Kwota przyznana</th><th class="num">Przygotowane</th>' +
        '<th class="num">Pozytywne</th><th class="num">Negatywne</th>' +
        '<th class="num">% pozytywnych</th><th></th><th></th></tr></thead><tbody>' + wiersze.map(wierszSkutecznosci).join("") + '</tbody></table>'
      : '<div class="muted small" style="padding:14px">Brak rozstrzygniętych wniosków w tym roku.</div>') +
    '</div>';
}
