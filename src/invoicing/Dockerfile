# Build context: repo root (needs access to ../domain)
# docker build -f src/invoicing/Dockerfile -t invoicing .

FROM node:24-alpine AS build
WORKDIR /app
COPY src/invoicing/package.json src/invoicing/package-lock.json ./
RUN npm ci
COPY src/invoicing/tsconfig.json ./
COPY src/invoicing/src ./src
COPY src/domain /domain
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY src/invoicing/package.json src/invoicing/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY src/domain /domain
CMD ["node", "dist/index.js"]
