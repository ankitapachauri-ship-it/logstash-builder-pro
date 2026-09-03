# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached unless lockfile changes)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build
COPY . .
RUN yarn build
# Output is in /app/dist


# ── Stage 2: Serve ─────────────────────────────────────────────────────────────
# F-09: nginxinc/nginx-unprivileged runs as uid 101 (non-root) by default.
#        It also already listens on 8080, matching Cloud Run's expected port.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-aware nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run injects PORT (default 8080). The nginx config reads it via envsubst.
ENV PORT=8080
EXPOSE 8080

# Use a startup script so nginx can pick up the PORT env var at runtime
CMD ["/bin/sh", "-c", \
  "envsubst '${PORT}' < /etc/nginx/conf.d/app.conf > /tmp/app.conf && \
   cp /tmp/app.conf /etc/nginx/conf.d/app.conf && \
   nginx -g 'daemon off;'"]
