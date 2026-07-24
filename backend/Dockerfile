FROM node:20-slim

# Install OpenSSL for Prisma ORM runtime compatibility
RUN apt-get update && apt-get install -y openssl netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install packages
COPY backend/package*.json ./
RUN npm install

# Copy Prisma schema and backend application code
COPY backend/prisma ./prisma
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 8000

# Push DB schema, seed baseline data, and start Node server
CMD ["sh", "-c", "npx prisma db push && npm run prisma:seed && npm start"]
