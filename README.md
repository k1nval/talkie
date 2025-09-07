# Talkie

A minimal LiveKit-based video conferencing app (SFU-only) with a web client and an API for issuing LiveKit tokens.

## Structure

- `apps/web` – Next.js client using LiveKit SDK
- `apps/api` – Express API issuing LiveKit access tokens
- `infra/` – docker-compose, Nginx, LiveKit config

## Quick start (local)

1. Create `.env` in `apps/api` with LiveKit creds.
2. Run API and Web in separate terminals.
3. Join a room from the web UI.

Production deployment uses Docker on a VPS with Nginx and TLS.
