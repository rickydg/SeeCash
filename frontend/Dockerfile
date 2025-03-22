# filepath: frontend/Dockerfile
# Build stage
FROM node:16-alpine as build

WORKDIR /app

# Clone the repository
COPY frontend/ .

# Use npm install instead of npm ci and build
RUN npm install && npm run build

# Production environment
FROM nginx:alpine

# Create a default nginx configuration instead of copying one
RUN echo 'server { \
    listen       80; \
    server_name  localhost; \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    error_page   500 502 503 504  /50x.html; \
    location = /50x.html { \
        root   /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]