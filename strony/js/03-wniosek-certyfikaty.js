/* Karta wniosku: certyfikaty (D-290) i Wartosc z regula (D-281).
   Certyfikat dostaje kazde zakwalifikowane szkolenie uczestnika; numeracja ciagla, osobna dla
   instytucji (D-200). Wystawia pracownik albo administrator (zapis wymaga edycji Dofinansowan).
   Wartosc: suma zakwalifikowanych szkolen, reczna zmiana wylacza regule, "Przywroc regule"
   ja odtwarza (D-19); rozjazd z suma daje ostrzezenie (R-05). Tylko deklaracje. */

function nastepnyNumerCertyfikatu03(instytucjaId) {
  var r = Store.one("SELECT COUNT(*) AS n FROM certyfikaty WHERE instytucja_id = ?", [instytucjaId]);
  return "CERT/" + instytucjaId + "/" + String(r.n + 1).padStart(4, "0");
}

/* Zwraca liczbe wystawionych certyfikatow */
function wystawCertyfikaty03(wniosekId) {
  var brak = Store.query("SELECT s.id, s.wniosek_id, s.instytucja_id FROM uczestnik_szkolenia s WHERE s.wniosek_id = ? " +
    "AND s.status_kwalifikacji = 'zakwalifikowany' AND NOT EXISTS (SELECT 1 FROM certyfikaty c WHERE c.uczestnik_szkolenie_id = s.id)", [wniosekId]);
  var kto = Akceptacje.ktoTeraz();
  brak.forEach(function (s) {
    Store.insert("certyfikaty", { uczestnik_szkolenie_id: s.id, wniosek_id: s.wniosek_id, instytucja_id: s.instytucja_id,
      numer: nastepnyNumerCertyfikatu03(s.instytucja_id), wystawiono: kto.czas.slice(0, 10), wystawil_id: kto.uzytkownik }, "CE-");
  });
  if (brak.length) SzkoleniaWniosku.rejestr("Zmiana pola", wniosekId, "Certyfikaty", "brak", "wystawiono " + brak.length);
  return brak.length;
}

function opisDokumentow03(w) {
  var cert = w.doCertyfikatu ? w.certyfikatow + " z " + w.doCertyfikatu + " szkoleń" : "brak zakwalifikowanych szkoleń";
  var przycisk = STAN_03.mozeEdytowac && w.certyfikatow < w.doCertyfikatu
    ? ' <button class="btn xs" onclick="klikWystawCertyfikaty03()">Wystaw certyfikaty</button>' : "";
  return '<div class="small" style="margin-bottom:6px">Faktura: <b>' + (w.fakturaWystawiona ? "wystawiona" : "nie") + '</b> ' +
    '<span class="muted">(z faktury wniosku)</span></div>' +
    '<div class="small">Certyfikaty: <b>' + esc(cert) + "</b>" + przycisk + ' <span class="ref">D-290</span></div>';
}

function klikWystawCertyfikaty03() {
  var n = wystawCertyfikaty03(STAN_03.w.id);
  wczytaj();
  renderWszystko();
  komunikat("Wystawiono certyfikaty: " + n + ".");
}

function renderHintWartosci03() {
  var w = STAN_03.w;
  var rozjazd = !w.kwotaRegula && Math.abs((w.kwotaWnioskowana || 0) - w.kwotaZReguly) >= 0.005;
  el("wrapWartoscWn").classList.toggle("overridden", !w.kwotaRegula);
  el("hintWartosc").innerHTML = w.kwotaRegula
    ? '<span class="muted">Suma zakwalifikowanych szkoleń uczestników (reguła)</span>'
    : '<span class="muted">Wpisana ręcznie.</span>' + (rozjazd ? ' <span style="color:var(--neg,#b91c1c)">&#9888; Suma szkoleń to ' +
      esc(DB.fmtPLN2(w.kwotaZReguly)) + "</span>" : "") +
      (STAN_03.mozeEdytowac ? ' <a href="#" onclick="przywrocReguleWartosci03();return false">Przywróć regułę</a>' : "");
}

function przywrocReguleWartosci03() {
  zapiszZmiany("wnioski", STAN_03.w.id, { kwota_regula_aktywna: 1, kwota_wnioskowana: STAN_03.w.kwotaZReguly },
    [{ typ: "Przywrócenie reguły", pole: "Wartość wnioskowana", przed: STAN_03.w.kwotaWnioskowana, po: STAN_03.w.kwotaZReguly }]);
}
