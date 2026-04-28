#!/usr/bin/env bash
# Initialize the web app for local development.
# Copies .env.example → .env.local with the local runtime URL enabled.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_EXAMPLE="$SCRIPT_DIR/web/.env.example"
ENV_LOCAL="$SCRIPT_DIR/web/.env.local"

if [ -f "$ENV_LOCAL" ]; then
  echo "web/.env.local already exists — skipping (delete it first to re-init)"
  exit 0
fi

cp "$ENV_EXAMPLE" "$ENV_LOCAL"

# Enable the local runtime URL for dev
sed -i.bak 's|^# LEAPTER_RUNTIME_URL=.*|LEAPTER_RUNTIME_URL=http://localhost:4004/api/v1/_/_|' "$ENV_LOCAL"
rm -f "$ENV_LOCAL.bak"

# Ensure debug mode is on
if ! grep -q '^NEXT_PUBLIC_LEAPTER_DEBUG=true' "$ENV_LOCAL"; then
  echo 'NEXT_PUBLIC_LEAPTER_DEBUG=true' >> "$ENV_LOCAL"
fi

echo "Created web/.env.local (debug mode enabled, local runtime at :4004)"