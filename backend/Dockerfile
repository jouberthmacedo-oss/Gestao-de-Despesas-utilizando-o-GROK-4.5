FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8888
CMD ["node", "dist/server.js"]
