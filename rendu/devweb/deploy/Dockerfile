# ── Front Next.js (TechCorp DEV WEB) ─────────────────────────────────────────
# Build multi-étapes. Contexte de build = racine de rendu/devweb (voir compose).
# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /app
# openssl requis par le moteur Prisma sous Debian
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Dépendances ──
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ──
FROM base AS build
# AUTH_SECRET factice : nécessaire car certains modules le lisent à l'import au build.
# La vraie valeur est injectée au runtime par docker-compose.
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ENV DATABASE_URL="file:/tmp/build.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── Runner ──
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
# Applique les migrations (crée /data/dev.db dans le volume) puis démarre Next.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
