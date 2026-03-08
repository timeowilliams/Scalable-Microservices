FROM python:3.11-slim

WORKDIR /app

# Install wait-for-it dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Copy wait script
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Expose port
EXPOSE 8000

# Set default environment variables
ENV PYTHON_ENV=production
ENV PORT=8000

# Set PYTHONPATH to src directory
ENV PYTHONPATH=/app/src

# Run from new location with wait-for-it
CMD ["./wait-for-it.sh", "python-sensor-db:5432", "--", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
