# Build context: repo root (needs access to ../domain)
# docker build -f src/ui/Dockerfile -t ui .

FROM node:24-alpine AS build
WORKDIR /app
COPY src/ui/package.json src/ui/package-lock.json ./
RUN npm ci
COPY src/ui/index.html src/ui/vite.config.ts ./
COPY src/ui/tsconfig.json src/ui/tsconfig.app.json src/ui/tsconfig.node.json ./
COPY src/ui/public ./public
COPY src/ui/src ./src
COPY src/domain /domain
RUN npm run build

FROM caddy:2-alpine
COPY src/ui/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
