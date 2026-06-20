const STORAGE_KEY = "football-event-labeling-v1";

const state = {
  annotations: [],
  videoObjectUrl: null,
  showAllRows: false,
};

const els = {
  annotatorInput: document.getElementById("annotatorInput"),
  videoNameInput: document.getElementById("videoNameInput"),
  videoFileInput: document.getElementById("videoFileInput"),
  fpsInput: document.getElementById("fpsInput"),
  fpsStatusText: document.getElementById("fpsStatusText"),
  helpToggleBtn: document.getElementById("helpToggleBtn"),
  helpModal: document.getElementById("helpModal"),
  helpCloseBtn: document.getElementById("helpCloseBtn"),
  videoPlayer: document.getElementById("videoPlayer"),
  currentTimeText: document.getElementById("currentTimeText"),
  timestampInput: document.getElementById("timestampInput"),
  actionSelect: document.getElementById("actionSelect"),
  visibilitySelect: document.getElementById("visibilitySelect"),
  teamSelect: document.getElementById("teamSelect"),
  notesInput: document.getElementById("notesInput"),
  annotationsBody: document.getElementById("annotationsBody"),
  countText: document.getElementById("countText"),
  heroCountText: document.getElementById("heroCountText"),
  headerCountText: document.getElementById("headerCountText"),
  nonHeaderCountText: document.getElementById("nonHeaderCountText"),
  searchInput: document.getElementById("searchInput"),
  toggleRowsBtn: document.getElementById("toggleRowsBtn"),
  csvFileInput: document.getElementById("csvFileInput"),
};

function pad(num, size = 2) {
  return String(num).padStart(size, "0");
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`;
}

function parseTimeToSeconds(value) {
  const raw = String(value || "").trim();
  if (!raw) return NaN;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);

  const parts = raw.split(":");
  if (parts.length < 2 || parts.length > 3) return NaN;

  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length ? Number(parts.pop()) : 0;
  if ([hours, minutes, seconds].some((v) => Number.isNaN(v))) return NaN;
  return hours * 3600 + minutes * 60 + seconds;
}

function binaryLabelForAction(action) {
  return action === "HEADER" ? 1 : 0;
}

function saveState() {
  const payload = {
    annotations: state.annotations,
    annotator: els.annotatorInput.value,
    videoName: els.videoNameInput.value,
    fps: els.fpsInput.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    state.annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
    els.annotatorInput.value = payload.annotator || "";
    els.videoNameInput.value = payload.videoName || "";
    els.fpsInput.value = payload.fps || "25";
  } catch {
    state.annotations = [];
  }
}

function currentVideoName() {
  return els.videoNameInput.value.trim() || els.videoFileInput.files?.[0]?.name || "unknown_video";
}

function useCurrentTime() {
  els.timestampInput.value = formatTime(els.videoPlayer.currentTime || 0);
}

function addAnnotation(actionOverride = null) {
  const action = actionOverride || els.actionSelect.value;
  const timestamp = els.timestampInput.value.trim() || formatTime(els.videoPlayer.currentTime || 0);
  const seconds = parseTimeToSeconds(timestamp);
  if (Number.isNaN(seconds)) {
    alert("Timestamp must look like 00:13:20.100 or 800.5");
    return;
  }

  const annotation = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    video_name: currentVideoName(),
    timestamp: formatTime(seconds),
    seconds: Number(seconds.toFixed(3)),
    action,
    binary_label: binaryLabelForAction(action),
    visibility: els.visibilitySelect.value,
    team: els.teamSelect.value,
    annotator: els.annotatorInput.value.trim(),
    notes: els.notesInput.value.trim(),
    created_at: new Date().toISOString(),
  };

  state.annotations.push(annotation);
  state.annotations.sort((a, b) => {
    const videoCompare = String(a.video_name).localeCompare(String(b.video_name));
    return videoCompare || Number(a.seconds) - Number(b.seconds);
  });
  els.notesInput.value = "";
  renderAnnotations();
  saveState();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAnnotations() {
  const query = els.searchInput.value.trim().toLowerCase();
  const rows = state.annotations.filter((row) => {
    if (!query) return true;
    return Object.values(row).join(" ").toLowerCase().includes(query);
  });
  const visibleRows = state.showAllRows ? rows : rows.slice(0, 10);

  els.countText.textContent = `${state.annotations.length} rows`;
  const headerCount = state.annotations.filter((row) => Number(row.binary_label) === 1).length;
  els.heroCountText.textContent = String(state.annotations.length);
  els.headerCountText.textContent = String(headerCount);
  els.nonHeaderCountText.textContent = String(state.annotations.length - headerCount);
  els.toggleRowsBtn.hidden = rows.length <= 10;
  els.toggleRowsBtn.textContent = state.showAllRows ? "Show first 10 rows" : `Show all ${rows.length} rows`;

  els.annotationsBody.innerHTML = visibleRows
    .map((row, index) => {
      const binaryClass = row.binary_label === 1 ? "binary-one" : "binary-zero";
      const binaryText = row.binary_label === 1 ? "1 header" : "0 non-header";
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.video_name)}</td>
          <td class="mono">${escapeHtml(row.timestamp)}</td>
          <td class="mono">${escapeHtml(row.seconds)}</td>
          <td>${escapeHtml(row.action)}</td>
          <td><span class="binary-pill ${binaryClass}">${binaryText}</span></td>
          <td>${escapeHtml(row.visibility)}</td>
          <td>${escapeHtml(row.team)}</td>
          <td>${escapeHtml(row.annotator)}</td>
          <td>${escapeHtml(row.notes)}</td>
          <td><button data-delete-id="${escapeHtml(row.id)}" class="danger">Delete</button></td>
        </tr>
      `;
    })
    .join("");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  const headers = [
    "video_name",
    "timestamp",
    "seconds",
    "action",
    "binary_label",
    "visibility",
    "team",
    "annotator",
    "notes",
    "created_at",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => csvEscape(row[key])).join(","));
  }
  return lines.join("\n");
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const date = new Date().toISOString().slice(0, 10);
  downloadText(`football_annotations_${date}.csv`, toCsv(state.annotations), "text/csv;charset=utf-8");
}

