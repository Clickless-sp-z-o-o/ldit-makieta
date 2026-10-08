/* Konfigurator instytucji: dodawanie i usuwanie wersji warunkow prowizyjnych. Tylko deklaracje. */
/* ---------- Nowa wersja warunkow ---------- */
function polaWersjiHtml() {
  if (!STAN_07.mozeEdytowac) return '<span class="small muted">Zmiana warunków wymaga uprawnienia do edycji modułu Administracja.</span>';
  return '<select class="inp" id="nwKum" style="width:auto"><option value="miesieczny">Kumulacja miesięczna</option>' +
      '<option value="roczny">Kumulacja roczna</option><option value="brak">Bez kumulacji, stała stawka</option></select>' +
    '<select class="inp" id="nwSposob" style="width:auto"><option value="od_calosci">Od całości</option>' +
      '<option value="od_nadwyzki">Od nadwyżki</option></select>' +
    '<input class="inp" id="nwProgi" style="width:210px" placeholder="progi: 0:10, 50000:12" value="0:10, 50000:12">' +
    '<input class="inp num" id="nwStala" style="width:90px;display:none" placeholder="stała %" value="20">' +
    '<label class="small muted" for="nwOd">obowiązuje od</label>' +
    '<input class="inp" type="date" id="nwOd" style="width:150px" min="' + dzisiaj() + '" value="' + dzisiaj() + '">' +
    '<button class="btn primary" id="nwZapisz">Dodaj wersję</button>';
}

function czytajProgi(tekst) {
  var progi = tekst.split(",").map(function (c) {
    var p = c.split(":");
    return { od: parseFloat(p[0]), st: parseFloat(p[1]) };
  });
  var ok = progi.every(function (x, i) {
    return !isNaN(x.od) && !isNaN(x.st) && x.st >= 0 && x.st <= 100 && (i ? x.od > progi[i - 1].od : x.od === 0);
  });
  return ok ? progi : null;
}

function odczytajNowaWersje() {
  var kum = document.getElementById("nwKum").value;
  var sposob = kum === "brak" ? "stala" : document.getElementById("nwSposob").value;
  var stala = parseFloat(document.getElementById("nwStala").value);
  var progi = kum === "brak" ? [] : czytajProgi(document.getElementById("nwProgi").value);
  if (kum === "brak" && !(stala >= 0 && stala <= 100)) return { blad: "Stała stawka musi być liczbą od 0 do 100." };
  if (kum !== "brak" && !progi) return { blad: "Progi zapisz jako pary od:stawka, rosnąco, pierwszy od 0, na przykład 0:10, 50000:12." };
  if (kum === "roczny" && sposob === "od_calosci") return { blad: "Liczenie od całości ma model A tylko z kumulacją miesięczną. Dla rocznej wybierz od nadwyżki (model B)." };
  return { kumulacja: kum, sposob: sposob, model: modelZ(kum, sposob),
           stala: kum === "brak" ? stala : null, progi: progi };
}

function dodajWersje() {
  var nowa = odczytajNowaWersje();
  var od = document.getElementById("nwOd").value;
  var wersje = wersjeInstytucji(STAN_07.wybrana);
  var dzis = dzisiaj();
  var otwarta = wersje.filter(function (v) { return !v.do; }).pop();
  var powod = nowa.blad
    || (!od || od < dzis ? "Nowe warunki obowiązują od dziś albo od daty przyszłej, nigdy wstecz (D-162)." : "")
    || (wersje.some(function (v) { return v.od > dzis; }) ? "Istnieje już wersja planowana. Usuń ją, żeby dodać inną." : "")
    || (otwarta && od <= otwarta.od ? "Data musi być późniejsza niż początek obowiązującej wersji (" + DB.fmtDate(otwarta.od) + ")." : "");
  document.getElementById("bladWersji").textContent = powod;
  if (powod) return;

  if (otwarta) Store.update("warunki_prowizyjne", otwarta.id, { obowiazuje_do: dzienPrzed(od) });
  Store.insert("warunki_prowizyjne", {
    instytucja_id: STAN_07.wybrana, obowiazuje_od: od, obowiazuje_do: null, model: nowa.model,
    rodzaj_kumulacji: nowa.kumulacja, sposob_liczenia: nowa.sposob, stawka_stala: nowa.stala,
    progi: JSON.stringify(nowa.progi)
  }, "WP-");
  logZmiana(instytucja(STAN_07.wybrana).nazwa, "Warunki prowizyjne", otwarta ? opisTekstowy(otwarta) : "brak",
    opisTekstowy({ model: nowa.model, kumulacja: nowa.kumulacja, sposob: nowa.sposob, stala: nowa.stala, progi: nowa.progi }) + ", od " + DB.fmtDate(od));
  render07();
}

function usunPlanowana(id) {
  var wersje = wersjeInstytucji(STAN_07.wybrana);
  var v = wersje.filter(function (x) { return x.id === id; })[0];
  var poprzednia = wersje.filter(function (x) { return x.do === dzienPrzed(v.od); })[0];
  Store.remove("warunki_prowizyjne", id);
  if (poprzednia) Store.update("warunki_prowizyjne", poprzednia.id, { obowiazuje_do: null });
  logZmiana(instytucja(STAN_07.wybrana).nazwa, "Warunki prowizyjne", opisTekstowy(v) + ", od " + DB.fmtDate(v.od), "usunięto wersję planowaną");
  render07();
}
