# Multi-stage build for production

# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY src ./src
COPY public ./public

# Build frontend with production environment
ENV NODE_ENV=production
RUN npm run build -- --mode production

# Stage 2: Setup backend and serve
FROM node:20-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Install tsx for running TypeScript
RUN npm install -g tsx

# Copy server files
COPY server ./server

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Create database directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the server using tsx
CMD ["tsx", "server/index.ts"]
