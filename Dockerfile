# ---------- Build stage ----------
FROM node:20-bullseye AS builder
WORKDIR /app

# Build-time knobs
ARG NODE_OPTIONS="--max_old_space_size=6144"
ARG GENERATE_SOURCEMAP="false"
ENV NODE_OPTIONS=${NODE_OPTIONS}
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}

# Copy only manifests first for better caching
# (include the lockfile if present; the * keeps the layer valid even if absent)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install deps using whichever lockfile exists
RUN --mount=type=cache,target=/root/.npm bash -lc '\
  if [ -f yarn.lock ]; then \
    corepack enable && corepack prepare yarn@stable --activate && yarn install --frozen-lockfile --non-interactive; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci --no-audit --no-fund; \
  else \
    echo "No lockfile found; falling back to npm install" && npm install --no-audit --no-fund; \
  fi'

# Now copy the source and build
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]



# # Step 1: Build React app
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # Step 2: Serve via NGINX
# FROM nginx:alpine
# COPY --from=builder /app/build /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# # Make sure files are readable
# RUN chmod -R 755 /usr/share/nginx/html

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
