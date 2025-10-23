#!/bin/bash
# A script to pull, rebuild, and restart a Docker Compose application.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Step 1: Pulling latest changes from Git..."
git pull

echo "Step 2: Building new Docker images (this will run your Next.js build)..."
# We build the new images first.
# The old containers are still running at this point.
docker-compose build

echo "Step 3: Stopping old containers and starting new ones..."
# 'up -d' will detect the newly-built images,
# stop the old containers, and start new ones in their place.
# --force-recreate ensures this replacement happens.
docker-compose up -d --force-recreate

echo "Step 4: Pruning old, unused images (optional but recommended)..."
# This cleans up old images to save disk space.
docker image prune -f

echo "Redeployment complete."
