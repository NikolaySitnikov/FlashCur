FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry and timeout settings
# Using --prefer-offline to reduce network calls
RUN npm ci --only=production --prefer-offline --no-audit || \
    npm install --only=production --prefer-offline --no-audit

# Install dev dependencies needed for build
RUN npm install --only=development --prefer-offline --no-audit || \
    npm install typescript tsx @types/node @types/compression @types/cors @types/ws --save-dev --prefer-offline

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Use non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