function exportJson() {
  const date = new Date().toISOString().slice(0, 10);
  downloadText(
    `football_annotations_${date}.json`,
    JSON.stringify(state.annotations, null, 2),
    "application/json;charset=utf-8",
  );
}

function parseCsvLine(line) {
  const result = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  result.push(value);
  return result;
}

function importCsvText(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return;
  const headers = parseCsvLine(lines[0]);
  const imported = [];
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const seconds = Number(row.seconds || parseTimeToSeconds(row.timestamp));
    imported.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      video_name: row.video_name || row.video || "unknown_video",
      timestamp: row.timestamp || formatTime(seconds),
      seconds: Number.isNaN(seconds) ? 0 : Number(seconds.toFixed(3)),
      action: row.action || "OTHER",
      binary_label: Number(row.binary_label ?? binaryLabelForAction(row.action)),
      visibility: row.visibility || "visible",
      team: row.team || "",
      annotator: row.annotator || "",
      notes: row.notes || "",
      created_at: row.created_at || new Date().toISOString(),
    });
  }
  state.annotations = [...state.annotations, ...imported];
  renderAnnotations();
  saveState();
}

function bindEvents() {
  els.helpToggleBtn.addEventListener("click", toggleHelpModal);
  els.helpCloseBtn.addEventListener("click", closeHelpModal);
  els.helpModal.addEventListener("click", (event) => {
    if (event.target === els.helpModal) closeHelpModal();
  });

  els.videoFileInput.addEventListener("change", () => {
    const file = els.videoFileInput.files?.[0];
    if (!file) return;
    if (state.videoObjectUrl) URL.revokeObjectURL(state.videoObjectUrl);
    state.videoObjectUrl = URL.createObjectURL(file);
    els.videoPlayer.src = state.videoObjectUrl;
    els.videoNameInput.value = file.name;
    els.fpsStatusText.textContent = "FPS will auto-detect after playback starts when supported.";
    saveState();
  });

  els.videoPlayer.addEventListener("timeupdate", () => {
    els.currentTimeText.textContent = formatTime(els.videoPlayer.currentTime || 0);
  });
  els.videoPlayer.addEventListener("play", estimateFpsOnce);

  document.getElementById("copyCurrentTimeBtn").addEventListener("click", useCurrentTime);
  document.getElementById("markHeaderBtn").addEventListener("click", () => {
    if (els.actionSelect.value !== "HEADER") {
      alert(`${els.actionSelect.value} belongs to NON-HEADER. Select HEADER before using the header button.`);
      return;
    }
    useCurrentTime();
    addAnnotation("HEADER");
  });
  document.getElementById("markNonHeaderBtn").addEventListener("click", () => {
    if (els.actionSelect.value === "HEADER") {
      alert("HEADER belongs to the header class. Select a non-header action before using the non-header button.");
      return;
    }
    useCurrentTime();
    addAnnotation(els.actionSelect.value);
  });
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);

  document.getElementById("playPauseBtn").addEventListener("click", () => {
    if (els.videoPlayer.paused) els.videoPlayer.play();
    else els.videoPlayer.pause();
  });

  document.getElementById("backOneSecBtn").addEventListener("click", () => {
    els.videoPlayer.currentTime = Math.max(0, els.videoPlayer.currentTime - 1);
  });
  document.getElementById("forwardOneSecBtn").addEventListener("click", () => {
    els.videoPlayer.currentTime = Math.min(els.videoPlayer.duration || Infinity, els.videoPlayer.currentTime + 1);
  });
  document.getElementById("backFrameBtn").addEventListener("click", () => stepFrame(-1));
  document.getElementById("forwardFrameBtn").addEventListener("click", () => stepFrame(1));

  els.annotationsBody.addEventListener("click", (event) => {
    const id = event.target?.dataset?.deleteId;
    if (!id) return;
    state.annotations = state.annotations.filter((row) => row.id !== id);
    renderAnnotations();
    saveState();
  });

  els.searchInput.addEventListener("input", renderAnnotations);
  els.toggleRowsBtn.addEventListener("click", () => {
    state.showAllRows = !state.showAllRows;
    renderAnnotations();
  });
  [els.annotatorInput, els.videoNameInput, els.fpsInput].forEach((input) => {
    input.addEventListener("change", saveState);
  });

  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (!confirm("Delete all saved annotations from this browser? Export first if you need them.")) return;
    state.annotations = [];
    renderAnnotations();
    saveState();
  });

  document.getElementById("importCsvBtn").addEventListener("click", () => els.csvFileInput.click());
  els.csvFileInput.addEventListener("change", async () => {
    const file = els.csvFileInput.files?.[0];
    if (!file) return;
    importCsvText(await file.text());
    els.csvFileInput.value = "";
  });

  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    if (event.code === "Space") {
      event.preventDefault();
      if (els.videoPlayer.paused) els.videoPlayer.play();
      else els.videoPlayer.pause();
    } else if (event.key.toLowerCase() === "h") {
      if (els.actionSelect.value !== "HEADER") {
        alert(`${els.actionSelect.value} belongs to NON-HEADER. Select HEADER before using the header shortcut.`);
        return;
      }
      useCurrentTime();
      addAnnotation("HEADER");
    } else if (event.key.toLowerCase() === "n") {
      if (els.actionSelect.value === "HEADER") {
        alert("HEADER belongs to the header class. Select a non-header action before using the non-header shortcut.");
        return;
      }
      useCurrentTime();
      addAnnotation(els.actionSelect.value);
    } else if (event.key.toLowerCase() === "a") {
      useCurrentTime();
    } else if (event.key === "ArrowLeft") {
      stepFrame(-1);
    } else if (event.key === "ArrowRight") {
      stepFrame(1);
    } else if (event.key === "Escape") {
      closeHelpModal();
    }
  });
}

