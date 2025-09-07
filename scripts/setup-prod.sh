#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup-prod.sh LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_WS_URL
# Example: ./scripts/setup-prod.sh lk_key lk_secret wss://livekit.talkie.k1nval.com

if [[ ${1-} == "" || ${2-} == "" || ${3-} == "" ]]; then
  echo "Usage: $0 LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_WS_URL" >&2
  exit 1
fi

LIVEKIT_API_KEY="$1"
LIVEKIT_API_SECRET="$2"
LIVEKIT_WS_URL="$3"

mkdir -p infra

echo "Writing infra/.env"
cat > infra/.env <<EOF
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
LIVEKIT_WS_URL=${LIVEKIT_WS_URL}
EOF

echo "Done. On the server run:"
echo "  cd infra && docker compose up -d --build"
