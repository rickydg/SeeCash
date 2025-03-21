FROM node:16-alpine

WORKDIR /app

# Clone the repository
RUN apk add --no-cache git && \
    git clone https://github.com/rickydg/SeeCash.git . && \
    cd backend

# Change directory to backend
WORKDIR /app/backend

# Use npm install instead of npm ci
RUN npm install --only=production

# Create data directory with proper permissions
RUN mkdir -p /app/backend/data && chmod 755 /app/backend/data

# Add non-root user for security
RUN adduser -D -H -h /app/backend appuser && \
    chown -R appuser:appuser /app/backend
USER appuser

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=data/budget.db

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "server.js"]