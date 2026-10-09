/* Dashboard: skutecznosc pracownikow (D-242). Dane z DB.SKUTECZNOSC, ktore warstwa danych
   (assets/zakres.js) zawęza: administrator widzi wszystkich, pracownik tylko siebie.
   Liczone sa wylacznie decyzje pozytywne i negatywne. Same deklaracje. */

function wierszeSkutecznosci(rok) {
  return DB.SKUTECZNOSC.filter(function (r) { return String(r.rok) === String(rok); });
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
    '<td class="num">' + liczbaZLinkiem(r.przygotowane, r, "") + '</td>' +
    '<td class="num">' + liczbaZLinkiem(r.pozytywne, r, "Pozytywna") + '</td>' +
    '<td class="num">' + liczbaZLinkiem(r.negatywne, r, "Negatywna") + '</td>' +
    '<td class="num strong">' + (r.proc == null ? '<span class="muted">-</span>' : esc(DB.fmtPct(r.proc))) + '</td>' +
    '<td style="width:24%"><div style="background:var(--surface-2);border-radius:4px;height:8px">' +
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
  var tip = "Decyzje pozytywne podzielone przez pozytywne i negatywne razem.";
  el.innerHTML =
    '<div class="card-head"><h3>' + tytul + ' ' + esc(STAN_01.rok) + '<span class="tip-mark" data-tip="' + esc(tip) + '">i</span></h3>' +
    '</div>' +
    '<div class="card-body tight">' + (wiersze.length
      ? '<table class="tbl"><thead><tr><th>Pracownik</th><th class="num">Przygotowane</th><th class="num">Pozytywne</th><th class="num">Negatywne</th>' +
        '<th class="num">Skuteczność</th><th></th><th></th></tr></thead><tbody>' + wiersze.map(wierszSkutecznosci).join("") + '</tbody></table>'
      : '<div class="muted small" style="padding:14px">Brak rozstrzygniętych wniosków w tym roku.</div>') +
    '</div>';
}
