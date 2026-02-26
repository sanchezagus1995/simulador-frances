const IVA = 0.21;

// ====== helpers ======
function fmtARS(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(n);
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 4
  }).format(n);
}

function pow(a, b) {
  return Math.pow(a, b);
}

// ====== Notion formulas (1:1) ======
function tasaMensualFromTNA(tnaPct) {
  // tasa mensual = TNA / 100 / 12
  return (tnaPct / 100) / 12;
}

function cuotaFijaSinIVA(M, n, i) {
  // if(i == 0, M/n, M * ( i / ( 1 - pow(1 + i, -n) ) ))
  if (i === 0) return M / n;
  return M * (i / (1 - pow(1 + i, -n)));
}

function interesPrimerMes(M, i) {
  return M * i;
}

function ivaPrimerMes(interes1) {
  return interes1 * IVA;
}

function saldoPrevio(M, i, n) {
  // M * ( ((1+i)^n - (1+i)^(n-1)) / ((1+i)^n - 1) )
  const aN = pow(1 + i, n);
  const aN_1 = pow(1 + i, n - 1);
  const num = aN - aN_1;
  const den = aN - 1;
  if (den === 0) return NaN;
  return M * (num / den);
}

function interesUltima(saldoPrev, i) {
  return saldoPrev * i;
}

function ivaUltima(interesUlt) {
  return interesUlt * IVA;
}

function tea(i) {
  // (1+i)^12 - 1
  return pow(1 + i, 12) - 1;
}

function cftea(i) {
  // (1 + i*(1+iva))^12 - 1
  return pow(1 + i * (1 + IVA), 12) - 1;
}

// ====== UI ======
function readInputs() {
  const M = Number(document.getElementById("monto").value || 0);
  const n = Number(document.getElementById("plazo").value || 0);
  const tna = Number(document.getElementById("tna").value || 0);
  return { M, n, tna };
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function calcular() {
  const { M, n, tna } = readInputs();
  if (!(M > 0) || !(n > 0) || tna < 0) {
    // limpia si está mal
    ["tasaMensual","tea","cftea","cuotaSinIva","interes1","iva1","cuota1","saldoPrevio","interesUlt","ivaUlt","cuotaUlt"]
      .forEach(id => setText(id, "—"));
    return;
  }

  const i = tasaMensualFromTNA(tna);

  const cuotaSinIva = cuotaFijaSinIVA(M, n, i);

  const interes1 = interesPrimerMes(M, i);
  const iva1 = ivaPrimerMes(interes1);
  const cuota1 = cuotaSinIva + iva1;

  const saldoPrev = saldoPrevio(M, i, n);
  const interesUlt = interesUltima(saldoPrev, i);
  const ivaUlt = ivaUltima(interesUlt);
  const cuotaUlt = saldoPrev + interesUlt + ivaUlt;

  setText("tasaMensual", fmtPct(i));
  setText("tea", fmtPct(tea(i)));
  setText("cftea", fmtPct(cftea(i)));

  setText("cuotaSinIva", fmtARS(cuotaSinIva));

  setText("interes1", fmtARS(interes1));
  setText("iva1", fmtARS(iva1));
  setText("cuota1", fmtARS(cuota1));

  setText("saldoPrevio", fmtARS(saldoPrev));
  setText("interesUlt", fmtARS(interesUlt));
  setText("ivaUlt", fmtARS(ivaUlt));
  setText("cuotaUlt", fmtARS(cuotaUlt));
}

document.getElementById("btn").addEventListener("click", calcular);

document.getElementById("btnEj").addEventListener("click", () => {
  document.getElementById("monto").value = 1000000;
  document.getElementById("plazo").value = 24;
  document.getElementById("tna").value = 120;
  calcular();
});

// calcula al cargar
calcular();
