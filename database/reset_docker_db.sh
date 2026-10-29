#!/bin/bash
# ==============================================================================
# Script Reset Database Docker AIVES (Drop & Re-create Toàn bộ Schema & Seed Data)
# ==============================================================================

echo "🔄 [AIVES] Bắt đầu Reset Database Docker..."

docker compose up -d postgres
sleep 3

echo "-> [1/2] Đang nạp lại Schema (01_init_schema.sql)..."
docker exec -i aives-postgres psql -U postgres -d aives_db -q < database/docker-init/01_init_schema.sql

echo "-> [2/2] Đang nạp Seed Data mẫu (02_seed_data.sql)..."
docker exec -i aives-postgres psql -U postgres -d aives_db -q < database/docker-init/02_seed_data.sql

echo "✅ [AIVES] THÀNH CÔNG! Database Docker đã được DROP và TẠO MỚI 100%!"

