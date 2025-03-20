FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Add non-root user for security
RUN adduser -D -H -h /app appuser && \
    chown -R appuser:appuser /app
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