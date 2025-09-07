#!/usr/bin/env bash
set -euo pipefail

# This script generates the .env.local file needed for the local Docker Compose setup.
# It uses default credentials suitable for local development.

ENV_FILE="infra/.env.local"
echo "Writing local environment configuration to ${ENV_FILE}"

cat > "${ENV_FILE}" <<EOF
# .env file for local docker-compose development

# For API & Web containers
LIVEKIT_API_KEY=LK_DEV_KEY
LIVEKIT_API_SECRET=devsecret

# For API container -> tells the API where the LiveKit server is
LIVEKIT_WS_URL=ws://localhost:7880

# For Web container -> tells the web client where the API is
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

echo "Done. You can now run the local stack:"
echo "  cd infra && docker compose -f docker-compose.local.yml up"
