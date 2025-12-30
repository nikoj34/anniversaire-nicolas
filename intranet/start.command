#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt

export TRANSLATE_SCRIPT="${TRANSLATE_SCRIPT:-$APP_DIR/traduis_video_auto.sh}"

uvicorn app.main:app --host 0.0.0.0 --port 8000
