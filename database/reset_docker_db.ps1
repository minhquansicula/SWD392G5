# ==============================================================================
# Script Reset Database Docker AIVES (Drop & Re-create Toan bo Schema & Seed Data)
# ==============================================================================

Write-Host " [AIVES] Bat dau Reset Database Docker..." -ForegroundColor Cyan

# 1. Kiem tra container aives-postgres co dang chay khong
$containerStatus = docker ps --filter "name=aives-postgres" --format "{{.Status}}"
if (-not $containerStatus) {
    Write-Host " Container 'aives-postgres' chua chay. Dang khoi dong qua docker compose..." -ForegroundColor Yellow
    docker compose up -d postgres
    Start-Sleep -Seconds 4
}

# 2. Chay file khoi tao schema (01_init_schema.sql)
Write-Host " -> [1/2] Dang nap lai Schema & Extensions (01_init_schema.sql)..." -ForegroundColor Yellow
Get-Content -Raw "database\docker-init\01_init_schema.sql" -Encoding utf8 | docker exec -i aives-postgres psql -U postgres -d aives_db -q

# 3. Chay file seed data moi (02_seed_data.sql)
Write-Host " -> [2/2] Dang nap Seed Data mau (02_seed_data.sql)..." -ForegroundColor Yellow
Get-Content -Raw "database\docker-init\02_seed_data.sql" -Encoding utf8 | docker exec -i aives-postgres psql -U postgres -d aives_db -q

Write-Host "`n [AIVES] THANH CONG! Database Docker da duoc DROP va TAO MOI 100%!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor DarkGray
Write-Host " Tai khoan kiem thu:" -ForegroundColor Cyan
Write-Host "  - Quan tri vien: admin@aives.edu.vn       | Pass: Admin@123"
Write-Host "  - Giang vien:    lecturer@aives.edu.vn    | Pass: Lecturer@123"
Write-Host "  - Sinh vien 1:   student@aives.edu.vn     | Pass: Student@123"
Write-Host "  - Sinh vien 2:   hoangma.se200043@gmail.com | Pass: Student@123"
Write-Host " Ca thi mon SWD392 dang dien ra NGAY LUC NAY, san sang vao thi!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor DarkGray