function openHelpModal() {
  els.helpModal.hidden = false;
  els.helpToggleBtn.setAttribute("aria-expanded", "true");
}

function closeHelpModal() {
  els.helpModal.hidden = true;
  els.helpToggleBtn.setAttribute("aria-expanded", "false");
}

function toggleHelpModal() {
  if (els.helpModal.hidden) openHelpModal();
  else closeHelpModal();
}

function estimateFpsOnce() {
  if (els.videoPlayer.dataset.fpsEstimated === "1") return;
  if (!("requestVideoFrameCallback" in HTMLVideoElement.prototype)) {
    els.fpsStatusText.textContent = "FPS auto-detect not supported here; using current value.";
    return;
  }

  els.videoPlayer.dataset.fpsEstimated = "1";
  const mediaTimes = [];
  const maxSamples = 18;

  const collect = (_now, metadata) => {
    if (typeof metadata.mediaTime === "number") {
      mediaTimes.push(metadata.mediaTime);
    }
    if (mediaTimes.length < maxSamples && !els.videoPlayer.paused) {
      els.videoPlayer.requestVideoFrameCallback(collect);
      return;
    }

    const deltas = [];
    for (let index = 1; index < mediaTimes.length; index += 1) {
      const delta = mediaTimes[index] - mediaTimes[index - 1];
      if (delta > 0) deltas.push(delta);
    }
    if (!deltas.length) {
      els.fpsStatusText.textContent = "Could not auto-detect FPS; using current value.";
      return;
    }
    const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
    const estimatedFps = Math.round(1 / averageDelta);
    if (estimatedFps >= 1 && estimatedFps <= 120) {
      els.fpsInput.value = String(estimatedFps);
      els.fpsStatusText.textContent = `Auto-detected about ${estimatedFps} FPS.`;
      saveState();
    }
  };

  els.videoPlayer.requestVideoFrameCallback(collect);
}

function stepFrame(direction) {
  const fps = Math.max(1, Number(els.fpsInput.value) || 25);
  els.videoPlayer.pause();
  els.videoPlayer.currentTime = Math.max(0, els.videoPlayer.currentTime + direction / fps);
}

loadState();
bindEvents();
renderAnnotations();
els.currentTimeText.textContent = formatTime(0);
