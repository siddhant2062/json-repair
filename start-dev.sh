#!/bin/bash

# Script to kill existing server and start dev server on specified port
# Usage: 
#   ./start-dev.sh [port]          - Start server on port (default: 3000)
#   ./start-dev.sh kill [port]     - Kill server on port (default: 3000)
#   ./start-dev.sh status [port]    - Check if server is running on port
#
# Examples:
#   ./start-dev.sh 3000            - Start on port 3000
#   ./start-dev.sh kill 3000       - Kill server on port 3000
#   ./start-dev.sh status 3000     - Check status on port 3000

ACTION=${1:-start}
PORT=${2:-3000}

# If first arg is a number, treat it as port (backward compatibility)
if [[ "$ACTION" =~ ^[0-9]+$ ]]; then
  PORT=$ACTION
  ACTION="start"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill process on a port
kill_port() {
  local port=$1
  echo -e "${YELLOW}🔍 Checking for processes on port $port...${NC}"
  
  # Find processes using the port
  local pids=$(lsof -ti:$port 2>/dev/null)
  
  if [ -z "$pids" ]; then
    echo -e "${GREEN}✅ No process found on port $port${NC}"
    return 0
  fi
  
  echo -e "${YELLOW}Found processes on port $port: $pids${NC}"
  
  # Show process details
  for pid in $pids; do
    local process=$(ps -p $pid -o comm= 2>/dev/null)
    echo -e "${BLUE}  Process $pid: $process${NC}"
  done
  
  # Kill all processes on the port
  for pid in $pids; do
    echo -e "${YELLOW}  Killing process $pid...${NC}"
    kill -9 $pid 2>/dev/null
  done
  
  # Wait a moment for processes to die
  sleep 2
  
  # Verify port is free
  local remaining=$(lsof -ti:$port 2>/dev/null)
  if [ -z "$remaining" ]; then
    echo -e "${GREEN}✅ Port $port is now free${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed to free port $port. Remaining PIDs: $remaining${NC}"
    echo -e "${YELLOW}Try running with sudo if you have permission issues${NC}"
    return 1
  fi
}

# Function to check port status
check_status() {
  local port=$1
  echo -e "${YELLOW}🔍 Checking status of port $port...${NC}"
  
  local pids=$(lsof -ti:$port 2>/dev/null)
  
  if [ -z "$pids" ]; then
    echo -e "${GREEN}✅ Port $port is free (no server running)${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  Port $port is in use by:${NC}"
    for pid in $pids; do
      local process=$(ps -p $pid -o comm=,args= 2>/dev/null | head -1)
      echo -e "${BLUE}  PID $pid: $process${NC}"
    done
    return 1
  fi
}

# Function to start dev server
start_server() {
  local port=$1
  
  # Kill any existing process on the port
  kill_port $port
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to free port $port. Exiting.${NC}"
    exit 1
  fi
  
  echo ""
  echo -e "${GREEN}🚀 Starting dev server on port $port...${NC}"
  echo -e "${YELLOW}📍 Server will be available at: http://localhost:$port${NC}"
  echo -e "${YELLOW}⏹️  Press Ctrl+C to stop the server${NC}"
  echo ""
  
  # Start the server
  PORT=$port npm run dev
}

# Handle different actions
case "$ACTION" in
  kill)
    KILL_PORT=${PORT:-3000}
    kill_port $KILL_PORT
    exit $?
    ;;
  status)
    CHECK_PORT=${PORT:-3000}
    check_status $CHECK_PORT
    exit $?
    ;;
  start)
    # Validate port number
    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
      echo -e "${RED}❌ Error: Invalid port number. Port must be between 1 and 65535${NC}"
      echo ""
      echo "Usage:"
      echo "  ./start-dev.sh [port]          - Start server on port (default: 3000)"
      echo "  ./start-dev.sh kill [port]      - Kill server on port (default: 3000)"
      echo "  ./start-dev.sh status [port]    - Check status on port (default: 3000)"
      echo ""
      echo "Examples:"
      echo "  ./start-dev.sh 3000"
      echo "  ./start-dev.sh kill 3000"
      echo "  ./start-dev.sh status 3000"
      exit 1
    fi
    
    # Start the server
    start_server $PORT
    ;;
  *)
    echo -e "${RED}❌ Unknown action: $ACTION${NC}"
    echo ""
    echo "Usage:"
    echo "  ./start-dev.sh [port]          - Start server on port (default: 3000)"
    echo "  ./start-dev.sh kill [port]      - Kill server on port (default: 3000)"
    echo "  ./start-dev.sh status [port]    - Check status on port (default: 3000)"
    exit 1
    ;;
esac
