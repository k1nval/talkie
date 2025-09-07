# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app

# Only install web deps
FROM base AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json ./package.json
RUN npm install --no-audit --no-fund --package-lock=false

# Build Next.js
FROM base AS build
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web .
COPY tsconfig.base.json ../../tsconfig.base.json
RUN npm run build

# Run Next.js
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY --from=build /app/apps/web .
EXPOSE 3000
CMD ["npm", "run", "start"]


