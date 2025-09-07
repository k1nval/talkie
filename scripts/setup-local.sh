#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup-local.sh LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_WS_URL
# Example: ./scripts/setup-local.sh lk_key lk_secret wss://livekit.talkie.k1nval.com

if [[ ${1-} == "" || ${2-} == "" || ${3-} == "" ]]; then
  echo "Usage: $0 LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_WS_URL" >&2
  exit 1
fi

LIVEKIT_API_KEY="$1"
LIVEKIT_API_SECRET="$2"
LIVEKIT_WS_URL="$3"

mkdir -p apps/web apps/api

echo "Writing apps/web/.env.local"
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

echo "Writing apps/api/.env"
cat > apps/api/.env <<EOF
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
LIVEKIT_WS_URL=${LIVEKIT_WS_URL}
EOF

echo "Done. Start dev with:"
echo "  npm --workspace @talkie/api run dev"
echo "  npm --workspace @talkie/web run dev"
