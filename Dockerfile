FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

RUN npm exec nx build api

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/api ./dist/apps/api
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]
