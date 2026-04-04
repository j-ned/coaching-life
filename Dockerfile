# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy workspace manifests for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile --filter @coaching-life/backend

# Copy backend source
COPY backend/ ./backend/

# Compile TypeScript
RUN cd backend && pnpm build

# Copy SQL migration files into dist (tsc only copies .ts)
RUN cp -r backend/src/db/migrations backend/dist/db/migrations

# Deploy: flatten prod deps (resolves pnpm workspace symlinks)
RUN pnpm deploy --filter @coaching-life/backend --prod --legacy /app/deploy


# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output
COPY --from=builder /app/backend/dist ./dist

# Copy flattened production node_modules (no broken symlinks)
COPY --from=builder /app/deploy/node_modules ./node_modules

# Copy entrypoint
COPY --from=builder /app/backend/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["./start.sh"]
