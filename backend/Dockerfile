FROM python:3.12-slim

# Install system dependencies for OCR and SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsqlite3-dev \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for persistent storage
RUN mkdir -p /app/data /app/chroma_db /app/uploads

# Expose FastAPI default port
EXPOSE 8000

# Command to run backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]