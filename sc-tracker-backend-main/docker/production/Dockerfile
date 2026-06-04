FROM node:22-alpine AS base

WORKDIR /usr/src/backend

COPY package*.json ./

RUN npm ci --only=production && npm run build

COPY . .

EXPOSE 3000

CMD [ "npm",  "start" ]
