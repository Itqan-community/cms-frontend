# SSR server image: public pages render on the server, the portal stays client-side.
# Build from the repo root:
#   docker build -f deploy/ssr/Dockerfile --build-arg BUILD=production -t cms-frontend-ssr .
#   docker build -f deploy/ssr/Dockerfile --build-arg BUILD=staging    -t cms-frontend-ssr:staging .
# Run:
#   docker run -p 4000:4000 cms-frontend-ssr
#   docker run -p 4000:4000 -e API_PROXY_ORIGIN=https://staging.api.cms.itqan.dev cms-frontend-ssr:staging
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY . .
# production: npm run build:ssr (+ robots.txt/sitemap.xml, CONTEXT=production)
# staging:    npm run build:ssr:staging (+ disallow-all robots.txt)
ARG BUILD=production
ENV CONTEXT=${BUILD}
RUN if [ "$BUILD" = "staging" ]; then npm run build:ssr:staging; else npm run build:ssr; fi

FROM node:${NODE_VERSION}
WORKDIR /app
ENV NODE_ENV=production PORT=4000
# The server bundle is self-contained; it needs only the build output.
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/robots.txt >/dev/null || exit 1
CMD ["node", "dist/server/server.mjs"]
