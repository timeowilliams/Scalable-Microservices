FROM node:20-alpine

RUN apk add --no-cache bash

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["./wait-for-it.sh", "node-command-db:5432", "--", "node", "src/index.js"]
