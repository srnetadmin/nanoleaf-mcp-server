import axios, { AxiosInstance } from 'axios';
import https from 'https';
import pkg from 'node-ssdp';
const { Client } = pkg;

export interface NanoleafDevice {
  ip: string;
  port: number;
  protocol?: string;
  authToken?: string;
}

export interface NanoleafInfo {
  name: string;
  serialNo: string;
  manufacturer: string;
  firmwareVersion: string;
  model: string;
  state: {
    on: {
      value: boolean;
    };
    brightness: {
      value: number;
      max: number;
      min: number;
    };
    hue: {
      value: number;
      max: number;
      min: number;
    };
    sat: {
      value: number;
      max: number;
      min: number;
    };
    ct: {
      value: number;
      max: number;
      min: number;
    };
    colorMode: string;
  };
  effects: {
    select: string;
    effectsList: string[];
  };
  panelLayout: any;
}

export class NanoleafClient {
  private device: NanoleafDevice;
  private httpClient: AxiosInstance;

  constructor(device: NanoleafDevice) {
    this.device = device;
    this.httpClient = axios.create({
      baseURL: `${device.protocol || 'http'}://${device.ip}:${device.port}/api/v1`,
      timeout: 5000,
      // Ignore SSL certificate errors for self-signed certs when using HTTPS
      httpsAgent: device.protocol === 'https' ? new https.Agent({
        rejectUnauthorized: false
      }) : undefined
    });
  }

  static async discover(): Promise<NanoleafDevice[]> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      const devices: NanoleafDevice[] = [];
      const timeout = setTimeout(() => {
        client.stop();
        resolve(devices);
      }, 5000);

      client.on('response', (headers: any, statusCode: number, rinfo: any) => {
        if (headers.ST && headers.ST.includes('nanoleaf')) {
          const location = headers.LOCATION;
          if (location) {
            const url = new URL(location);
            devices.push({
              ip: url.hostname,
              port: parseInt(url.port) || 16021,
            });
          }
        }
      });

      client.search('upnp:rootdevice');
    });
  }

  static async connectToIP(ip: string, port: number = 16021): Promise<NanoleafDevice | null> {
    // Try different protocols and ports
    const attempts = [
      { ip, port, protocol: 'http' },
      { ip, port: 80, protocol: 'http' },
      { ip, port: 443, protocol: 'https' },
      { ip, port, protocol: 'https' }
    ];

    for (const attempt of attempts) {
      try {
        const httpClient = axios.create({
          baseURL: `${attempt.protocol}://${attempt.ip}:${attempt.port}/api/v1`,
          timeout: 5000,
          // Ignore SSL certificate errors for self-signed certs
          httpsAgent: attempt.protocol === 'https' ? new https.Agent({
            rejectUnauthorized: false
          }) : undefined
        });
        
        // Try to make a basic request to see if it's a Nanoleaf device
        const response = await httpClient.get('/');
        // If we get here without error, it's likely a Nanoleaf device
        return { ip: attempt.ip, port: attempt.port, protocol: attempt.protocol };
      } catch (error: any) {
        console.error(`Attempt ${attempt.protocol}://${attempt.ip}:${attempt.port} failed:`, error.message);
        // Check if it's a 403 Forbidden (typical for Nanoleaf without auth)
        if (error.response && error.response.status === 403) {
          console.error(`Found Nanoleaf device at ${attempt.protocol}://${attempt.ip}:${attempt.port} (403 Forbidden - needs auth)`);
          return { ip: attempt.ip, port: attempt.port, protocol: attempt.protocol };
        }
        // Continue to next attempt if other error
        continue;
      }
    }
    
    return null;
  }

  async authorize(): Promise<string> {
    try {
      const response = await this.httpClient.post('/new');
      const authToken = response.data.auth_token;
      this.device.authToken = authToken;
      return authToken;
    } catch (error) {
      throw new Error('Failed to authorize. Make sure to hold the power button on your Nanoleaf device for 5-7 seconds.');
    }
  }

  private getAuthUrl(endpoint: string): string {
    if (!this.device.authToken) {
      throw new Error('Device not authorized. Call authorize() first.');
    }
    return `/${this.device.authToken}${endpoint}`;
  }

  async getInfo(): Promise<NanoleafInfo> {
    const response = await this.httpClient.get(this.getAuthUrl(''));
    return response.data;
  }

  async turnOn(): Promise<void> {
    await this.httpClient.put(this.getAuthUrl('/state'), {
      on: { value: true }
    });
  }

  async turnOff(): Promise<void> {
    await this.httpClient.put(this.getAuthUrl('/state'), {
      on: { value: false }
    });
  }

  async setBrightness(brightness: number): Promise<void> {
    if (brightness < 0 || brightness > 100) {
      throw new Error('Brightness must be between 0 and 100');
    }
    await this.httpClient.put(this.getAuthUrl('/state'), {
      brightness: { value: brightness }
    });
  }

  async setColor(hue: number, saturation: number): Promise<void> {
    if (hue < 0 || hue > 360) {
      throw new Error('Hue must be between 0 and 360');
    }
    if (saturation < 0 || saturation > 100) {
      throw new Error('Saturation must be between 0 and 100');
    }
    await this.httpClient.put(this.getAuthUrl('/state'), {
      hue: { value: hue },
      sat: { value: saturation }
    });
  }

  async setEffect(effectName: string): Promise<void> {
    await this.httpClient.put(this.getAuthUrl('/effects'), {
      select: effectName
    });
  }

  async getEffects(): Promise<string[]> {
    const response = await this.httpClient.get(this.getAuthUrl('/effects/effectsList'));
    return response.data;
  }

  async setColorTemperature(temperature: number): Promise<void> {
    if (temperature < 1200 || temperature > 6500) {
      throw new Error('Color temperature must be between 1200K and 6500K');
    }
    await this.httpClient.put(this.getAuthUrl('/state'), {
      ct: { value: temperature }
    });
  }
}
