# Dev environment only — not a production image.
# package.json declares no "engines" field, so we pin Node 20 LTS.
FROM node:20-alpine

WORKDIR /app

# Dependencies get their own layer so editing source doesn't reinstall them.
COPY package.json package-lock.json ./
RUN npm ci

# The rest of the source. In docker compose this is shadowed by a bind mount,
# but keeping it here means the image also runs standalone.
# .env is never copied — see .dockerignore; it is mounted at runtime.
COPY . .

# Matches server.port in vite.config.ts
EXPOSE 8080

# --host 0.0.0.0 so the dev server is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
