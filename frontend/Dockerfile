# filepath: frontend/Dockerfile
# Build stage
FROM node:16-alpine as build

ARG API_URL=http://localhost:8080

WORKDIR /app

# Clone the repository
RUN apk add --no-cache git && \
    git clone https://github.com/rickydg/SeeCash.git . && \
    cd frontend

# Change directory to frontend
WORKDIR /app/frontend

# Use npm install instead of npm ci and build
RUN npm install && \
    REACT_APP_API_URL=$API_URL npm run build

# Production environment
FROM nginx:alpine

# Add security headers and compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from build stage
COPY --from=build /app/frontend/build /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]