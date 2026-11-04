FROM node:22-slim

WORKDIR /app

# sharp renders SVG <text> via fontconfig; the slim image ships no fonts or fontconfig config.
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

USER node
ENV PORT=3000
EXPOSE 3000

# Run node directly (not via npm) so it receives SIGTERM from `docker stop`.
CMD ["node", "--import", "tsx", "src/index.ts"]
