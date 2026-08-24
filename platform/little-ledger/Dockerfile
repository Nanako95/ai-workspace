FROM node:20-alpine
WORKDIR /app
COPY package.json server.mjs index.html app.js styles.css camera.css ocr.css README.md ./
RUN mkdir -p /app/data
ENV NODE_ENV=production
EXPOSE 4173
CMD ["node", "server.mjs"]
