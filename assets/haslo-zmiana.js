/* ============================================================================
   Zmiana wlasnego hasla (ekran Moje konto, D-321).

   Konto zmienia haslo wylacznie sobie: modul nie przyjmuje identyfikatora
   konta, bierze go z sesji. Wywoluje go Auth.zmienHaslo, ktore przekazuje tryb
   systemowy (zapis do uzytkownicy i sesje bez modulu Ustawienia). Hasla innych
   kont zmienia dalej tylko administrator w Ustawieniach.

   Polityka hasla makiety: co najmniej 10 znakow, litera i cyfra, inne niz obecne.
   Po zmianie wygasaja pozostale sesje konta, biezaca zostaje. Do rejestru
   aktywnosci trafia sam fakt zmiany, nigdy tresc hasla.

   API:  ZmianaHasla.POLITYKA, ZmianaHasla.bledyNowego(nowe, obecne)
         ZmianaHasla.wykonaj(sesja, token, obecne, nowe, powtorzone, systemowo)
           -> { ok: true } albo { ok: false, bledy: { obecne?, nowe?, powtorzone?, ogolny? } }
   ============================================================================ */
(function (global) {
  "use strict";

  var MIN_DLUGOSC = 10;
  var POLITYKA = "Co najmniej " + MIN_DLUGOSC + " znaków, w tym litera i cyfra.";

  function bledyNowego(nowe, obecne) {
    var tekst = String(nowe || "");
    if (tekst.length < MIN_DLUGOSC) return "Hasło musi mieć co najmniej " + MIN_DLUGOSC + " znaków.";
    if (!/\p{L}/u.test(tekst) || !/\d/.test(tekst)) return "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.";
    if (tekst === String(obecne || "")) return "Nowe hasło musi różnić się od obecnego.";
    return null;
  }

  function nowaSol() {
    var b = global.crypto.getRandomValues(new Uint8Array(8));
    return Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }

  function teraz() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function wykonaj(sesja, token, obecne, nowe, powtorzone, systemowo) {
    if (!sesja) return { ok: false, bledy: { ogolny: "Sesja wygasła. Zaloguj się ponownie." } };
    var S = global.Store;
    var konto = S.one("SELECT haslo_skrot, haslo_sol FROM uzytkownicy WHERE id = ?", [sesja.uzytkownik_id]);
    var bledy = {};
    if (!konto || global.Haslo.skrot(String(obecne || ""), konto.haslo_sol) !== konto.haslo_skrot) bledy.obecne = "Obecne hasło jest nieprawidłowe.";
    var blad = bledyNowego(nowe, obecne);
    if (blad) bledy.nowe = blad;
    if (String(powtorzone || "") !== String(nowe || "")) bledy.powtorzone = "Hasła nie są takie same. Wpisz nowe hasło jeszcze raz.";
    if (Object.keys(bledy).length) return { ok: false, bledy: bledy };
    var sol = nowaSol();
    systemowo(function () {
      S.update("uzytkownicy", sesja.uzytkownik_id, { haslo_sol: sol, haslo_skrot: global.Haslo.skrot(String(nowe), sol) });
      S.exec("DELETE FROM sesje WHERE uzytkownik_id = ? AND token <> ?", [sesja.uzytkownik_id, token || ""]);
      S.insert("rejestr_aktywnosci", { czas: teraz(), kto: sesja.imie, typ: "Zmiana hasła", obiekt: sesja.login,
                                       pole: "Hasło", przed: "(ukryte)", po: "(ukryte)" }, "AKT-");
    });
    return { ok: true };
  }

  global.ZmianaHasla = { POLITYKA: POLITYKA, bledyNowego: bledyNowego, wykonaj: wykonaj };
})(window);
