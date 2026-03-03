// =====================
// Config
// =====================
const IVA = 0.21;
const BCRA_BASE = "https://api.bcra.gob.ar/centraldedeudores/v1.0";

// =====================
// Helpers (format + utils)
// =====================
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

function fmtDateAR(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function situacionLabel(n) {
  const map = {
    1: "Normal",
    2: "Riesgo bajo",
    3: "Riesgo medio",
    4: "Riesgo alto",
    5: "Irrecuperable",
    6: "Irrecuperable (disp. técnica)",
  };
  return map[n] ?? String(n ?? "—");
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

function cleanDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function assertIdsExist(ids) {
  const missing = ids.filter((id) => !document.getElementById(id));
  if (missing.length) console.warn("Faltan elementos en el HTML:", missing);
}

// =====================
// Render BCRA table
// =====================
function renderBcraTable(entidades = []) {
  if (!entidades.length) {
    return `<div class="muted">Sin entidades informadas en el período.</div>`;
  }

  const rows = entidades
    .map((e) => {
      const entidad = e.entidad ?? "—";
      const sitNum = Number(e.situacion);
      const fecha = fmtDateAR(e.fechaSit1);
      const monto = fmtARS(Number(e.monto) || 0);
      const atraso = e.diasAtrasoPago ?? 0;

      const flags = [];
      if (e.refinanciaciones) flags.push("Refinanciación");
      if (e.recategorizacionOblig) flags.push("Recateg. oblig.");
      if (e.irrecDisposicionTecnica) flags.push("Irrec. disp. técnica");
      if (e.procesoJud) flags.push("Proceso judicial");
      if (e.enRevision) flags.push("En revisión");
      const flagsTxt = flags.length ? flags.join(", ") : "—";

      return `
        <tr>
          <td>${entidad}</td>
          <td>${situacionLabel(sitNum)}</td>
          <td>${fecha}</td>
          <td style="text-align:right;">${monto}</td>
          <td style="text-align:right;">${atraso}</td>
          <td>${flagsTxt}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="bcra-table">
      <thead>
        <tr>
          <th>Entidad</th>
          <th>Situación</th>
          <th>Fecha</th>
          <th style="text-align:right;">Monto</th>
          <th style="text-align:right;">Días atraso</th>
          <th>Alertas</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// =====================
// Notion formulas (1:1)
// =====================
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

// =====================
// Cálculo principal
// =====================
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

function calcular() {
  const { M, n, tna } = readInputs();

  if (!(M > 0) || !(n > 0) || tna < 0) {
    clearCalcUI();
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

// =====================
// BCRA - Central de Deudores
// =====================
let bcraAbort = null;

function bcraSetStatus(msg) {
  setText("bcraStatus", msg);
}

function bcraClearUI() {
  bcraSetStatus("");
  setText("bcraSummary", "—");
  setText("bcraDetails", "");
  const wrap = document.getElementById("bcraTableWrap");
  if (wrap) wrap.innerHTML = "";
}

function bcraPrettyJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "";
  }
}

function bcraSummarize(apiJson) {
  const r = apiJson?.results;
  const periodo = r?.periodos?.[0];
  const entidades = periodo?.entidades || [];

  const montoTotal = entidades.reduce((acc, e) => acc + (Number(e.monto) || 0), 0);
  const peorSituacion = entidades.reduce((m, e) => Math.max(m, Number(e.situacion) || 0), 0);

  return {
    denominacion: r?.denominacion ?? "",
    identificacion: r?.identificacion ?? "",
    periodo: periodo?.periodo ?? "",
    entidadesCount: entidades.length,
    montoTotal,
    peorSituacion,
  };
}

async function consultarBcraDeudas(identificacion11) {
  const url = `${BCRA_BASE}/Deudas/${identificacion11}`;

  // cache de sesión (opcional)
  const cacheKey = `bcra_deudas_${identificacion11}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      sessionStorage.removeItem(cacheKey);
    }
  }

  // abort anterior
  if (bcraAbort) bcraAbort.abort();
  bcraAbort = new AbortController();

  const resp = await fetch(url, { method: "GET", signal: bcraAbort.signal });

  if (!resp.ok) throw new Error(`BCRA respondió ${resp.status}`);

  const json = await resp.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(json));
  return json;
}

async function onClickConsultarBcra() {
  const cuitRaw = getEl("cuit")?.value ?? "";
  const consent = Boolean(getEl("bcraConsent")?.checked);
  const id = cleanDigits(cuitRaw);

  bcraClearUI();

  if (!consent) {
    bcraSetStatus("Marcá el consentimiento para consultar (dato sensible).");
    return;
  }

  if (id.length !== 11) {
    bcraSetStatus("Ingresá un CUIT/CUIL/CDI válido de 11 dígitos.");
    return;
  }

  bcraSetStatus("Consultando BCRA…");

  try {
    const json = await consultarBcraDeudas(id);
    const s = bcraSummarize(json);

    const summaryLines = [
      s.denominacion ? `Denominación: ${s.denominacion}` : null,
      s.periodo ? `Período: ${s.periodo}` : null,
      `Entidades informantes: ${s.entidadesCount}`,
      `Monto total informado: ${fmtARS(s.montoTotal)}`,
      `Peor situación (máx): ${Number.isFinite(s.peorSituacion) ? s.peorSituacion : "—"}`,
    ].filter(Boolean);

    setText("bcraSummary", summaryLines.join(" • "));
    setText("bcraDetails", bcraPrettyJson(json));

    const periodo = json?.results?.periodos?.[0];
    const entidades = periodo?.entidades || [];
    const wrap = document.getElementById("bcraTableWrap");
    if (wrap) wrap.innerHTML = renderBcraTable(entidades);

    bcraSetStatus("OK");
  } catch (err) {
    const msg = String(err?.message || err);

    if (msg.toLowerCase().includes("failed to fetch")) {
      bcraSetStatus("No se pudo consultar desde el navegador (probable CORS).");
    } else if (msg.toLowerCase().includes("abort")) {
      bcraSetStatus("Consulta cancelada.");
    } else {
      bcraSetStatus(`Error: ${msg}`);
    }
  }
}

// =====================
// Wire-up
// =====================
function init() {
  assertIdsExist([
    "monto", "plazo", "tna", "btn",
    "tasaMensual", "tea", "cftea", "cuotaSinIva", "interes1", "iva1", "cuota1",
    "saldoPrevio", "interesUlt", "ivaUlt", "cuotaUlt",
    "cuit", "bcraConsent", "btnBcra", "bcraStatus", "bcraSummary", "bcraDetails", "bcraTableWrap",
  ]);

  getEl("btn")?.addEventListener("click", () => calcular());

  ["monto", "plazo", "tna"].forEach((id) => {
    getEl(id)?.addEventListener("input", () => calcular());
  });

  getEl("btnBcra")?.addEventListener("click", onClickConsultarBcra);

  calcular();
  bcraClearUI();
}

document.addEventListener("DOMContentLoaded", init);
