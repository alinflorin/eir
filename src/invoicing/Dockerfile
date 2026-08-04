# Build context: repo root (needs access to the "domain" and
# "service-common" workspace packages)
# docker build -f src/invoicing/Dockerfile -t invoicing .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY src/domain/package.json src/domain/
COPY src/service-common/package.json src/service-common/
COPY src/invoicing/package.json src/invoicing/
RUN npm ci --workspace=domain --workspace=service-common --workspace=invoicing
COPY src/domain/tsconfig.json src/domain/
COPY src/domain/src src/domain/src
COPY src/service-common/tsconfig.json src/service-common/
COPY src/service-common/src src/service-common/src
COPY src/invoicing/tsconfig.json src/invoicing/
COPY src/invoicing/src src/invoicing/src
RUN npm run build --workspace=domain --workspace=service-common --workspace=invoicing

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY src/domain/package.json src/domain/
COPY src/service-common/package.json src/service-common/
COPY src/invoicing/package.json src/invoicing/
RUN npm ci --omit=dev --workspace=domain --workspace=service-common --workspace=invoicing
COPY --from=build /app/src/domain/dist ./src/domain/dist
COPY --from=build /app/src/service-common/dist ./src/service-common/dist
COPY --from=build /app/src/invoicing/dist ./src/invoicing/dist
WORKDIR /app/src/invoicing
CMD ["node", "dist/index.js"]
