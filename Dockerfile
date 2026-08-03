FROM node:20-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_BASE_URL=/pipeline/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.29-alpine

ENV BACKEND_UPSTREAM=http://backend:8000

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/pipeline/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
