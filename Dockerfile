FROM node:20-slim

WORKDIR /app

# Frontend dependencies + build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --legacy-peer-deps

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source + runtime data
COPY backend/ ./backend/

# Runtime port (injected by Render/Railway/Fly)
ENV PORT=8001
EXPOSE 8001

WORKDIR /app/backend
CMD ["node", "server.js"]
