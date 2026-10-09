FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ libvips42 libheif1 exiftool \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate \
  && pnpm install --frozen-lockfile
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "start"]
