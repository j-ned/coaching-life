# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install all workspace deps (Angular devDeps + backend deps)
RUN pnpm install --frozen-lockfile

# Copy sources
COPY . .

# Build Angular (outputs to dist/coaching-life/browser/)
RUN pnpm build

# Build Hono backend
RUN cd backend && pnpm build
RUN cp -r backend/src/db/migrations backend/dist/db/migrations

# Flatten prod deps (résout les symlinks pnpm workspace)
RUN pnpm deploy --filter @coaching-life/backend --prod --legacy /app/deploy


# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Backend Hono
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/deploy/node_modules ./node_modules
COPY --from=builder /app/backend/start.sh ./start.sh
RUN chmod +x ./start.sh

# Frontend Angular (servi par Hono via serveStatic)
COPY --from=builder /app/dist/coaching-life/browser ./browser

EXPOSE 3000

CMD ["./start.sh"]
