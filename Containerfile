# TraderAI Containerfile for Podman
# Multi-stage build for optimized container size and security

# Build stage
FROM docker.io/library/node:18-alpine AS builder

# Create app directory with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trader -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=trader:nodejs src/ ./src/
COPY --chown=trader:nodejs prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM docker.io/library/node:18-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trader -u 1001

# Install security updates
RUN apk --no-cache upgrade

# Install required tools for health checks
RUN apk --no-cache add curl

# Create app directory
WORKDIR /app

# Copy package files
COPY --from=builder --chown=trader:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/* /root/.npm

# Copy built application from builder stage
COPY --from=builder --chown=trader:nodejs /app/dist ./dist/
COPY --from=builder --chown=trader:nodejs /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder --chown=trader:nodejs /app/prisma ./prisma/

# Create logs directory
RUN mkdir -p logs && chown trader:nodejs logs

# Switch to non-root user
USER trader

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]