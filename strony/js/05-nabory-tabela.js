/* Nabory: KPI, tabela naborow z filtrami (tylko deklaracje) */

function zakresPrognoz() {
  var p = STAN_05.prognozowane;
  if (!p.length) return "brak prognoz";
  var posortowane = p.slice().sort(function (a, b) { return a.od < b.od ? -1 : 1; });
  return "najbliższa: " + (posortowane[0].prognoza || DB.fmtDate(posortowane[0].od)) + ", najdalsza: " +
    (posortowane[posortowane.length - 1].prognoza || DB.fmtDate(posortowane[posortowane.length - 1].od));
}

function kartaKpi05(label, val, foot, tip) {
  var mark = tip ? '<span class="tip-mark" data-tip="' + esc(tip) + '">i</span>' : "";
  return '<div class="kpi"><div class="k-label">' + label + mark + '</div>' +
    '<div class="k-value">' + val + '</div>' +
    '<div class="k-foot">' + foot + '</div></div>';
}

/* Urzad z kilkoma naborami (np. ogloszony i prognoza) liczy swoich klientow raz */
function klienciUrzedowZNaborem05() {
  var urzedy = {};
  STAN_05.N.forEach(function (n) { urzedy[n.pupId] = true; });
  return Object.keys(urzedy).reduce(function (s, id) { return s + (STAN_05.klienciPoPup[id] || 0); }, 0);
}

function renderKpi05() {
  var S = STAN_05;
  el05("kpi").innerHTML =
    kartaKpi05("Nabory trwające", S.trwa.length,
        '<span class="tag pos dot">' + suma(S.trwa) + ' klientów do obsłużenia</span>',
        "Nabory ogłoszone z otwartym terminem składania wniosków. Obok liczba klientów w tych urzędach.") +
    kartaKpi05("Ogłoszone, czekają na start", S.oczekuje.length, "nabór ogłoszony, termin jeszcze się nie zaczął",
        "Nabory ogłoszone przez urząd, których data rozpoczęcia jest w przyszłości.") +
    kartaKpi05("Nabory prognozowane", S.prognozowane.length, esc(zakresPrognoz()),
        "Prognozy z drugiego źródła (D-271): osobne wiersze z przewidywaną datą startu i opisem terminu.") +
    kartaKpi05("Klientów przypisanych do urzędów", DB.fmtNum(klienciUrzedowZNaborem05()),
        "w słowniku jest " + DB.PUPY.length + " urzędów", "Suma klientów przypisanych do urzędów z naborem lub prognozą, każdy urząd liczony raz.");

  el05("stopkaUrzedy").innerHTML = "W słowniku jest <b>" + DB.PUPY.length + " urzędów pracy</b>, tutaj widać <b>" +
    S.N.length + "</b> naborów i prognoz. Urząd może mieć kilka wierszy, a w rejestrze niżej występuje raz.";
  el05("notkaUrzedy").textContent = "Słownik obejmuje " + DB.PUPY.length + " urzędów pracy.";
}

function tagStat(n) {
  var klasa = { trwa: "pos", oczekuje: "info", prognozowany: "warn", "zakończony": "mute" }[n.status] || "mute";
  return '<span class="tag ' + klasa + ' dot">' + esc(ETYKIETA_STATUSU_05[n.status] || "Brak danych") + "</span>";
}

function tagDni(n) {
  if (n.status === "trwa" && n.do) {
    var d = dniDo(n.do);
    var klasa = d <= 3 ? "neg" : d <= 10 ? "warn" : "info";
    return '<span class="tag ' + klasa + '">' + d + " dni</span>";
  }
  if (n.status === "zakończony") return '<span class="small muted">zakończony</span>';
  return '<span class="muted">&mdash;</span>';
}

function kreska05() { return '<span class="muted">&mdash;</span>'; }

/* Szczegoly naboru w podpowiedzi przy nazwie urzedu: deficyty, weryfikacja, podsumowanie */
function szczegolyNaboru05(n) {
  var t = [n.deficytWoj ? "Deficyt wojewódzki: " + n.deficytWoj : "", n.deficytPow ? "Deficyt powiatowy: " + n.deficytPow : "",
           n.weryfikacja ? "Zweryfikowano: " + DB.fmtDate(n.weryfikacja) : "", n.podsumowanie || ""].filter(Boolean).join(". ");
  return t ? '<span class="tip-mark" data-tip="' + esc(t) + '">i</span>' : "";
}

function wierszNaboru(n) {
  var cls = n.status === "trwa" ? "row-pos row-nabor" : n.status === "zakończony" ? "past" : "";
  return '<tr class="' + cls + '">' +
    '<td class="strong nowrap">' + esc(n.pup) + szczegolyNaboru05(n) + '</td>' +
    '<td class="muted nowrap">' + esc(n.woj) + '</td>' +
    '<td><span class="pill' + (n.rodzaj === "ogloszony" ? " k" : " w") + '">' + esc(ETYKIETA_RODZAJU_05[n.rodzaj]) + '</span></td>' +
    '<td class="nowrap">' + tagStat(n) + '</td>' +
    '<td class="mono nowrap">' + (n.od ? esc(DB.fmtDate(n.od)) : kreska05()) + '</td>' +
    '<td class="mono nowrap">' + (n.do ? esc(DB.fmtDate(n.do)) : kreska05()) + '</td>' +
    '<td class="num">' + (n.dni != null ? n.dni : kreska05()) + '</td>' +
    '<td class="c">' + tagDni(n) + '</td>' +
    '<td class="nowrap">' + (n.prognoza ? '<span class="small">' + esc(n.prognoza) + '</span>' : kreska05()) + '</td>' +
    '<td class="nowrap small">' + (n.srodki ? esc(n.srodki) : kreska05()) + '</td>' +
    '<td class="num strong">' + klientow(n) + '</td>' +
    '<td class="right nowrap">' + (n.link ? '<a class="btn xs" href="' + esc(n.link) + '" target="_blank" rel="noopener">Ogłoszenie</a> ' : "") +
      '<button class="btn xs" onclick="otworzPanelKlientow05(\'' + escJs(n.pupId) + '\')">Pokaż klientów</button></td>' +
    '</tr>';
}

function renderTabela05() {
  var N = STAN_05.N;
  var q = el05("q").value.toLowerCase().trim();
  var fs = Wielowybor.wartosci(el05("fStat")), fr = Wielowybor.wartosci(el05("fRodz"));
  var lista = N.filter(function (n) {
    if (!Wielowybor.pasuje(fs, n.status)) return false;
    if (!Wielowybor.pasuje(fr, n.rodzaj)) return false;
    return !q || (n.pup + " " + n.woj + " " + (n.podsumowanie || "")).toLowerCase().indexOf(q) >= 0;
  });
  el05("licz").innerHTML = "<b>" + lista.length + "</b> z " + N.length + " naborów";
  el05("body").innerHTML = lista.length ? lista.map(wierszNaboru).join("") :
    '<tr><td colspan="12"><div class="empty"><div class="et">Brak naborów</div>Żaden nabór nie spełnia filtrów.</div></td></tr>';
}

/* Lista ma pokazac tylu klientow, ilu liczy kolumna, wiec bez domyslnego filtra Bazy */
function pokazKlientow(id) {
  location.href = "04-baza-klientow.html" + Nawigacja.zbudujZapytanie({ pup: id, wnioski: "wszystkie" });
}

function podepnijFiltry05() {
  ["q", "fStat", "fRodz"].forEach(function (id) {
    el05(id).addEventListener("input", renderTabela05);
    el05(id).addEventListener("change", renderTabela05);
  });
}
