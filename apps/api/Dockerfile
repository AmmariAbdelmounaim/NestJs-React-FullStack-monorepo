# Stage 1: Build the API
FROM node:20-alpine AS api-builder

WORKDIR /app

# Copy package files (including package-lock.json)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Copy workspace configuration
COPY . .

# Sync TypeScript project references
RUN npx nx sync

# Build the API
RUN npm run build:api

# Stage 2: Build the Client
FROM node:20-alpine AS client-builder

WORKDIR /app

# Copy package files (including package-lock.json)
COPY package.json package-lock.json ./
COPY apps/client/package.json ./apps/client/
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Copy workspace configuration
COPY . .

# Build the client (VITE_API_URL will be set at build time or use relative path)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build:client

# Stage 3: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy built API from builder stage (includes generated package.json)
COPY --from=api-builder /app/apps/api/dist ./

# Install only production dependencies from the generated package.json
RUN npm ci --only=production

# Copy built client from client-builder stage to public directory
COPY --from=client-builder /app/apps/client/dist ./public

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "main.js"]

