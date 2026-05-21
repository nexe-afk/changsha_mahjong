FROM node:20-slim
WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY shared/ /app/shared/
COPY server/ /app/server/

WORKDIR /app/server
RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000
CMD ["node", "dist/server/src/app.js"]
