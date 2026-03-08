FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

EXPOSE 8001

ENV PYTHON_ENV=production
ENV PORT=8001

ENV PYTHONPATH=/app/src

CMD ["./wait-for-it.sh", "python-command-db:5432", "--", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
