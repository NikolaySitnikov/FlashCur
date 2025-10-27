# Cache buster: $(date)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies needed for tsc)
RUN npm ci

# Compile TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Remove source files (no longer needed)
RUN rm -rf src tsconfig.json

EXPOSE 3002

CMD ["node", "dist/index.js"]