/* Konfigurator prowizji: presety warunkow, progi i odczyt warunkow z formularza. Tylko deklaracje. */
var PRESETY = {
  A: { kumulacja: "miesieczny", sposob: "od_calosci", stala: null, progi: [{ od: 0, st: 10 }, { od: 50000, st: 12 }] },
  A2: { kumulacja: "miesieczny", sposob: "od_calosci", stala: null, progi: [{ od: 0, st: 12 }, { od: 60000, st: 10 }] },
  Y1: { kumulacja: "roczny", sposob: "od_nadwyzki", stala: null, progi: [{ od: 0, st: 20 }, { od: 500000, st: 10 }, { od: 1000000, st: 5 }] },
  B: { kumulacja: "roczny", sposob: "od_nadwyzki", stala: null, progi: [{ od: 0, st: 20 }, { od: 500000, st: 17.5 }, { od: 1000000, st: 15 }] },
  C: { kumulacja: "miesieczny", sposob: "od_nadwyzki", stala: null, progi: [{ od: 0, st: 18 }, { od: 100000, st: 14 }, { od: 200000, st: 10 }] },
  D: { kumulacja: "brak", sposob: "stala", stala: 20, progi: [] }
};

var progi = [];
var faktury = [];

function warunki() {
  var kum = document.getElementById("kumulacja").value;
  return {
    kumulacja: kum,
    sposob: kum === "brak" ? "stala" : document.getElementById("sposob").value,
    stala: parseFloat(document.getElementById("stala").value) || 20,
    progi: progi.slice().sort(function (a, b) { return a.od - b.od; })
  };
}

function renderProgi() {
  document.getElementById("progi").innerHTML = progi.map(function (p, i) {
    return '<div class="prog-row">' +
      '<span class="lab">' + (i === 0 ? "od 0 zł" : "powyżej") + '</span>' +
      (i === 0 ? '<input class="inp num" value="0" disabled>'
               : '<input class="inp num" value="' + p.od + '" onchange="progi[' + i + '].od=parseFloat(this.value)||0;przelicz()">') +
      '<span class="lab" style="width:auto;flex:0 0 auto">stawka</span>' +
      '<input class="inp num" style="width:78px" value="' + p.st + '" onchange="progi[' + i + '].st=parseFloat(this.value)||0;przelicz()">' +
      '<span class="lab" style="width:auto;flex:0 0 auto">%</span>' +
      (i > 0 ? '<button class="btn xs danger" onclick="progi.splice(' + i + ',1);renderProgi();przelicz()">&times;</button>' : "") +
      '</div>';
  }).join("");
}
function dodajProg() {
  var ost = progi[progi.length - 1];
  progi.push({ od: (ost ? ost.od + 100000 : 100000), st: (ost ? Math.max(0, ost.st - 2) : 15) });
  renderProgi(); przelicz();
}

function przelaczWidoki() {
  var brak = document.getElementById("kumulacja").value === "brak";
  document.getElementById("wrapStala").style.display = brak ? "" : "none";
  document.getElementById("wrapProgi").style.display = brak ? "none" : "";
  document.getElementById("wrapSposob").style.display = brak ? "none" : "";
}

/* Obsluga zdarzen formularza warunkow i presetow, wywolywana z inicjalizacji strony */
function podlacz15() {
  document.getElementById("preset").addEventListener("change", function () {
    var p = PRESETY[this.value];
    document.getElementById("kumulacja").value = p.kumulacja;
    document.getElementById("sposob").value = p.sposob === "stala" ? "od_calosci" : p.sposob;
    document.getElementById("stala").value = p.stala || 20;
    progi = JSON.parse(JSON.stringify(p.progi));
    przelaczWidoki(); renderProgi(); przelicz();
  });
  document.getElementById("kumulacja").addEventListener("change", function () { przelaczWidoki(); przelicz(); });
  document.getElementById("sposob").addEventListener("change", przelicz);
  document.getElementById("stala").addEventListener("input", przelicz);
  document.getElementById("nadpisz").addEventListener("input", przelicz);
}
