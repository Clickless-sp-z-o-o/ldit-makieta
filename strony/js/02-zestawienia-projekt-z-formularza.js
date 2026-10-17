/* Logika bez DOM: dane podstawiane do okna nowego projektu z zaakceptowanego formularza (D-264 pkt 4).
   Formularz i reczne zalozenie ida ta sama sciezka (ProjektLogika.utworz), formularz tylko wypelnia
   pola: klienta z akceptacji, instytucje i urzad z formularza, szkolenie z katalogu instytucji
   (po nazwie, z cena katalogowa jako domyslna) i uczestnikow z puli klienta, ktorych przeniosla akceptacja.

   ProjektZFormularza.podpowiedz(formularzId) zwraca
     { ok: true, dane: { formularzId, klientId, instytucjaId, pupId, szkolenia: [{ szkolenieId, cena }],
                         uczestnicy: [{ uczestnikKlientaId, szkolenieId }] }, nieznaneSzkolenie }
     albo { ok: false, bledy }. nieznaneSzkolenie to nazwa z formularza bez odpowiednika w katalogu.

   ProjektZFormularza.zaakceptujIZaloz(formularzId, kto, poprawki) akceptuje formularz i od razu zaklada
     projekt (ankieta klienta 09.10, D-328): { klientId, projekt: { ok, id } albo { ok: false, bledy } }.
     Projekt powstaje w roku domyslnym zestawien ze statusem Niezlozony. Gdy szkolenia z formularza nie ma
     w katalogu instytucji, projekt nie powstaje, a zatwierdzajacy zaklada go recznie z podpowiedzia. */
(function (global) {
  "use strict";

  var S = global.Store;

  function normuj(tekst) { return String(tekst || "").trim().toLowerCase(); }

  function szkolenieZKatalogu(instytucjaId, nazwa) {
    if (!normuj(nazwa)) return null;
    return global.SzkoleniaWniosku.szkoleniaInstytucji(instytucjaId).filter(function (s) { return normuj(s.nazwa) === normuj(nazwa); })[0] || null;
  }

  /* Osoby z formularza w puli klienta, dopasowane tak jak przy akceptacji: PESEL, a bez niego nazwisko */
  function uczestnicyZPuli(f, szkolenieId) {
    if (!szkolenieId) return [];
    var pula = S.query("SELECT id, imie_nazwisko, pesel FROM uczestnicy_klienta WHERE klient_id = ?", [f.klient_id]);
    return JSON.parse(f.uczestnicy_json || "[]").map(function (u) {
      return pula.filter(function (p) { return u.pesel ? p.pesel === u.pesel : p.imie_nazwisko === u.imie_nazwisko; })[0];
    }).filter(Boolean).map(function (p) { return { uczestnikKlientaId: p.id, szkolenieId: szkolenieId }; });
  }

  function urzadProjektu(f) {
    var urzedy = global.ProjektLogika.urzedyKlienta(f.klient_id);
    var zFormularza = urzedy.filter(function (u) { return u.pup === f.pup_id; })[0];
    return (zFormularza || urzedy[0] || {}).pup || "";
  }

  function podpowiedz(formularzId) {
    var f = S.find("formularze_oczekujace", formularzId);
    if (!f) return { ok: false, bledy: ["Nie znaleziono formularza " + formularzId + "."] };
    if (f.status !== "zaakceptowany" || !f.klient_id) return { ok: false, bledy: ["Projekt zakłada się z formularza dopiero po jego akceptacji."] };
    var szk = szkolenieZKatalogu(f.instytucja_id, f.szkolenie);
    return {
      ok: true,
      nieznaneSzkolenie: szk || !normuj(f.szkolenie) ? "" : f.szkolenie,
      dane: {
        formularzId: f.id, klientId: f.klient_id, instytucjaId: f.instytucja_id, pupId: urzadProjektu(f),
        szkolenia: szk ? [{ szkolenieId: szk.id, cena: szk.cena == null ? 0 : szk.cena }] : [],
        uczestnicy: uczestnicyZPuli(f, szk ? szk.id : null)
      }
    };
  }

  function zalozPoAkceptacji(formularzId) {
    var podp = podpowiedz(formularzId);
    if (!podp.ok) return podp;
    if (!podp.dane.szkolenia.length) {
      return { ok: false, bledy: [podp.nieznaneSzkolenie ? "Szkolenia „" + podp.nieznaneSzkolenie + "” nie ma w katalogu instytucji, wybierz je przy zakładaniu projektu."
        : "Formularz nie wskazuje szkolenia, wybierz je przy zakładaniu projektu."] };
    }
    return global.ProjektLogika.utworz(Object.assign({ rok: global.Lata.domyslny() }, podp.dane));
  }

  function zaakceptujIZaloz(formularzId, kto, poprawki) {
    var klientId = global.Akceptacje.zaakceptujFormularz(formularzId, kto, poprawki);
    return { klientId: klientId, projekt: zalozPoAkceptacji(formularzId) };
  }

  global.ProjektZFormularza = { podpowiedz: podpowiedz, zaakceptujIZaloz: zaakceptujIZaloz };
})(window);
