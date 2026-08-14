# Build context: repo root (needs access to ../domain)
# docker build -f src/ui/Dockerfile -t ui .

# Tests run in browser mode (real Chromium via Playwright), so this stage
# needs Playwright's own image rather than node:24-alpine — Playwright's
# browser binaries need glibc, which alpine's musl libc can't run. Keep the
# tag's Playwright version in sync with the "playwright" devDependency in
# package.json.
FROM mcr.microsoft.com/playwright:v1.62.1-noble AS test
WORKDIR /app
COPY src/ui/package.json src/ui/package-lock.json ./
RUN npm ci
COPY src/ui/vitest.config.ts ./
COPY src/ui/src ./src
COPY src/domain /domain
RUN npm test

FROM node:26-alpine AS build
WORKDIR /app
COPY src/ui/package.json src/ui/package-lock.json ./
RUN npm ci
# No files are needed from the test stage — this COPY only exists to give
# Docker a dependency edge on it, so a build fails here if the tests do.
COPY --from=test /app/package.json /tmp/.tested
COPY src/ui/index.html src/ui/vite.config.ts ./
COPY src/ui/tsconfig.json src/ui/tsconfig.app.json src/ui/tsconfig.node.json src/ui/tsconfig.sw.json ./
COPY src/ui/public ./public
COPY src/ui/src ./src
COPY src/domain /domain
RUN npm run build

FROM caddy:2-alpine
COPY src/ui/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
