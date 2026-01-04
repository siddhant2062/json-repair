#!/bin/bash

# Quick script to kill server on a specific port
# Usage: ./kill-server.sh [port]
# Example: ./kill-server.sh 3000

PORT=${1:-3000}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Checking for processes on port $PORT...${NC}"

# Find processes using the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo -e "${GREEN}✅ No process found on port $PORT${NC}"
  exit 0
fi

echo -e "${YELLOW}Found processes: $PIDS${NC}"

# Show process details
for PID in $PIDS; do
  PROCESS=$(ps -p $PID -o comm=,args= 2>/dev/null | head -1)
  echo -e "${BLUE}  PID $PID: $PROCESS${NC}"
done

# Kill all processes
for PID in $PIDS; do
  echo -e "${YELLOW}  Killing process $PID...${NC}"
  kill -9 $PID 2>/dev/null
done

# Wait and verify
sleep 2
REMAINING=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$REMAINING" ]; then
  echo -e "${GREEN}✅ Port $PORT is now free${NC}"
  exit 0
else
  echo -e "${RED}❌ Failed to free port $PORT. Remaining PIDs: $REMAINING${NC}"
  echo -e "${YELLOW}Try: sudo ./kill-server.sh $PORT${NC}"
  exit 1
fi


