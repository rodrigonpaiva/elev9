FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY tsconfig*.json ./

RUN npm ci --legacy-peer-deps
RUN npm exec nx build api

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/api ./dist/apps/api

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]
