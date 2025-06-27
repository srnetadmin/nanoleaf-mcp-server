#!/bin/bash

# Test the MCP server communication
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | docker exec -i nanoleaf-mcp-server node dist/index.js
