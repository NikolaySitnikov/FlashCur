FROM node:18-alpine

WORKDIR /app

# Copy package files (relative path - we're in volspike-ingestion-service)
COPY package*.json ./

# Install production dependencies ONLY
RUN npm ci --omit=dev

# Copy pre-compiled dist folder (relative path)
COPY dist ./dist

EXPOSE 3002

CMD ["node", "dist/index.js"]