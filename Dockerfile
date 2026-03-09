# Self-host: build frontend + run backend (เสิร์ฟ frontend จาก backend)
FROM node:18-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/build ./frontend/build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
RUN npx prisma generate
ENV NODE_ENV=production
ENV SERVE_FRONTEND=1
EXPOSE 3001
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
