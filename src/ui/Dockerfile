# Build context: repo root (needs access to the "domain" workspace package)
# docker build -f src/ui/Dockerfile -t ui .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY src/domain/package.json src/domain/
COPY src/ui/package.json src/ui/
RUN npm ci --workspace=domain --workspace=ui
COPY src/domain/tsconfig.json src/domain/
COPY src/domain/src src/domain/src
RUN npm run build --workspace=domain
COPY src/ui/index.html src/ui/vite.config.ts src/ui/
COPY src/ui/tsconfig.json src/ui/tsconfig.app.json src/ui/tsconfig.node.json src/ui/
COPY src/ui/public src/ui/public
COPY src/ui/src src/ui/src
RUN npm run build --workspace=ui

FROM caddy:2-alpine
COPY src/ui/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/src/ui/dist /srv
