#!/bin/bash
# ========================================
#   RedBook TV Copy AI Assistant
#   AI Powered Parameter Check and Polish
# ========================================
#
# macOS Launch Script
# Double-click this file or run: bash start.command
#

set -e

echo ""
echo "========================================"
echo "  RedBook TV Copy AI Assistant"
echo "  AI Powered Parameter Check and Polish"
echo "========================================"
echo ""

# Navigate to the script's directory (handles double-click from Finder)
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"
echo "Working directory: $SCRIPT_DIR"
echo ""

# ---------- Check Node.js ----------
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo ""
    echo "Please install Node.js 18+ first:"
    echo "  Option 1: Download from https://nodejs.org/"
    echo "  Option 2: brew install node"
    echo ""
    echo "After installation, re-run this script."
    echo ""
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Check Node.js version >= 18
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "[ERROR] Node.js 18+ is required, current version: $NODE_VERSION"
    echo "Please upgrade Node.js: https://nodejs.org/"
    echo ""
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

# ---------- Check standalone build ----------
if [ ! -f ".next/standalone/server.js" ]; then
    echo ""
    echo "[INFO] First run - building application..."
    echo "This may take a few minutes, please wait..."
    echo ""

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            echo "[ERROR] npm install failed!"
            read -n 1 -s -r -p "Press any key to exit..."
            exit 1
        fi
    fi

    # Build the application
    echo "Building application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Build failed!"
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi

    # Prepare standalone files
    echo "Preparing standalone files..."
    node scripts/prepare-standalone.js
    if [ $? -ne 0 ]; then
        echo "[ERROR] Prepare standalone failed!"
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
fi

# Verify server.js exists
if [ ! -f ".next/standalone/server.js" ]; then
    echo "[ERROR] server.js not found after build!"
    echo "Please try deleting the .next folder and run again:"
    echo "  rm -rf .next && bash start.command"
    echo ""
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

# ---------- Find available port ----------
PORT=3000
find_available_port() {
    local port=$1
    while [ $port -lt $(($1 + 100)) ]; do
        if ! lsof -i :$port &> /dev/null; then
            echo $port
            return
        fi
        port=$((port + 1))
    done
    echo $1
}

PORT=$(find_available_port 3000)
echo ""
echo "Starting server on port $PORT..."
echo ""

# ---------- Start server ----------
export PORT=$PORT
export HOSTNAME=localhost

cd "$SCRIPT_DIR/.next/standalone"
node server.js &
SERVER_PID=$!
cd "$SCRIPT_DIR"

# ---------- Wait for server to be ready ----------
echo "Waiting for server..."
RETRY=0
MAX_RETRY=30
while [ $RETRY -lt $MAX_RETRY ]; do
    sleep 1
    RETRY=$((RETRY + 1))
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -q "200"; then
        break
    fi
    # Also check if process is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "[ERROR] Server process exited unexpectedly!"
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
done

if [ $RETRY -ge $MAX_RETRY ]; then
    echo "[ERROR] Server startup timeout!"
    kill $SERVER_PID 2>/dev/null
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

echo ""
echo "========================================"
echo "  Server is running!"
echo "  URL: http://localhost:$PORT"
echo ""
echo "  Do NOT close this window."
echo "  Press Ctrl+C or close window to stop."
echo "========================================"
echo ""

# ---------- Open browser ----------
open "http://localhost:$PORT"

# ---------- Handle graceful shutdown ----------
cleanup() {
    echo ""
    echo "Stopping server..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    echo "Server stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Keep script running
wait $SERVER_PID
