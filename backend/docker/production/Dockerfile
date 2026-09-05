FROM node:22-alpine AS deps

WORKDIR /usr/src/backend

COPY package*.json ./
RUN HUSKY=0 npm ci --ignore-scripts

FROM deps AS build

COPY . .
RUN npx tsc

FROM node:22-alpine

WORKDIR /usr/src/backend

ENV NODE_ENV=production
ENV HUSKY=0

COPY package*.json ./
COPY --from=deps /usr/src/backend/node_modules ./node_modules
COPY --from=build /usr/src/backend/dist ./dist
COPY --from=build /usr/src/backend/docs ./docs
COPY --from=build /usr/src/backend/migrations ./migrations
COPY --from=build /usr/src/backend/src ./src
COPY --from=build /usr/src/backend/script ./script

EXPOSE 3003

CMD ["node", "--enable-source-maps", "dist/server.js"]
