# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS builder

ENV CI=true
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY public ./public
COPY src ./src
ENV GENERATE_SOURCEMAP=false \
    NODE_OPTIONS=--max-old-space-size=1024
RUN npm test -- --watchAll=false --runInBand
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html/pipeline

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
