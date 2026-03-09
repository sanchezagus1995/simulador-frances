(function () {
  function getBadgeClass(situacion) {
    const s = Number(situacion);
    if (!Number.isFinite(s)) return "warn";
    if (s <= 1) return "ok";
    if (s === 2) return "warn";
    return "bad";
  }

  function getBadgeText(situacion) {
    const s = Number(situacion);
    if (!Number.isFinite(s)) return "Sin dato";
    if (s <= 1) return "Apto";
    if (s === 2) return "Revisar";
    return "Rechazado";
  }

  function buildMarkup(instanceId) {
    return `
      <section class="card bcra-card">
        <h2 class="bcra-title">Situación crediticia</h2>

        <div class="bcra-grid">
          <label class="bcra-label">
            CUIL
            <input
              id="${instanceId}-cuil"
              class="bcra-input"
              type="text"
              inputmode="numeric"
              placeholder="20XXXXXXXXX"
            >
          </label>

          <label class="bcra-label">
            Tipo de documento
            <select id="${instanceId}-doc" class="bcra-select">
              <option value="cuil" selected>CUIL</option>
              <option value="dni">DNI</option>
            </select>
          </label>
        </div>

        <div class="bcra-row">
          <button id="${instanceId}-btn" class="bcra-btn" type="button">
            Consultar BCRA
          </button>
          <button id="${instanceId}-copy" class="bcra-btn ghost" type="button">
            Copiar resultado
          </button>
        </div>

        <div id="${instanceId}-status" class="bcra-status muted"></div>

        <div id="${instanceId}-result" class="bcra-result" style="display:none;">
          <div id="${instanceId}-badge" class="bcra-badge warn">Sin dato</div>
          <div id="${instanceId}-meta" class="bcra-meta"></div>
        </div>
      </section>
    `;
  }

  async function defaultFetcher({ cuil, docType }) {
    const url = `https://api.bcra.gob.ar/centraldedeudores/v1.0`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }

    return res.json();
  }

  function normalizeResult(data) {
    const situacion =
      data?.situacion ??
      data?.resultado?.situacion ??
      data?.result?.situacion ??
      data?.status?.situacion ??
      null;

    const periodo =
      data?.periodo ??
      data?.resultado?.periodo ??
      data?.result?.periodo ??
      "—";

    const entidad =
      data?.entidad ??
      data?.resultado?.entidad ??
      data?.result?.entidad ??
      "—";

    const mensaje =
      data?.mensaje ??
      data?.resultado?.mensaje ??
      data?.result?.mensaje ??
      "";

    return { situacion, periodo, entidad, mensaje, raw: data };
  }

  function attachBehavior(instanceId, options = {}) {
    const input = document.getElementById(`${instanceId}-cuil`);
    const docType = document.getElementById(`${instanceId}-doc`);
    const btn = document.getElementById(`${instanceId}-btn`);
    const copyBtn = document.getElementById(`${instanceId}-copy`);
    const status = document.getElementById(`${instanceId}-status`);
    const result = document.getElementById(`${instanceId}-result`);
    const badge = document.getElementById(`${instanceId}-badge`);
    const meta = document.getElementById(`${instanceId}-meta`);

    const fetcher = options.fetcher || defaultFetcher;

    let lastText = "";

    btn.addEventListener("click", async () => {
      const value = (input.value || "").trim();

      if (!value) {
        status.textContent = "Ingresá un CUIL o DNI para consultar.";
        result.style.display = "none";
        return;
      }

      status.textContent = "Consultando BCRA...";
      result.style.display = "none";

      try {
        const data = await fetcher({
          cuil: value,
          docType: docType.value
        });

        const normalized = normalizeResult(data);
        const situacion = normalized.situacion;
        const badgeClass = getBadgeClass(situacion);
        const badgeText = getBadgeText(situacion);

        badge.className = `bcra-badge ${badgeClass}`;
        badge.textContent = `${badgeText}${situacion != null ? ` · Situación ${situacion}` : ""}`;

        meta.innerHTML = `
          <div><strong>Período:</strong> ${normalized.periodo}</div>
          <div><strong>Entidad:</strong> ${normalized.entidad}</div>
          ${normalized.mensaje ? `<div><strong>Detalle:</strong> ${normalized.mensaje}</div>` : ""}
        `;

        lastText =
`BCRA
Documento: ${value}
Estado: ${badgeText}${situacion != null ? ` (Situación ${situacion})` : ""}
Período: ${normalized.periodo}
Entidad: ${normalized.entidad}
${normalized.mensaje ? `Detalle: ${normalized.mensaje}` : ""}`.trim();

        status.textContent = "";
        result.style.display = "block";
      } catch (error) {
        status.textContent = "No se pudo consultar BCRA.";
        result.style.display = "none";
        console.error(error);
      }
    });

    copyBtn.addEventListener("click", async () => {
      if (!lastText) {
        status.textContent = "Todavía no hay resultado para copiar.";
        return;
      }

      try {
        await navigator.clipboard.writeText(lastText);
        status.textContent = "Resultado copiado.";
      } catch (error) {
        status.textContent = "No se pudo copiar el resultado.";
        console.error(error);
      }
    });
  }

  function renderBcraBlock(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const instanceId = options.instanceId || `bcra-${containerId}`;
    container.innerHTML = buildMarkup(instanceId);
    attachBehavior(instanceId, options);
  }

  window.renderBcraBlock = renderBcraBlock;
})();
