# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy workspace manifests for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install backend dependencies only (no Angular frontend)
RUN pnpm install --frozen-lockfile --filter @coaching-life/backend

# Copy backend source
COPY backend/ ./backend/

# Compile TypeScript
RUN cd backend && pnpm build

# Copy SQL migration files into dist (tsc only copies .ts)
RUN cp -r backend/src/db/migrations backend/dist/db/migrations


# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output
COPY --from=builder /app/backend/dist ./dist

# Copy production node_modules
COPY --from=builder /app/backend/node_modules ./node_modules

# Copy entrypoint
COPY --from=builder /app/backend/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["./start.sh"]
