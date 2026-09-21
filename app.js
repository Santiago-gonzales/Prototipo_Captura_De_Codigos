const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", {
  willReadFrequently: true
});

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const countEl = document.getElementById("count");
const emptyEl = document.getElementById("empty");
const snapshotResultsEl = document.getElementById("snapshotResults");
const snapshotCountEl = document.getElementById("snapshotCount");
const snapshotDifferentCountEl = document.getElementById("snapshotDifferentCount");
const snapshotEmptyEl = document.getElementById("snapshotEmpty");

let stream = null;
let running = false;
let scanning = false;
let analyzingSnapshot = false;
let lastScan = 0;
let lastSnapshotEntries = null;

const codes = new Set();
const multiCodeOptions = {
  tryHarder: true,
  maxNumberOfSymbols: 20
};

function setStatus(text) {
  statusEl.textContent = text;
}

function renderResults() {
  resultsEl.innerHTML = "";

  const entries = [...codes].sort((a, b) => a.localeCompare(b));

  countEl.textContent =
    `${entries.length} código${entries.length === 1 ? "" : "s"} únicos`;

  emptyEl.style.display = entries.length ? "none" : "block";

  for (const value of entries) {
    const row = document.createElement("div");
    row.className = "code-row";

    const code = document.createElement("div");
    code.className = "code-value";
    code.textContent = value;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = "Detectado";

    row.append(code, badge);
    resultsEl.appendChild(row);
  }
}

function addDetectedCodes(results) {
  let newCodes = 0;
  const frameCodes = new Set();

  for (const result of results) {
    const value = String(result.text || "").trim();

    if (value) {
      frameCodes.add(value);
    }
  }

  for (const value of frameCodes) {
    if (!codes.has(value)) {
      codes.add(value);
      newCodes++;
    }
  }

  if (newCodes > 0) {
    renderResults();
  }

  return {
    frameCount: frameCodes.size,
    newCodes
  };
}

function renderSnapshotResults(results) {
  const counts = new Map();

  for (const result of results) {
    const value = String(result.text || "").trim();

    if (value) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  const entries = [...counts.entries()]
    .sort(([valueA], [valueB]) => valueA.localeCompare(valueB));
  const totalFound = entries.reduce(
    (total, [, count]) => total + count,
    0
  );

  lastSnapshotEntries = entries.map(([value, count]) => ({
    value,
    count
  }));

  snapshotResultsEl.innerHTML = "";
  snapshotCountEl.textContent =
    `Códigos encontrados: ${totalFound}`;
  snapshotDifferentCountEl.textContent =
    `Códigos diferentes: ${entries.length}`;
  snapshotEmptyEl.style.display = entries.length ? "none" : "block";

  for (const [value, count] of entries) {
    const row = document.createElement("div");
    row.className = "code-row";

    const code = document.createElement("div");
    code.className = "code-value";
    code.textContent = value;

    const quantity = document.createElement("div");
    quantity.className = "code-quantity";
    quantity.textContent = count;

    row.append(code, quantity);
    snapshotResultsEl.appendChild(row);
  }
}

async function decodeCurrentFrame() {
  if (!video.videoWidth || !video.videoHeight) {
    return [];
  }

  if (!window.ZXingWASM) {
    throw new Error(
      "No se pudo cargar ZXing WebAssembly."
    );
  }

  const maxWidth = 1280;

  const scale = Math.min(
    1,
    maxWidth / video.videoWidth
  );

  const width = Math.max(
    1,
    Math.round(video.videoWidth * scale)
  );

  const height = Math.max(
    1,
    Math.round(video.videoHeight * scale)
  );

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    video,
    0,
    0,
    width,
    height
  );

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const results = await ZXingWASM.readBarcodes(
    imageData,
    multiCodeOptions
  );

  return results;
}

async function scanLoop(timestamp) {
  if (!running) {
    return;
  }

  if (
    !scanning &&
    timestamp - lastScan >= 500
  ) {
    lastScan = timestamp;
    scanning = true;

    try {
      const results = await decodeCurrentFrame();

      if (results.length > 0) {
        const frameSummary = addDetectedCodes(results);

        setStatus(
          `${frameSummary.frameCount} código(s) en el frame / ` +
          `${frameSummary.newCodes} nuevo(s)`
        );

        console.log(
          "Códigos detectados:",
          results
        );
      } else {
        setStatus("Buscando código...");
      }

    } catch (error) {

      console.error(
        "Error leyendo código:",
        error
      );

      setStatus(
        "Error al analizar la imagen."
      );

    } finally {
      scanning = false;
    }
  }

  requestAnimationFrame(scanLoop);
}

async function startCamera() {
  try {

    if (!window.isSecureContext) {
      throw new Error(
        "La cámara requiere HTTPS o localhost."
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Este navegador no permite acceder a la cámara."
      );
    }

    if (!window.ZXingWASM) {
      throw new Error(
        "ZXing WebAssembly no está cargado. Revisa tu conexión a Internet."
      );
    }

    stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          },
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
        },
        audio: false
      });

    video.srcObject = stream;

    await video.play();

    running = true;

    startBtn.disabled = true;
    stopBtn.disabled = false;
    analyzeBtn.disabled = false;

    setStatus(
      "Cámara activa. Apunta al código de barras."
    );

    requestAnimationFrame(scanLoop);

  } catch (error) {

    console.error(error);

    setStatus(
      error.message ||
      "No fue posible iniciar la cámara."
    );
  }
}

function stopCamera() {

  running = false;

  if (stream) {

    stream
      .getTracks()
      .forEach(track => track.stop());

    stream = null;
  }

  video.srcObject = null;

  startBtn.disabled = false;
  stopBtn.disabled = true;
  analyzeBtn.disabled = true;

  setStatus(
    "Cámara detenida."
  );
}

async function analyzeCurrentImage() {
  if (!running || analyzingSnapshot) {
    return;
  }

  analyzingSnapshot = true;
  analyzeBtn.disabled = true;
  setStatus("Analizando una captura...");

  try {
    const results = await decodeCurrentFrame();

    renderSnapshotResults(results);

    console.log(
      "Resultado completo de readBarcodes():",
      results
    );

    setStatus(
      `Captura analizada: ${results.length} resultado(s) de ZXing.`
    );
  } catch (error) {
    console.error(
      "Error analizando la captura:",
      error
    );

    setStatus("Error al analizar la imagen.");
  } finally {
    analyzingSnapshot = false;
    analyzeBtn.disabled = !running;
  }
}

function exportLastSnapshot() {
  if (lastSnapshotEntries === null) {
    alert("Primero debes analizar una imagen.");
    return;
  }

  if (!window.XLSX) {
    alert("No se pudo cargar la biblioteca para crear el archivo Excel.");
    return;
  }

  const rows = [
    ["Código", "Cantidad"],
    ...lastSnapshotEntries.map(({ value, count }) => [value, count])
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Captura");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(
    workbook,
    `captura_codigos_${today}.xlsx`
  );
}

function clearResults() {

  codes.clear();

  renderResults();

  setStatus(
    running
      ? "Resultados limpiados. Continúa la prueba."
      : "Resultados limpiados."
  );
}

startBtn.addEventListener(
  "click",
  startCamera
);

stopBtn.addEventListener(
  "click",
  stopCamera
);

analyzeBtn.addEventListener(
  "click",
  analyzeCurrentImage
);

exportBtn.addEventListener(
  "click",
  exportLastSnapshot
);

clearBtn.addEventListener(
  "click",
  clearResults
);

window.addEventListener(
  "beforeunload",
  stopCamera
);

renderResults();