FROM python:3.10-slim

WORKDIR /app

# Install python dependencies
COPY microservices/talent_check_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY microservices /app/microservices
COPY backend /app/backend

EXPOSE 8002

CMD ["uvicorn", "microservices.talent_check_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
