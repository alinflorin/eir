# Build context: repo root (needs access to ../domain)
# docker build -f src/template-microservice/Dockerfile -t template-microservice .

FROM node:24-alpine AS test
WORKDIR /app
COPY src/template-microservice/package.json src/template-microservice/package-lock.json ./
RUN npm ci
COPY src/template-microservice/vitest.config.ts ./
COPY src/template-microservice/src ./src
COPY src/domain /domain
RUN npm test

FROM node:24-alpine AS build
WORKDIR /app
COPY src/template-microservice/package.json src/template-microservice/package-lock.json ./
RUN npm ci
# No files are needed from the test stage — this COPY only exists to give
# Docker a dependency edge on it, so a build fails here if the tests do.
COPY --from=test /app/package.json /tmp/.tested
COPY src/template-microservice/tsconfig.json ./
COPY src/template-microservice/src ./src
COPY src/domain /domain
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY src/template-microservice/package.json src/template-microservice/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY src/domain /domain
CMD ["node", "dist/index.js"]
