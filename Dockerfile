# Image de production : un seul processus Node (Hono) sert l'API sous /api et le front Angular
# prérendu (backend/src/index.ts). Contexte de build : la racine du dépôt.
#   docker build -t coaching-life-app .
# Au démarrage : migrations, seed idempotent (backend/start.sh), puis le serveur sur le port 3000.

FROM node:26-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
# Même pnpm que le champ `packageManager` (corepack n'est plus livré avec Node).
RUN npm install --global "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
 && pnpm --filter @coaching-life/backend build \
 && cp -r backend/src/db/migrations backend/dist/db/migrations \
 && pnpm deploy --filter @coaching-life/backend --prod --legacy /app/deploy

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=root:root /app/backend/dist ./dist
COPY --from=builder --chown=root:root /app/deploy/node_modules ./node_modules
COPY --from=builder --chown=root:root --chmod=0555 /app/backend/start.sh ./start.sh
COPY --from=builder --chown=root:root /app/dist/coaching-life/browser ./browser
# Fichiers en lecture seule pour l'utilisateur du processus.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/api/health"]
CMD ["./start.sh"]
