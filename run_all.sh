#!/bin/bash

# NetGraph Sentinel - "Plug & Play" Launcher
# Automatically sets up dependencies and runs the system.
# Usage: ./run_all.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initializing NetGraph Sentinel (Auto-Deploy Mode)...${NC}"

# --- 1. SYSTEM CHECKS ---
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ Error: '$1' is not installed or not in PATH.${NC}"
        echo -e "${YELLOW}Please install $1 before running this script.${NC}"
        exit 1
    fi
}

check_command docker
check_command python3
check_command npm

# --- 2. CLEANUP TRAP ---
cleanup() {
    echo -e "\n${RED}🛑 Stopping services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# --- 3. DATABASE (Docker) ---
echo -e "${GREEN}🐳 Starting Database Containers...${NC}"
if ! docker compose up -d; then
    echo -e "${RED}Failed to start Docker containers. Check your docker permissions.${NC}"
    exit 1
fi

# --- 4. BACKEND SETUP & RUN ---
echo -e "${GREEN}🐍 Setting up Backend...${NC}"
cd backend

# Create Venv if missing
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}   Creating Python Virtual Environment...${NC}"
    python3 -m venv venv
    echo -e "${YELLOW}   Installing Dependencies (this may take a minute)...${NC}"
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    
    # Try to install pcap/scapy extras if possible (linux)
    ./venv/bin/pip install scapy requests psutil async_timeout
fi

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}   Creating default .env file...${NC}"
    echo "DATABASE_URL=postgresql+asyncpg://user:password@localhost/netgraph" > .env
    echo "SECRET_KEY=supersecretdevkey" >> .env
    echo "ALGORITHM=HS256" >> .env
    echo "ACCESS_TOKEN_EXPIRE_MINUTES=30" >> .env
fi

echo -e "${GREEN}   Starting API Server (0.0.0.0:8000)...${NC}"
# Run in background, accessible from outside
./venv/bin/uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# --- 5. FRONTEND SETUP & RUN ---
echo -e "${GREEN}⚛️  Setting up Frontend...${NC}"
cd frontend

# Install Node Modules if missing
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   Installing Node Dependencies (npm install)...${NC}"
    npm install
fi

echo -e "${GREEN}   Starting Dashboard (0.0.0.0:3000)...${NC}"
# Pass -H 0.0.0.0 to next dev to allow external access
# npm run dev -- -H 0.0.0.0
# Note: 'npm run dev' runs 'next dev'. We append args after --
npm run dev -- -H 0.0.0.0

# Cleanup on exit
cleanup
