#!/bin/bash

# Podcast Directory Deployment Script
# This script manages Docker and Cloudflare tunnel

TUNNEL_ID="d334b627-0f1d-4e28-81c1-894ab3905f16"
PROJECT_DIR="/Users/grantwatson/Desktop/Development/React/PodcastDirectory"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎙️  Podcast Directory Deployment${NC}"
echo "=================================="

# Function to build and start Docker
deploy_docker() {
    echo -e "${BLUE}Building Docker image...${NC}"
    cd "$PROJECT_DIR"
    docker-compose down
    docker-compose build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Build successful${NC}"
        echo -e "${BLUE}Starting container...${NC}"
        docker-compose up -d
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Container started on port 5174${NC}"
            echo ""
            docker-compose ps
        else
            echo -e "${RED}✗ Failed to start container${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    fi
}

# Function to restart Cloudflare tunnel
restart_tunnel() {
    echo -e "${BLUE}Restarting Cloudflare tunnel...${NC}"
    
    # Kill existing tunnel
    pkill -f "cloudflared tunnel"
    sleep 2
    
    # Start tunnel in background
    nohup cloudflared tunnel run "$TUNNEL_ID" > ~/.cloudflared/log.txt 2>&1 &
    sleep 3
    
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        echo -e "${GREEN}✓ Tunnel running${NC}"
        echo -e "${GREEN}✓ Access at: https://pods.gwsapp.net${NC}"
    else
        echo -e "${RED}✗ Failed to start tunnel${NC}"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}Showing Docker logs (Ctrl+C to exit)...${NC}"
    docker-compose logs -f
}

# Function to stop everything
stop_all() {
    echo -e "${BLUE}Stopping all services...${NC}"
    docker-compose down
    pkill -f "cloudflared tunnel"
    echo -e "${GREEN}✓ All services stopped${NC}"
}

# Main menu
case "${1}" in
    deploy)
        deploy_docker
        restart_tunnel
        echo ""
        echo -e "${GREEN}🚀 Deployment complete!${NC}"
        echo -e "Local: http://localhost:5174"
        echo -e "Public: https://pods.gwsapp.net"
        ;;
    tunnel)
        restart_tunnel
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        deploy_docker
        restart_tunnel
        ;;
    *)
        echo "Usage: $0 {deploy|tunnel|logs|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Build and deploy Docker container + restart tunnel"
        echo "  tunnel   - Restart Cloudflare tunnel only"
        echo "  logs     - Show Docker container logs"
        echo "  stop     - Stop all services"
        echo "  restart  - Stop and restart everything"
        exit 1
        ;;
esac
