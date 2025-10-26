FROM node:18-alpine

WORKDIR /app

# Copy everything from volspike-ingestion-service directory
COPY . ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/index.js"]