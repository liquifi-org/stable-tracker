FROM node:22-alpine AS base

WORKDIR /usr/src/backend

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3003

CMD [ "npm", "run", "dev" ]
