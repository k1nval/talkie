# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app

# Install deps only for API
FROM base AS deps
WORKDIR /app/apps/api
COPY apps/api/package.json ./package.json
RUN npm install --no-audit --no-fund --package-lock=false

# Build API
FROM base AS build
WORKDIR /app/apps/api
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY apps/api .
COPY tsconfig.base.json ../../tsconfig.base.json
RUN npm run build

# Run API
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/index.js"]


