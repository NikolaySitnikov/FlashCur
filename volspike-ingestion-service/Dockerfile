FROM node:18-alpine

WORKDIR /app

# Copy package files from service directory
COPY volspike-ingestion-service/package*.json ./

# Install production dependencies ONLY
RUN npm ci --omit=dev

# Copy pre-compiled dist folder from service directory
COPY volspike-ingestion-service/dist ./dist

EXPOSE 3002

CMD ["node", "dist/index.js"]