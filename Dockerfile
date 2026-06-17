FROM python:3.11-slim

# Install Node.js 20 for Vite build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY backend_maternal/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Node dependencies + frontend build
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY index.html vite.config.js tailwind.config.js postcss.config.js eslint.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Backend
COPY backend_maternal/ ./backend_maternal/
COPY config.json ./config.json

# Runtime port (injected by Render/Railway/Fly)
ENV PORT=8001
EXPOSE 8001

WORKDIR /app/backend_maternal
CMD python app.py
