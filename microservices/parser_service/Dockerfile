FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for PDF and DOCX processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY microservices/parser_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY microservices /app/microservices
COPY backend /app/backend
COPY scratch /app/scratch

EXPOSE 8001

CMD ["uvicorn", "microservices.parser_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
