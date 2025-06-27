import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { NanoleafClient } from './nanoleaf-client.js';

const server = new Server(
  {
    name: 'nanoleaf-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

let primaryDevice: NanoleafClient | null = null;

// Initialize Nanoleaf connection
async function initializeNanoleaf() {
  // Check for environment variables first
  const deviceIP = process.env.NANOLEAF_IP;
  const authToken = process.env.NANOLEAF_AUTH_TOKEN;
  
  if (deviceIP && authToken) {
    console.error(`Using configured device: ${deviceIP} with auth token`);
    const device = {
      ip: deviceIP,
      port: parseInt(process.env.NANOLEAF_PORT || '16021'),
      protocol: process.env.NANOLEAF_PROTOCOL || 'http',
      authToken: authToken
    };
    primaryDevice = new NanoleafClient(device);
    return;
  }
  
  try {
    const devices = await NanoleafClient.discover();
    if (devices.length === 0) {
      console.error('No Nanoleaf devices found - server will still run but tools will not work until a device is connected');
      console.error('You can also set NANOLEAF_IP and NANOLEAF_AUTH_TOKEN environment variables for direct connection');
      return;
    }

    primaryDevice = new NanoleafClient(devices[0]);
    console.error('Nanoleaf device discovered:', devices[0]);
  } catch (error) {
    console.error('Error discovering Nanoleaf devices:', error);
  }
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_nanoleaf_info',
        description: 'Get information about the Nanoleaf device',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'turn_on_nanoleaf',
        description: 'Turn on the Nanoleaf lights',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'turn_off_nanoleaf',
        description: 'Turn off the Nanoleaf lights',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_brightness',
        description: 'Set the brightness of the Nanoleaf lights',
        inputSchema: {
          type: 'object',
          properties: {
            brightness: {
              type: 'number',
              description: 'Brightness level (0-100)',
              minimum: 0,
              maximum: 100,
            },
          },
          required: ['brightness'],
        },
      },
      {
        name: 'set_color',
        description: 'Set the color of the Nanoleaf lights',
        inputSchema: {
          type: 'object',
          properties: {
            hue: {
              type: 'number',
              description: 'Hue value (0-360)',
              minimum: 0,
              maximum: 360,
            },
            saturation: {
              type: 'number',
              description: 'Saturation value (0-100)',
              minimum: 0,
              maximum: 100,
            },
          },
          required: ['hue', 'saturation'],
        },
      },
      {
        name: 'set_effect',
        description: 'Set an effect on the Nanoleaf lights',
        inputSchema: {
          type: 'object',
          properties: {
            effect: {
              type: 'string',
              description: 'Name of the effect to apply',
            },
          },
          required: ['effect'],
        },
      },
      {
        name: 'get_effects',
        description: 'Get list of available effects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'discover_nanoleaf',
        description: 'Discover Nanoleaf devices on the network',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'connect_to_ip',
        description: 'Connect to a Nanoleaf device at a specific IP address',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IP address of the Nanoleaf device',
            },
            port: {
              type: 'number',
              description: 'Port number (default: 16021)',
              default: 16021,
            },
          },
          required: ['ip'],
        },
      },
      {
        name: 'authorize_nanoleaf',
        description: 'Authorize connection to Nanoleaf device (device must be in pairing mode)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'discover_nanoleaf':
      try {
        const devices = await NanoleafClient.discover();
        if (devices.length > 0) {
          primaryDevice = new NanoleafClient(devices[0]);
          return {
            content: [
              {
                type: 'text',
                text: `Found ${devices.length} Nanoleaf device(s): ${JSON.stringify(devices, null, 2)}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'No Nanoleaf devices found on the network',
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error during discovery: ${error}`,
            },
          ],
        };
      }

    case 'connect_to_ip':
      try {
        const ip = request.params.arguments?.ip as string;
        const port = (request.params.arguments?.port as number) || 16021;
        const device = await NanoleafClient.connectToIP(ip, port);
        if (device) {
          primaryDevice = new NanoleafClient(device);
          return {
            content: [
              {
                type: 'text',
                text: `Successfully connected to Nanoleaf device at ${ip}:${port}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `No Nanoleaf device found at ${ip}:${port}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error connecting to ${request.params.arguments?.ip}: ${error}`,
            },
          ],
        };
      }

    case 'authorize_nanoleaf':
      if (!primaryDevice) {
        return {
          content: [
            {
              type: 'text',
              text: 'No device connected. Please run connect_to_ip or discover_nanoleaf first.',
            },
          ],
        };
      }
      try {
        const authToken = await primaryDevice.authorize();
        return {
          content: [
            {
              type: 'text',
              text: `Successfully authorized! Auth token: ${authToken.substring(0, 8)}... (truncated for security)`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Authorization failed: ${error}`,
            },
          ],
        };
      }

    default:
      break;
  }

  if (!primaryDevice) {
    return {
      content: [
        {
          type: 'text',
          text: 'Nanoleaf device not initialized. Please run discover_nanoleaf or connect_to_ip first.',
        },
      ],
    };
  }

  switch (request.params.name) {
    case 'get_nanoleaf_info':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(await primaryDevice.getInfo(), null, 2),
          },
        ],
      };

    case 'turn_on_nanoleaf':
      await primaryDevice.turnOn();
      return {
        content: [
          {
            type: 'text',
            text: 'Nanoleaf lights turned on',
          },
        ],
      };

    case 'turn_off_nanoleaf':
      await primaryDevice.turnOff();
      return {
        content: [
          {
            type: 'text',
            text: 'Nanoleaf lights turned off',
          },
        ],
      };

    case 'set_brightness':
      const brightness = request.params.arguments?.brightness as number;
      await primaryDevice.setBrightness(brightness);
      return {
        content: [
          {
            type: 'text',
            text: `Brightness set to ${brightness}%`,
          },
        ],
      };

    case 'set_color':
      const hue = request.params.arguments?.hue as number;
      const saturation = request.params.arguments?.saturation as number;
      await primaryDevice.setColor(hue, saturation);
      return {
        content: [
          {
            type: 'text',
            text: `Color set to hue: ${hue}, saturation: ${saturation}`,
          },
        ],
      };

    case 'set_effect':
      const effect = request.params.arguments?.effect as string;
      await primaryDevice.setEffect(effect);
      return {
        content: [
          {
            type: 'text',
            text: `Effect set to: ${effect}`,
          },
        ],
      };

    case 'get_effects':
      const effects = await primaryDevice.getEffects();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(effects, null, 2),
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  await initializeNanoleaf();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Nanoleaf MCP server running on stdio');
}

main().catch(err => {
    console.error('Failed to start MCP server:', err);
});

