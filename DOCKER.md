# Podcast Directory - Docker Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Cloudflare tunnel configured

## Building and Running

### Development
```bash
npm run dev:all
```

### Production with Docker

1. **Build the Docker image:**
```bash
docker-compose build
```

2. **Start the container:**
```bash
docker-compose up -d
```

3. **View logs:**
```bash
docker-compose logs -f
```

4. **Stop the container:**
```bash
docker-compose down
```

## Cloudflare Tunnel Setup

The app is configured to run on port 5174 and is accessible via:
- **URL:** https://pods.gwsapp.net
- **Local Port:** 5174 (mapped to container port 3001)

### Start the Cloudflare Tunnel
```bash
cloudflared tunnel run d334b627-0f1d-4e28-81c1-894ab3905f16 && tail -f /Users/grantwatson/.cloudflared/log.txt
```

## Environment Variables

You can customize the deployment by setting environment variables in `docker-compose.yml`:

- `NODE_ENV`: Set to 'production' for production builds
- `PORT`: Internal port (default: 3001)
- `JWT_SECRET`: Secret key for JWT tokens (change in production)

## Database

The SQLite database is persisted in a Docker volume named `podcast-data`. This ensures your data survives container restarts.

## Health Check

The container includes a health check that pings the server every 30 seconds to ensure it's running properly.

## Updating the App

1. Pull latest changes
2. Rebuild the image: `docker-compose build`
3. Restart the container: `docker-compose up -d`

## Troubleshooting

**Container won't start:**
```bash
docker-compose logs podcast-directory
```

**Check if container is running:**
```bash
docker ps | grep podcast-directory
```

**Access container shell:**
```bash
docker exec -it podcast-directory sh
```

**Remove all data and start fresh:**
```bash
docker-compose down -v
docker-compose up -d
```
