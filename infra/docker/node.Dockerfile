# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json tsconfig.base.json .
COPY apps ./apps
COPY packages ./packages
RUN corepack enable && yarn --version || true
RUN npm i --package-lock=false --no-audit --no-fund

FROM deps AS build
ARG APP_DIR
WORKDIR /app/${APP_DIR}
RUN npm run build || npm run build --workspaces || true

FROM base AS runner
ARG APP_DIR
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/${APP_DIR}/dist ./dist
COPY --from=build /app/${APP_DIR}/package.json ./package.json
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
