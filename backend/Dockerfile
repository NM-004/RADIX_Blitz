FROM node:20-slim

# Install OpenSSL, Python3 & pip for Prisma Python client generator compatibility
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    netcat-openbsd \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install prisma python package for prisma-client-py generator
RUN pip3 install --no-cache-dir prisma --break-system-packages || pip3 install --no-cache-dir prisma

WORKDIR /app

# Copy package manifests and install Node packages
COPY backend/package*.json ./
RUN npm install

# Copy Prisma schema and backend application code
COPY backend/prisma ./prisma
COPY backend/ ./

# Generate both Prisma JS and Python Clients
RUN npx prisma generate

EXPOSE 8000

# Push DB schema, seed baseline data, and start Node server
CMD ["sh", "-c", "npx prisma db push && npm run prisma:seed && npm start"]
