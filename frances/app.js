const IVA = 0.21;

function fmtARS(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 4,
  }).format(n);
}

async function logSimulacion(data) {
  try {
    await fetch("https://y-loki-api.sanchezagus-1995.workers.dev/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error("Error enviando log:", err);
  }
}

function pow(a, b) {
  return Math.pow(a, b);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getEl(id) {
  return document.getElementById(id);
}

function tasaMensualFromTNA(tnaPct) {
  return (tnaPct / 100) / 12;
}

function cuotaFijaSinIVA(M, n, i) {
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
  return pow(1 + i, 12) - 1;
}

function cftea(i) {
  return pow(1 + i * (1 + IVA), 12) - 1;
}

function readInputs() {
  const M = Number(getEl("monto")?.value || 0);
  const n = Number(getEl("plazo")?.value || 0);
  const tna = Number(getEl("tna")?.value || 0);
  return { M, n, tna };
}

function clearCalcUI() {
  [
    "tasaMensual",
    "tea",
    "cftea",
    "cuotaSinIva",
    "interes1",
    "iva1",
    "cuota1",
    "saldoPrevio",
    "interesUlt",
    "ivaUlt",
    "cuotaUlt",
  ].forEach((id) => setText(id, "—"));
}

function setStatus(msg) {
  setText("status", msg || "");
}

function calcular() {
  const { M, n, tna } = readInputs();

  if (!(M > 0) || !(n > 0) || tna < 0) {
    clearCalcUI();
    setStatus("Ingresá un monto, plazo y TNA válidos.");
    return null;
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

  setStatus("Simulación calculada.");

  logSimulacion({
    simulador: "frances",
    monto: M,
    plazo: n,
    tna,
    cuota1,
    cuotaUlt,
    timestamp: new Date().toISOString()
  });

  return {
    M,
    n,
    tna,
    i,
    cuotaSinIva,
    interes1,
    iva1,
    cuota1,
    saldoPrev,
    interesUlt,
    ivaUlt,
    cuotaUlt,
  };
}

async function copiarResultado() {
  const monto = getEl("monto")?.value || "—";
  const plazo = getEl("plazo")?.value || "—";
  const tna = getEl("tna")?.value || "—";

  const tasaMensual = getEl("tasaMensual")?.textContent || "—";
  const teaTxt = getEl("tea")?.textContent || "—";
  const cfteaTxt = getEl("cftea")?.textContent || "—";
  const cuotaSinIva = getEl("cuotaSinIva")?.textContent || "—";
  const interes1 = getEl("interes1")?.textContent || "—";
  const iva1 = getEl("iva1")?.textContent || "—";
  const cuota1 = getEl("cuota1")?.textContent || "—";
  const saldoPrevio = getEl("saldoPrevio")?.textContent || "—";
  const interesUlt = getEl("interesUlt")?.textContent || "—";
  const ivaUlt = getEl("ivaUlt")?.textContent || "—";
  const cuotaUlt = getEl("cuotaUlt")?.textContent || "—";

  const texto = [
    "Simulación Sistema Francés",
    "",
    `Monto: ${monto}`,
    `Plazo: ${plazo} meses`,
    `TNA: ${tna} %`,
    "",
    `Tasa mensual: ${tasaMensual}`,
    `TEA: ${teaTxt}`,
    `CFTEA: ${cfteaTxt}`,
    `Cuota sin IVA: ${cuotaSinIva}`,
    `Interés 1° cuota: ${interes1}`,
    `IVA 1° cuota: ${iva1}`,
    `Cuota 1: ${cuota1}`,
    `Saldo previo última: ${saldoPrevio}`,
    `Interés última: ${interesUlt}`,
    `IVA última: ${ivaUlt}`,
    `Cuota última: ${cuotaUlt}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(texto);
    setStatus("Resultado copiado.");
  } catch (err) {
    console.error(err);
    setStatus("No se pudo copiar el resultado.");
  }
}

function init() {
  getEl("btn")?.addEventListener("click", calcular);
  getEl("btnCopiar")?.addEventListener("click", copiarResultado);
  setStatus("");
}

document.addEventListener("DOMContentLoaded", init);
