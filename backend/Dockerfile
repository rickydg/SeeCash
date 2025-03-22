FROM node:16-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++ gcc git

# Clone the repository and set up the correct directory
WORKDIR /tmp
RUN git clone https://github.com/rickydg/SeeCash.git
WORKDIR /tmp/SeeCash/backend

# Create app directory and copy backend files
RUN mkdir -p /app
COPY . /app
WORKDIR /app

# Install dependencies with SQLite3 built from source
RUN npm install sqlite3 --build-from-source --no-save && \
    npm install --only=production

# Set up data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Create a non-root user and set permissions
RUN adduser -D -H -h /app appuser && \
    chown -R appuser:appuser /app

USER appuser
EXPOSE 8080
CMD ["node", "server.js"]