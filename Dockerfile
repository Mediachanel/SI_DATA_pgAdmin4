FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS python-deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PATH="/opt/venv/bin:${PATH}"
ENV DRH_PYTHON_BIN=python3
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app ./
COPY --from=python-deps /opt/venv /opt/venv
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p storage .next/cache/images \
  && chown -R node:node storage .next/cache
USER node

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
