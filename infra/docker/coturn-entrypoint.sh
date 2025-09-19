#!/bin/sh

set -e

CERT_PATH="/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/turn.talkie.k1nval.com"
CERT_FILE="${CERT_PATH}/turn.talkie.k1nval.com.crt"
KEY_FILE="${CERT_PATH}/turn.talkie.k1nval.com.key"

echo "--- Coturn Entrypoint Script ---"

# Wait for the certificate to be created by Caddy
while ! test -f "${CERT_FILE}"; do
  echo "Waiting for certificate at ${CERT_FILE}... Retrying in 5s."
  sleep 5
done

echo "Certificate found! Starting TURN server..."

# All arguments are hardcoded for simplicity
exec turnserver \
  --log-file=stdout \
  --no-cli \
  --fingerprint \
  --listening-ip=coturn \
  --realm=turn.talkie.k1nval.com \
  --server-name=turn.talkie.k1nval.com \
  --lt-cred-mech \
  --user=turnuser:turn456 \
  --listening-port=3478 \
  --min-port=29000 \
  --max-port=29200 \
  --tls-listening-port=443 \
  --relay-ip=coturn \
  --external-ip=65.109.242.173 \
  --cert="${CERT_FILE}" \
  --pkey="${KEY_FILE}"
