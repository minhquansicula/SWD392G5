# ⚡ Quick Start — AIVES Viva Python Server

## 1. Cài đặt môi trường

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Cấu hình `.env`

```powershell
cp .env.example .env
```

Mở `.env`, điền `GEMINI_API_KEY=AIzaSy...`

## 3. Chạy

`uvicorn app.main:app --host 127.0.0.1 --port 8000`

## 4. Kiểm tra

Mở trình duyệt → `http://localhost:8000` → cấp quyền mic & webcam → bấm **"Bắt đầu Thi Vấn Đáp"**
