const appState = {
  logOffset: 0,
  polling: null,
};

const stageProgress = {
  EN_ATTENTE: 10,
  LANCEMENT: 20,
  TRANSCRIPTION: 45,
  TRADUCTION: 70,
  RENDU: 90,
  TERMINE: 100,
  ECHEC: 100,
};

function getToken() {
  return localStorage.getItem("app_token") || "";
}

function setToken(token) {
  localStorage.setItem("app_token", token);
}

function authHeaders() {
  const token = getToken();
  return token ? { "X-Token": token } : {};
}

async function fetchJson(url, options = {}) {
  const headers = { ...(options.headers || {}), ...authHeaders() };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || "Erreur API");
  }
  return response.json();
}

function initDropZone() {
  const dropZone = document.getElementById("drop-zone");
  if (!dropZone) return;
  const input = dropZone.querySelector("input");

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (event.dataTransfer.files.length) {
      input.files = event.dataTransfer.files;
    }
  });
}

async function handleJobForm() {
  const form = document.getElementById("job-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const url = formData.get("url");
    const file = formData.get("file");

    if ((!url || url.trim() === "") && (!file || !file.name)) {
      alert("Veuillez fournir une URL ou un fichier vidéo.");
      return;
    }
    if (url && url.trim() !== "" && file && file.name) {
      alert("Choisissez soit une URL, soit un fichier.");
      return;
    }

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || "Impossible de créer le job");
      }
      const data = await response.json();
      window.location.href = `/jobs/${data.job_id}`;
    } catch (error) {
      alert(error.message);
    }
  });
}

function jobBadge(status) {
  const statusLower = status.toLowerCase();
  return `<span class="badge ${statusLower}">${status}</span>`;
}

async function loadJobsPreview() {
  const container = document.getElementById("jobs-preview");
  if (!container) return;
  try {
    const data = await fetchJson("/api/jobs");
    if (!data.jobs.length) {
      container.innerHTML = "<p>Aucun job pour le moment.</p>";
      return;
    }
    container.innerHTML = data.jobs.slice(0, 5).map((job) => {
      return `
        <div class="job-item">
          <div><strong>${job.source_type === "url" ? job.source : job.id}</strong></div>
          <div class="meta">${job.created_at} · ${job.voice} · ${job.model}</div>
          <div>${jobBadge(job.status)}</div>
          <a href="/jobs/${job.id}">Voir le job</a>
        </div>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function loadJobsList() {
  const container = document.getElementById("jobs-list");
  if (!container) return;
  try {
    const data = await fetchJson("/api/jobs");
    if (!data.jobs.length) {
      container.innerHTML = "<p>Aucun job enregistré.</p>";
      return;
    }
    container.innerHTML = data.jobs.map((job) => {
      return `
        <div class="job-item">
          <div><strong>${job.source_type === "url" ? job.source : job.id}</strong></div>
          <div class="meta">${job.created_at} · ${job.voice} · ${job.model}</div>
          <div>${jobBadge(job.status)}</div>
          <div class="actions">
            <a href="/jobs/${job.id}">Ouvrir</a>
            <button class="secondary" data-delete="${job.id}">Supprimer</button>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll("button[data-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const jobId = button.dataset.delete;
        if (!confirm("Supprimer ce job et son dossier de sortie ?")) return;
        try {
          await fetchJson(`/api/jobs/${jobId}`, { method: "DELETE" });
          loadJobsList();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function updateJobStatus() {
  if (!window.JOB_ID) return;
  const statusEl = document.getElementById("job-status");
  const stepsEl = document.getElementById("progress-steps");
  const progressEl = document.getElementById("progress-bar");
  const resultsEl = document.getElementById("job-results");

  try {
    const job = await fetchJson(`/api/jobs/${window.JOB_ID}`);
    statusEl.innerHTML = `${jobBadge(job.status)} · ${job.stage}`;

    const progress = stageProgress[job.stage] || 15;
    progressEl.style.width = `${progress}%`;

    const steps = [
      "EN_ATTENTE",
      "LANCEMENT",
      "TRANSCRIPTION",
      "TRADUCTION",
      "RENDU",
      "TERMINE",
    ];
    stepsEl.innerHTML = steps.map((stage) => {
      const done = stageProgress[stage] <= progress;
      return `<div>${done ? "✅" : "⏳"} ${stage}</div>`;
    }).join("");

    if (job.status === "DONE") {
      const output = job.output_dir ? `<p>Dossier: ${job.output_dir}</p>` : "";
      resultsEl.innerHTML = `
        <a href="/api/jobs/${window.JOB_ID}/download/video">Télécharger video_fr.mp4</a>
        <a href="/api/jobs/${window.JOB_ID}/download/srt">Télécharger texte_fr.srt</a>
        ${output}
      `;
    } else if (job.status === "ERROR") {
      resultsEl.innerHTML = `<p class="error">Le job a échoué. Consultez le log.</p>`;
    } else {
      resultsEl.innerHTML = "<p>Traitement en cours...</p>";
    }
  } catch (error) {
    statusEl.innerHTML = `<span class="error">${error.message}</span>`;
  }
}

async function updateJobLog() {
  if (!window.JOB_ID) return;
  const logEl = document.getElementById("job-log");
  try {
    const data = await fetchJson(`/api/jobs/${window.JOB_ID}/log?offset=${appState.logOffset}`);
    if (data.content) {
      logEl.textContent += data.content;
      logEl.scrollTop = logEl.scrollHeight;
    }
    appState.logOffset = data.offset;
  } catch (error) {
    logEl.textContent = `Erreur log: ${error.message}`;
  }
}

function initJobActions() {
  const button = document.getElementById("open-output");
  if (!button || !window.JOB_ID) return;
  button.addEventListener("click", async () => {
    try {
      await fetchJson(`/api/jobs/${window.JOB_ID}/open-output`, { method: "POST" });
    } catch (error) {
      alert(error.message);
    }
  });
}

function initTokenPrompt() {
  if (!window.APP_CONFIG || !window.APP_CONFIG.tokenRequired) return;
  if (!getToken()) {
    const token = prompt("Token requis pour accéder à l'intranet.");
    if (token) {
      setToken(token);
    }
  }
}

function startJobPolling() {
  if (!window.JOB_ID) return;
  updateJobStatus();
  updateJobLog();
  appState.polling = setInterval(() => {
    updateJobStatus();
    updateJobLog();
  }, 1500);
}

document.addEventListener("DOMContentLoaded", () => {
  initTokenPrompt();
  initDropZone();
  handleJobForm();
  loadJobsPreview();
  loadJobsList();
  startJobPolling();
  initJobActions();
});
