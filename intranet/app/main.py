from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
JOBS_DIR = DATA_DIR / "jobs"
SORTIES_DIR = PROJECT_DIR / "sorties"

JOBS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
SORTIES_DIR.mkdir(parents=True, exist_ok=True)

SCRIPT_PATH = Path(os.getenv("TRANSLATE_SCRIPT", PROJECT_DIR / "traduis_video_auto.sh"))
APP_TOKEN = os.getenv("APP_TOKEN", "").strip()

VOICE_CHOICES = [
    "Thomas",
    "Amelie",
    "Audrey",
    "Aurelie",
    "Aude",
    "Bruno",
    "Celeste",
    "Emma",
    "Flo",
    "Juliette",
    "Lea",
    "Louise",
    "Margot",
    "Mathieu",
    "Paul",
]
MODEL_CHOICES = ["tiny", "base", "small", "medium"]

app = FastAPI(title="Traduction Video Intranet")
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")

templates = Jinja2Templates(directory=APP_DIR / "templates")


class JobStatus:
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    DONE = "DONE"
    ERROR = "ERROR"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def job_meta_path(job_id: str) -> Path:
    return job_dir(job_id) / "meta.json"


def job_log_path(job_id: str) -> Path:
    return job_dir(job_id) / "log.txt"


def load_meta(job_id: str) -> Dict[str, Any]:
    path = job_meta_path(job_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Job introuvable")
    return json.loads(path.read_text(encoding="utf-8"))


def save_meta(job_id: str, data: Dict[str, Any]) -> None:
    path = job_meta_path(job_id)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def update_meta(job_id: str, **updates: Any) -> Dict[str, Any]:
    data = load_meta(job_id)
    data.update(updates)
    data["updated_at"] = now_iso()
    save_meta(job_id, data)
    return data


def append_log(job_id: str, line: str) -> None:
    log_path = job_log_path(job_id)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(line)


def find_latest_output(since_ts: float) -> Optional[str]:
    if not SORTIES_DIR.exists():
        return None
    candidates = []
    for child in SORTIES_DIR.iterdir():
        if not child.is_dir():
            continue
        mtime = child.stat().st_mtime
        if mtime >= since_ts - 2:
            candidates.append((mtime, child))
    if not candidates:
        return None
    _, newest = max(candidates, key=lambda item: item[0])
    return str(newest)


def detect_stage(line: str) -> Optional[str]:
    lower = line.lower()
    if "whisper" in lower or "transcrib" in lower:
        return "TRANSCRIPTION"
    if "translate" in lower or "argos" in lower:
        return "TRADUCTION"
    if "ffmpeg" in lower or "mux" in lower or "render" in lower:
        return "RENDU"
    return None


def verify_token(request: Request) -> None:
    if not APP_TOKEN:
        return
    token = (
        request.headers.get("Authorization")
        or request.headers.get("X-Token")
        or request.query_params.get("token")
        or request.cookies.get("token")
    )
    if token and token.lower().startswith("bearer "):
        token = token[7:]
    if token != APP_TOKEN:
        raise HTTPException(status_code=401, detail="Token invalide")


def read_logs(job_id: str, offset: int) -> Dict[str, Any]:
    log_path = job_log_path(job_id)
    if not log_path.exists():
        return {"offset": 0, "content": ""}
    with log_path.open("r", encoding="utf-8") as handle:
        handle.seek(offset)
        content = handle.read()
        new_offset = handle.tell()
    return {"offset": new_offset, "content": content}


def run_job(job_id: str, source: str, voice: str, model: str) -> None:
    start_ts = time.time()
    update_meta(job_id, status=JobStatus.RUNNING, stage="LANCEMENT")

    if not SCRIPT_PATH.exists():
        append_log(job_id, f"ERREUR: script introuvable: {SCRIPT_PATH}\n")
        update_meta(job_id, status=JobStatus.ERROR, error="Script introuvable")
        return

    command = ["/bin/bash", str(SCRIPT_PATH), source]
    env = os.environ.copy()
    env.update({"VOICE": voice, "WHISPER_MODEL": model, "MODEL": model})

    append_log(job_id, f"Commande: {' '.join(command)}\n")
    append_log(job_id, f"Voice={voice} | Model={model}\n")

    process = subprocess.Popen(
        command,
        cwd=str(PROJECT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
    )

    try:
        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                append_log(job_id, line)
                stage = detect_stage(line)
                if stage:
                    update_meta(job_id, stage=stage)
        process.wait()
    finally:
        if process.stdout:
            process.stdout.close()

    exit_code = process.returncode
    output_dir = find_latest_output(start_ts)
    updates: Dict[str, Any] = {
        "exit_code": exit_code,
        "output_dir": output_dir,
    }

    if exit_code == 0:
        updates["status"] = JobStatus.DONE
        updates["stage"] = "TERMINE"
    else:
        updates["status"] = JobStatus.ERROR
        updates["stage"] = "ECHEC"

    update_meta(job_id, **updates)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    if APP_TOKEN:
        try:
            verify_token(request)
        except HTTPException:
            return templates.TemplateResponse(
                "login.html",
                {"request": request},
            )

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "voices": VOICE_CHOICES,
            "models": MODEL_CHOICES,
            "default_voice": "Thomas",
            "default_model": "small",
            "token_required": bool(APP_TOKEN),
        },
    )


