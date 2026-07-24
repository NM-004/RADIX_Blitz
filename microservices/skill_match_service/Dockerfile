FROM python:3.10-slim

WORKDIR /app

# Install python dependencies
COPY microservices/skill_match_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY microservices /app/microservices
COPY backend /app/backend
COPY scratch /app/scratch

EXPOSE 8003

CMD ["uvicorn", "microservices.skill_match_service.main:app", "--host", "0.0.0.0", "--port", "8003"]
