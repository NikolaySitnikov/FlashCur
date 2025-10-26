FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy pre-compiled dist folder
COPY dist ./dist

# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/index.js"]