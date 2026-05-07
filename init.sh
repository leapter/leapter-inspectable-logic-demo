#!/usr/bin/env bash
# Initialize the web app for local development.
# Copies .env.example → .env.local. Local dev runs blueprints in-browser
# via @leapter/runtime-browser - no runtime URL or API key required.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_EXAMPLE="$SCRIPT_DIR/web/.env.example"
ENV_LOCAL="$SCRIPT_DIR/web/.env.local"

if [ -f "$ENV_LOCAL" ]; then
  echo "web/.env.local already exists — skipping (delete it first to re-init)"
  exit 0
fi

cp "$ENV_EXAMPLE" "$ENV_LOCAL"
echo "Created web/.env.local"
