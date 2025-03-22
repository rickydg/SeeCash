FROM node:16-alpine

WORKDIR /app

COPY backend/ .

RUN npm install --only=production

RUN mkdir -p /app/data && chmod 755 /app/data

RUN adduser -D -H -h /app appuser && chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

CMD ["node", "server.js"]