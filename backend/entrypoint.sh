#!/bin/sh
set -e
PORT="${PORT:-8000}"
python -m app.core.migrate
if [ "${SEED_ON_START:-false}" = "true" ]; then
  python -m app.seed
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers 1
