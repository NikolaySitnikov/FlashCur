FROM node:18-alpine

WORKDIR /app

# Copy from the specific service directory path
COPY volspike-ingestion-service/package*.json ./
COPY volspike-ingestion-service/dist ./dist
COPY volspike-ingestion-service/node_modules ./node_modules

RUN npm ci --omit=dev

EXPOSE 3002

CMD ["node", "dist/index.js"]