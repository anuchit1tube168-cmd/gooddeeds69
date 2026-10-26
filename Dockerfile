FROM python:3.11-slim

WORKDIR /app

# ติดตั้ง Fonts ภาษาไทยสำหรับการเรนเดอร์สลิป
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-thai-tlwg \
    fontconfig \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "scripts/live_telegram_bridge.py"]
