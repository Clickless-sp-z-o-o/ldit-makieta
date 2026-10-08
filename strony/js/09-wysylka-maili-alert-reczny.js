/* Wysylka maili, zakladka 3: reczne dodanie alertu (D-247). Alert trafia do katalogu AUTOMATY,
   czyli tam, gdzie dzis trzymane sa automatyzacje (dane w JS, bez tabeli w schemacie). */
function walidujAlertReczny(data, tresc) {
  if (!data) return "Podaj datę alertu.";
  if (!tresc) return "Podaj treść alertu.";
  return null;
}

function dodajAlertReczny() {
  var data = document.getElementById("arData").value;
  var tresc = document.getElementById("arTresc").value.trim();
  var kom = document.getElementById("arKomunikat");
  var blad = walidujAlertReczny(data, tresc);
  kom.textContent = blad || "Dodano alert na " + DB.fmtDate(data) + ".";
  kom.style.color = blad ? "var(--neg-ink)" : "var(--pos-ink)";
  if (blad) return;
  AUTOMATY.push({ wyz: "Alert ręczny", pow: tresc, odb: document.getElementById("arOdbiorca").value,
                  kiedy: DB.fmtDate(data), tryb: "Ręczny", on: true });
  document.getElementById("arTresc").value = "";
  renderAutomaty09();
}
