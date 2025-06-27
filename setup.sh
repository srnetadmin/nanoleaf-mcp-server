#!/bin/bash

echo "🎨 Nanoleaf MCP Server Setup Script"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if nmap is available for scanning
if ! command -v nmap &> /dev/null; then
    echo "⚠️  nmap is not installed. You'll need to find your Nanoleaf IP manually."
    echo "   Install with: sudo apt install nmap (Ubuntu/Debian) or brew install nmap (macOS)"
fi

echo ""
echo "Step 1: Building Docker image..."
docker build -t nanoleaf-mcp-server-nanoleaf-mcp-server .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker image built successfully!"
echo ""

# Network detection
echo "Step 2: Finding your Nanoleaf device..."
echo "Scanning common network ranges for Nanoleaf devices..."

# Get the local IP and network
LOCAL_IP=$(hostname -I | awk '{print $1}')
NETWORK=$(echo $LOCAL_IP | cut -d. -f1-3)

echo "Scanning ${NETWORK}.0/24 for Nanoleaf devices on port 16021..."

if command -v nmap &> /dev/null; then
    NANOLEAF_IPS=$(nmap -p 16021 --open ${NETWORK}.0/24 2>/dev/null | grep -B 4 "16021/tcp open" | grep "Nmap scan report" | awk '{print $5}')
    
    if [ -z "$NANOLEAF_IPS" ]; then
        echo "❌ No Nanoleaf devices found automatically."
        echo "Please find your device IP manually and enter it below."
    else
        echo "✅ Found potential Nanoleaf device(s):"
        echo "$NANOLEAF_IPS"
    fi
else
    echo "⚠️  Skipping automatic scan (nmap not available)"
fi

echo ""
read -p "Enter your Nanoleaf device IP address: " DEVICE_IP

if [ -z "$DEVICE_IP" ]; then
    echo "❌ No IP address provided!"
    exit 1
fi

echo ""
echo "Step 3: Getting authorization token..."
echo "⚠️  IMPORTANT: Put your Nanoleaf device in pairing mode now!"
echo "   Hold the power button on your device for 5-7 seconds until it shows pairing indicator"
echo ""
read -p "Press ENTER when your device is in pairing mode..."

echo "Attempting to get auth token..."
AUTH_RESPONSE=$(curl -s -X POST http://$DEVICE_IP:16021/api/v1/new)

if [[ $AUTH_RESPONSE == *"auth_token"* ]]; then
    AUTH_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Authorization successful!"
    echo "Auth token: ${AUTH_TOKEN:0:8}... (truncated)"
else
    echo "❌ Authorization failed!"
    echo "Response: $AUTH_RESPONSE"
    echo ""
    echo "Make sure your device is in pairing mode and try again."
    exit 1
fi

echo ""
echo "Step 4: Creating configuration files..."

# Create .env file
cat > .env << EOF
NANOLEAF_IP=$DEVICE_IP
NANOLEAF_AUTH_TOKEN=$AUTH_TOKEN
NANOLEAF_PORT=16021
NANOLEAF_PROTOCOL=http
EOF

echo "✅ Created .env file"

# Create Warp configuration
cat > warp-config.json << EOF
{
  "mcpServers": {
    "nanoleaf": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i", "--network=host",
        "-e", "NANOLEAF_IP=$DEVICE_IP",
        "-e", "NANOLEAF_AUTH_TOKEN=$AUTH_TOKEN",
        "-e", "NANOLEAF_PORT=16021",
        "-e", "NANOLEAF_PROTOCOL=http",
        "nanoleaf-mcp-server-nanoleaf-mcp-server"
      ],
      "env": {}
    }
  }
}
EOF

echo "✅ Created warp-config.json"

echo ""
echo "Step 5: Testing setup..."
echo "Getting device info..."

TEST_RESPONSE=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_nanoleaf_info", "arguments": {}}}' | docker run --rm -i --network=host --env-file .env nanoleaf-mcp-server-nanoleaf-mcp-server 2>/dev/null)

if [[ $TEST_RESPONSE == *"\"name\":"* ]]; then
    DEVICE_NAME=$(echo $TEST_RESPONSE | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    NUM_PANELS=$(echo $TEST_RESPONSE | grep -o '"numPanels":[0-9]*' | cut -d':' -f2)
    echo "✅ Test successful!"
    echo "Device: $DEVICE_NAME"
    echo "Panels: $NUM_PANELS"
else
    echo "❌ Test failed!"
    echo "Response: $TEST_RESPONSE"
fi

echo ""
echo "🎉 Setup Complete!"
echo "==================="
echo ""
echo "Your Nanoleaf MCP server is ready!"
echo ""
echo "To use with Warp terminal:"
echo "1. Copy the contents of warp-config.json"
echo "2. Add it to your Warp MCP servers configuration"
echo ""
echo "To test manually:"
echo "docker run --rm -i --network=host --env-file .env nanoleaf-mcp-server-nanoleaf-mcp-server"
echo ""
echo "Configuration files created:"
echo "- .env (environment variables)"
echo "- warp-config.json (Warp MCP configuration)"
echo ""
echo "Enjoy your smart lighting setup! 🌈✨"
