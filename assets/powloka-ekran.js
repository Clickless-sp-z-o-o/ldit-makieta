/* ============================================================================
   Powloka makiety (index.html): okruszek, zaznaczenie w menu, historia ekranow
   dla przycisku Wstecz i licznik formularzy do akceptacji. Same deklaracje,
   wywolania sa w index.html.
   ============================================================================ */

var LIMIT_HISTORII = 50;

/* Okruszek buduje sie przez textContent: nazwy pochodza z bazy. Ostatni czlon pogrubiony. */
function ustawOkruszek(czlony) {
  var el = document.getElementById("crumb");
  el.innerHTML = "";
  czlony.forEach(function (tekst, i) {
    var ostatni = i === czlony.length - 1;
    var span = document.createElement(ostatni ? "b" : "span");
    span.textContent = tekst;
    el.appendChild(span);
    if (!ostatni) {
      var sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "›";
      el.appendChild(sep);
    }
  });
}

/* Pozycja podmenu Dofinansowan dla Zestawien: instytucja w roku albo sam rok (Nieprzypisane) */
function pozycjaDofin(ekran) {
  if (ekran.plik !== "02-zestawienia.html") return null;
  var p = Nawigacja.odczytajZapytanie(ekran.zapytanie, ["is", "rok"]);
  var rok = p.rok || Lata.domyslny();
  var rokEl = document.querySelector('#nav .sub-rok[data-rok="' + CSS.escape(rok) + '"]');
  if (!rokEl) return null;
  var instEl = Array.prototype.filter.call(document.querySelectorAll("#nav .sub-is"), function (x) {
    return x.getAttribute("data-rok") === rok && x.getAttribute("data-is") === p.is;
  })[0] || null;
  return { rok: rok, rokEl: rokEl, instEl: instEl };
}

function rozwinDofin(dofin) {
  document.getElementById("sub-dofin").classList.add("open");
  document.querySelector('#nav .nav-item[data-id="dofin"]').classList.add("open");
  dofin.rokEl.classList.add("active", "open");
  var lista = document.querySelector('#nav .nav-sub2[data-rok="' + CSS.escape(dofin.rok) + '"]');
  if (lista) lista.classList.add("open");
  if (dofin.instEl) dofin.instEl.classList.add("active");
}

/* Zaznaczenie w menu i okruszek wynikaja z ekranu w ramce, nie z ostatniego klikniecia
   w menu. Ekran zglasza sie sam (Nawigacja.zglosEkran), takze po przejsciu linkiem.
   Zwraca { idMenu, rok } albo null, gdy ekranu nie ma w menu tej roli. */
function zaznaczEkran(ekran) {
  var nav = document.getElementById("nav");
  var idMenu = Nawigacja.menuEkranu(ekran.plik);
  var pozycja = nav.querySelector('.nav-item[data-id="' + idMenu + '"]');
  nav.querySelectorAll(".nav-item").forEach(function (x) { x.classList.remove("active"); });
  if (!pozycja) { ustawOkruszek([ekran.tytul]); return null; }

  pozycja.classList.add("active");
  var czlony = [pozycja.getAttribute("data-label")];
  var dofin = pozycjaDofin(ekran);
  if (dofin) {
    rozwinDofin(dofin);
    czlony.push(dofin.rokEl.getAttribute("data-label"));
    if (dofin.instEl) czlony.push(dofin.instEl.getAttribute("data-label"));
  } else if (Nawigacja.plikZAdresu(pozycja.getAttribute("data-plik")) !== ekran.plik) {
    czlony.push(ekran.tytul);
  }
  ustawOkruszek(czlony);
  return { idMenu: idMenu, rok: dofin ? dofin.rok : null };
}

/* ------------------------------ historia ekranow ------------------------------ */

/* Kazdy ekran w ramce trafia na stos. Ten sam plik (np. zmiana filtra zapisana
   w adresie) podmienia ostatni wpis zamiast dokladac nowy, a ekran otwarty
   przyciskiem Wstecz tez tylko podmienia wpis. */
function zapamietajEkran(historia, ekran, poCofnieciu) {
  var wpis = ekran.plik + (ekran.zapytanie || "");
  var ostatni = historia[historia.length - 1];
  if (poCofnieciu || (ostatni && Nawigacja.plikZAdresu(ostatni) === ekran.plik)) historia[historia.length - 1] = wpis;
  else historia.push(wpis);
  if (historia.length > LIMIT_HISTORII) historia.shift();
}

/* Zwraca adres poprzedniego ekranu albo null, gdy nie ma dokad wrocic */
function cofnijEkran(historia) {
  if (historia.length < 2) return null;
  historia.pop();
  return historia[historia.length - 1];
}

/* Licznik wnioskow do akceptacji (D-105, D-140), tylko dla rol z modulem Zadania */
function pokazLicznik(liczba) {
  var przycisk = document.getElementById("akceptacje");
  przycisk.hidden = liczba === null;
  var n = document.getElementById("akceptacjeN");
  n.textContent = liczba;
  n.hidden = !liczba;
}
