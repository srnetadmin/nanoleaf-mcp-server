#!/bin/bash

echo "🎨 Nanoleaf MCP Server - Example Commands"
echo "========================================"

# Make sure you have built the image and set up your .env file first!

BASE_CMD="docker run --rm -i --network=host --env-file .env nanoleaf-mcp-server-nanoleaf-mcp-server"

echo ""
echo "1. Get device information:"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_nanoleaf_info", "arguments": {}}}' | $BASE_CMD

echo ""
echo "2. Turn lights off:"
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "turn_off_nanoleaf", "arguments": {}}}' | $BASE_CMD

echo ""
echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "3. Turn lights on:"
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "turn_on_nanoleaf", "arguments": {}}}' | $BASE_CMD

echo ""
echo "4. Set brightness to 50%:"
echo '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "set_brightness", "arguments": {"brightness": 50}}}' | $BASE_CMD

echo ""
echo "5. Set color to red (hue: 0, saturation: 100):"
echo '{"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "set_color", "arguments": {"hue": 0, "saturation": 100}}}' | $BASE_CMD

echo ""
echo "Waiting 3 seconds..."
sleep 3

echo ""
echo "6. Apply Northern Lights effect:"
echo '{"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "set_effect", "arguments": {"effect": "Northern Lights"}}}' | $BASE_CMD

echo ""
echo "Waiting 3 seconds..."
sleep 3

echo ""
echo "7. Apply Cyberpunk 2077 effect:"
echo '{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "set_effect", "arguments": {"effect": "Cyberpunk 2077"}}}' | $BASE_CMD

echo ""
echo "8. Get list of all available effects:"
echo '{"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {"name": "get_effects", "arguments": {}}}' | $BASE_CMD

echo ""
echo "🎉 Demo complete! Your Nanoleaf should be back to Cyberpunk 2077 effect."
