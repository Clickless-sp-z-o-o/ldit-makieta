/* Zgloszenia: dane archiwalne i pomocnicze funkcje (tylko deklaracje) */
/* PRZYKLAD: wpisy archiwalne z 2025 to dane demonstracyjne (w bazie nie ma jeszcze importu
   z arkusza). Sluza wylacznie do pokazania historii podmiotu, nie pojawiaja sie na glownej liscie. */
var ARCHIWUM = [
  { id: "ZG-A12", data: "2025-11-03", podmiot: "Dron Fortech", typ: "Instytucja",
    powod: "Kontakt z klientem z pominięciem LDIT",
    opis: "Instytucja skontaktowała się bezpośrednio z klientem w sprawie kolejnego szkolenia.",
    autor: "Bartłomiej Olejnik", waga: "wysoka" },
  { id: "ZG-A07", data: "2025-06-17", podmiot: "Dron Fortech", typ: "Instytucja",
    powod: "Faktura wystawiona bez zgłoszenia w systemie",
    opis: "Fakturę wykryto dopiero przy zamknięciu miesiąca, prowizja naliczona z opóźnieniem.",
    autor: "Martyna Kowal", waga: "średnia" },
  { id: "ZG-A09", data: "2025-09-01", podmiot: "Safe Work Institute", typ: "Instytucja",
    powod: "Obniżenie ceny bez uzgodnienia",
    opis: "Pierwszy taki przypadek, wtedy potraktowany jako pomyłka handlowca.",
    autor: "Bartłomiej Olejnik", waga: "średnia" },
  { id: "ZG-A04", data: "2025-03-22", podmiot: "Zenit sp.j.", typ: "Klient",
    powod: "Rezygnacja po pozytywnej decyzji",
    opis: "Firma zrezygnowała po przyznaniu środków, urząd odnotował niewykorzystany limit.",
    autor: "Joanna Sadowska", waga: "niska" }
];
var STAN_10 = { lokalne: [], filtrTyp: "" };

function lokalne() { return DB.ZGLOSZENIA.slice(); }
function wszystkie() { return DB.ZGLOSZENIA.concat(ARCHIWUM); }

function wagaTag(w) {
  if (w === "wysoka") return '<span class="tag neg dot">waga wysoka</span>';
  if (w === "średnia") return '<span class="tag warn dot">waga średnia</span>';
  return '<span class="tag mute dot">waga niska</span>';
}
function typTag(t) {
  return t === "Instytucja"
    ? '<span class="tag info">Instytucja szkoleniowa</span>'
    : '<span class="tag mute">Klient końcowy</span>';
}

/* ---------- Historia podmiotu ---------- */
function historia(podmiot, pomijId) {
  return wszystkie()
    .filter(function (z) { return z.podmiot === podmiot && z.id !== pomijId; })
    .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
}
