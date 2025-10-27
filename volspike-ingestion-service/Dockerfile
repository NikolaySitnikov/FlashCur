FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./
# Copy Prisma schema from backend (absolute path from repo root)
COPY volspike-nodejs-backend/prisma ./prisma

# Install ALL dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 3002

CMD ["node", "dist/index.js"]