FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0
ENV HOME=/root
ENV AGENT_OS_DATA_PATH=/var/lib/agent-os
ENV MONGO_DBPATH=/var/lib/agent-os/mongodb
ENV MONGODB_URI=mongodb://127.0.0.1:27017/nutrition-tracker
ENV EMBEDDED_MONGO=auto

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl gnupg ca-certificates \
  && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
    | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
  && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
    > /etc/apt/sources.list.d/mongodb-org-7.0.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends mongodb-org \
  && apt-get purge -y curl gnupg \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3003
ENTRYPOINT ["/app/docker-entrypoint.sh"]
