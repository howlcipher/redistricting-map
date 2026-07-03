#!/bin/bash
# RedrawUS Launcher for Linux and macOS

echo "=================================================="
echo "      RedrawUS Local Server Launcher"
echo "=================================================="
echo "Starting local Python HTTP server on port 8000..."

# Detect OS and open browser in background
if [ "$(uname)" == "Darwin" ]; then
    # macOS
    (sleep 1 && open http://localhost:8000) &
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    # Linux
    (sleep 1 && (xdg-open http://localhost:8000 || sensible-browser http://localhost:8000 || x-www-browser http://localhost:8000)) &
fi

# Launch the server
python3 -m http.server 8000
