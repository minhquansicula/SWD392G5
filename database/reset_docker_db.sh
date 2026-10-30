#!/usr/bin/env bash
# ==============================================================================
# Script Reset Database Docker AIVES (Linux / macOS / Git Bash)
# ==============================================================================
set -e

echo "[AIVES] Bat dau Reset Database Docker..."

if [ -z "$(docker ps -q -f name=aives-postgres)" ]; then
    echo "[AIVES] Container aives-postgres chua chay. Khoi dong..."
    docker compose up -d postgres
    sleep 3
fi

echo "[AIVES] -> [1/2] Nap lai Schema & Extensions (01_init_schema.sql)..."
docker exec -i aives-postgres psql -U postgres -d aives_db -f /docker-entrypoint-initdb.d/01_init_schema.sql -q

echo "[AIVES] -> [2/2] Nap Seed Data mau (02_seed_data.sql)..."
docker exec -i aives-postgres psql -U postgres -d aives_db -f /docker-entrypoint-initdb.d/02_seed_data.sql -q

echo "[AIVES] THANH CONG! Database Docker da duoc DROP va TAO MOI 100%!"
