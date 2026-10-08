/* Konfigurator instytucji: stan strony, slowniki i pomocnicze. Tylko deklaracje. */
var STAN_07 = { wybrana: null, mozeEdytowac: false };
var KOLEJNOSC_WIELKOSCI = ["mikro", "mały", "średni", "duży", "inny"];

/* Jeden slownik modeli, zgodny z komentarzem naglowka assets/prowizja.js */
var OPIS_MODELU = {
  A: "kumulacja miesięczna, stawka od całości obrotu okresu",
  B: "kumulacja roczna, stawka od nadwyżki ponad próg",
  C: "kumulacja miesięczna, stawka od nadwyżki ponad próg",
  D: "stała stawka, bez progów"
};
var OPIS_KUMULACJI = { miesieczny: "miesięczna", roczny: "roczna", brak: "brak" };
var OPIS_SPOSOBU = { od_calosci: "od całości", od_nadwyzki: "od nadwyżki", stala: "stała stawka" };

/* ---------- Pomocnicze ---------- */
function dwie(n) { return String(n).padStart(2, "0"); }
function dzisiaj() {
  var d = new Date();
  return d.getFullYear() + "-" + dwie(d.getMonth() + 1) + "-" + dwie(d.getDate());
}
function terazStr() {
  var d = new Date();
  return dzisiaj() + " " + dwie(d.getHours()) + ":" + dwie(d.getMinutes());
}
function dzienPrzed(data) {
  var d = new Date(data + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
function logZmiana(obiekt, pole, przed, po) {
  Store.insert("rejestr_aktywnosci", {
    czas: terazStr(), kto: Auth.sesja().imie, typ: "Zmiana warunków IS",
    obiekt: obiekt, pole: pole, przed: przed || "brak", po: po
  }, "AKT-");
}
function instytucja(id) {
  return DB.INSTYTUCJE.filter(function (x) { return x.id === id; })[0];
}

/* ---------- Wersje warunkow prowizyjnych (tabela warunki_prowizyjne) ---------- */
function wersjeInstytucji(isId) {
  return Store.query("SELECT * FROM warunki_prowizyjne WHERE instytucja_id = ? ORDER BY obowiazuje_od", [isId])
    .map(function (r) {
      return { id: r.id, od: r.obowiazuje_od, do: r.obowiazuje_do, model: r.model,
               kumulacja: r.rodzaj_kumulacji, sposob: r.sposob_liczenia, stala: r.stawka_stala,
               progi: JSON.parse(r.progi || "[]") };
    });
}
function stanWersji(v, dzis) {
  if (v.od > dzis) return "planowana";
  return v.do && v.do < dzis ? "archiwalna" : "aktualna";
}
function wersjaNaDzien(wersje, data) {
  try { return Prowizja.warunkiNaDzien(wersje, data); }
  catch (e) {
    if (e instanceof Prowizja.ProwizjaError) return null;
    throw e;
  }
}
function modelZ(kumulacja, sposob) {
  if (kumulacja === "brak") return "D";
  if (sposob === "od_nadwyzki") return kumulacja === "roczny" ? "B" : "C";
  return "A";
}
function trescProgow(v) {
  return v.sposob === "stala"
    ? "stawka stała " + DB.fmtPct(v.stala)
    : v.progi.map(function (x) { return DB.fmtPLN(x.od) + " &rarr; " + DB.fmtPct(x.st); }).join(", ");
}
function opisTekstowy(v) {
  var t = "model " + v.model + ", " + OPIS_KUMULACJI[v.kumulacja] + " kumulacja, " + OPIS_SPOSOBU[v.sposob];
  return t + (v.sposob === "stala" ? ", " + v.stala + "%"
    : ", progi " + v.progi.map(function (x) { return x.od + ":" + x.st; }).join(" "));
}
