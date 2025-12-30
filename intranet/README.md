# Intranet Traduction Vidéo

Application web locale (FastAPI) pour piloter un script bash existant de traduction vidéo sur macOS.

## Architecture (résumé)

- **Backend** : FastAPI (`intranet/app/main.py`) expose une API pour lancer des jobs, suivre leur statut, streamer les logs, télécharger les résultats et ouvrir les sorties.
- **Frontend** : HTML/CSS/JS simple dans `intranet/app/templates` + `intranet/app/static`.
- **Stockage local** : chaque job est stocké dans `intranet/data/jobs/<job_id>/` (meta JSON + log). Les sorties du script restent dans `intranet/sorties/`.
- **Script existant** : le script bash est appelé tel quel via `subprocess`. Par défaut, on attend `traduis_video_auto.sh` dans le dossier `intranet/`.

## Pré-requis

- macOS
- Python 3.12
- Le script de traduction déjà fonctionnel (ex: `traduis_video_auto.sh`)

## Installation

```bash
cd intranet
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Lancement

```bash
cd intranet
export TRANSLATE_SCRIPT="$(pwd)/traduis_video_auto.sh"
# Optionnel : sécuriser l'accès
export APP_TOKEN="mon-token"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Accès local : `http://imac.local:8000`

## Start rapide (macOS)

- **Double-clic** : utilisez `start.command` (à garder dans `intranet/`).
- **Auto-démarrage** : adaptez `com.traduction.video.plist` puis placez-le dans `~/Library/LaunchAgents/`.

Commande d'installation LaunchAgent :

```bash
cp intranet/com.traduction.video.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.traduction.video.plist
```

## Notes

- **Choix de la voix** : variable d’environnement `VOICE` (par défaut `Thomas`).
- **Choix du modèle** : `WHISPER_MODEL` / `MODEL` (par défaut `small`).
- **Sorties** : le script génère `sorties/<date>_<nom>/video_fr.mp4` et `texte_fr.srt`.
