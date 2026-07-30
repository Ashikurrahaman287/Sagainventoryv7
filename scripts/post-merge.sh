#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install

echo "[post-merge] Applying database schema..."
npm run db:push

echo "[post-merge] Setup complete."
