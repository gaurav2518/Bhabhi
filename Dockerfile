# Use official Node.js 20 LTS Alpine image
FROM node:20-alpine

WORKDIR /app

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY packages/engine/package.json ./packages/engine/
COPY apps/server/package.json ./apps/server/

# Install workspace dependencies
RUN npm ci --include=dev

# Copy engine and server code
COPY packages/engine ./packages/engine
COPY apps/server ./apps/server

# Expose Express & Socket.IO port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start authoritative server
CMD ["npm", "run", "dev", "-w", "apps/server"]