@app.get("/jobs", response_class=HTMLResponse)
async def jobs_page(request: Request):
    if APP_TOKEN:
        verify_token(request)
    return templates.TemplateResponse("jobs.html", {"request": request})


@app.get("/jobs/{job_id}", response_class=HTMLResponse)
async def job_page(job_id: str, request: Request):
    if APP_TOKEN:
        verify_token(request)
    return templates.TemplateResponse(
        "job.html", {"request": request, "job_id": job_id}
    )


@app.post("/login")
async def login(request: Request, token: str = Form(...)):
    if not APP_TOKEN:
        return RedirectResponse(url="/", status_code=302)
    if token != APP_TOKEN:
        return templates.TemplateResponse(
            "login.html", {"request": request, "error": "Token invalide"}
        )
    response = RedirectResponse(url="/", status_code=302)
    response.set_cookie("token", token, httponly=False)
    return response


@app.post("/api/jobs", dependencies=[Depends(verify_token)])
async def create_job(
    request: Request,
    background_tasks: BackgroundTasks,
    url: Optional[str] = Form(None),
    voice: str = Form("Thomas"),
    model: str = Form("small"),
    file: Optional[UploadFile] = File(None),
):
    if not url and not file:
        raise HTTPException(status_code=400, detail="Fichier ou URL requis")
    if url and file:
        raise HTTPException(status_code=400, detail="Choisir soit URL soit fichier")

    job_id = uuid.uuid4().hex
    job_path = job_dir(job_id)
    job_path.mkdir(parents=True, exist_ok=True)

    source = ""
    source_type = ""
    if file:
        suffix = Path(file.filename or "video").suffix or ".mp4"
        dest = job_path / f"source_video{suffix}"
        with dest.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        source = str(dest)
        source_type = "file"
    elif url:
        source = url.strip()
        source_type = "url"

    meta = {
        "id": job_id,
        "status": JobStatus.QUEUED,
        "stage": "EN_ATTENTE",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "source_type": source_type,
        "source": source,
        "voice": voice,
        "model": model,
        "output_dir": None,
        "exit_code": None,
        "error": None,
    }
    save_meta(job_id, meta)
    append_log(job_id, f"Job {job_id} créé.\n")

    background_tasks.add_task(run_job, job_id, source, voice, model)
    return JSONResponse({"job_id": job_id})


@app.get("/api/jobs", dependencies=[Depends(verify_token)])
async def list_jobs():
    jobs = []
    for path in JOBS_DIR.iterdir():
        if path.is_dir():
            try:
                meta = json.loads((path / "meta.json").read_text(encoding="utf-8"))
                jobs.append(meta)
            except FileNotFoundError:
                continue
    jobs.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return JSONResponse({"jobs": jobs[:20]})


@app.get("/api/jobs/{job_id}", dependencies=[Depends(verify_token)])
async def job_status(job_id: str):
    return JSONResponse(load_meta(job_id))


@app.get("/api/jobs/{job_id}/log", dependencies=[Depends(verify_token)])
async def job_log(job_id: str, offset: int = 0):
    return JSONResponse(read_logs(job_id, offset))


@app.post("/api/jobs/{job_id}/open-output", dependencies=[Depends(verify_token)])
async def open_output(job_id: str):
    meta = load_meta(job_id)
    output_dir = meta.get("output_dir")
    if not output_dir:
        raise HTTPException(status_code=400, detail="Sortie non disponible")
    subprocess.Popen(["open", output_dir])
    return JSONResponse({"ok": True})


def output_file_path(meta: Dict[str, Any], filename: str) -> Path:
    output_dir = meta.get("output_dir")
    if not output_dir:
        raise HTTPException(status_code=404, detail="Sortie non disponible")
    path = Path(output_dir) / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return path


@app.get("/api/jobs/{job_id}/download/video", dependencies=[Depends(verify_token)])
async def download_video(job_id: str):
    meta = load_meta(job_id)
    path = output_file_path(meta, "video_fr.mp4")
    return FileResponse(path, filename="video_fr.mp4")


@app.get("/api/jobs/{job_id}/download/srt", dependencies=[Depends(verify_token)])
async def download_srt(job_id: str):
    meta = load_meta(job_id)
    path = output_file_path(meta, "texte_fr.srt")
    return FileResponse(path, filename="texte_fr.srt")


@app.delete("/api/jobs/{job_id}", dependencies=[Depends(verify_token)])
async def delete_job(job_id: str):
    meta = load_meta(job_id)
    output_dir = meta.get("output_dir")
    if output_dir and Path(output_dir).exists():
        shutil.rmtree(output_dir, ignore_errors=True)
    shutil.rmtree(job_dir(job_id), ignore_errors=True)
    return JSONResponse({"ok": True})


@app.get("/health")
async def health():
    return JSONResponse({"ok": True})


@app.get("/robots.txt", include_in_schema=False)
async def robots():
    return HTMLResponse("User-agent: *\nDisallow: /")
