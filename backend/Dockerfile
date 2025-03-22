FROM node:16-alpine

WORKDIR /app

# Install build dependencies needed for SQLite3
RUN apk add --no-cache python3 make g++ gcc git

# Clone repository
COPY . .

# Force rebuilding SQLite3 from source
RUN npm uninstall sqlite3 --no-save && \
    npm install sqlite3 --build-from-source --no-save && \
    npm install --only=production

# Set up data directory
RUN mkdir -p /app/data && chmod 755 /app/data

# Create a non-root user
RUN adduser -D -H -h /app appuser && chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

CMD ["node", "server.js"]