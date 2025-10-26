FROM node:18-alpine

WORKDIR /app

# Copy package files (relative path - we're in volspike-ingestion-service)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and build script
COPY src ./src
COPY tsconfig.json ./
COPY build.sh ./

# Run build script (compiles if dist doesn't exist)
RUN chmod +x build.sh && ./build.sh

# Install only production dependencies for runtime
RUN npm ci --omit=dev

EXPOSE 3002

CMD ["node", "dist/index.js"]