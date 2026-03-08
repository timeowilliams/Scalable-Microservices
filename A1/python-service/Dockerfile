FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (new src/ directory structure)
COPY src/ ./src/

# Expose port
EXPOSE 8000

# Set default environment variables
ENV PYTHON_ENV=production
ENV PORT=8000

# Set PYTHONPATH to src directory
ENV PYTHONPATH=/app/src

# Run from new location
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
