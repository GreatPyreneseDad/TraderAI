# Multi-stage Dockerfile for TraderAI

# Base stage with common dependencies
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Development stage
FROM base AS dev
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# Builder stage
FROM base AS builder
RUN npm ci
COPY . .
# Copy prisma files
COPY prisma ./prisma
# Generate Prisma client
RUN npx prisma generate
# Build TypeScript
RUN npm run build
# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production
RUN apk add --no-cache tini
WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "dist/server.js"]