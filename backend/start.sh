#!/usr/bin/env bash
# Render start script: migrate, seed demo data if the DB is empty, then serve.
set -e
flask --app run.py db upgrade
python seed.py || true
exec gunicorn run:app --bind 0.0.0.0:${PORT:-10000} --workers 2 --timeout 120
