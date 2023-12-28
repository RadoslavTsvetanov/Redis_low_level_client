import net from 'net';

export interface OperationResult {
  success: boolean;
  value: string | string[] | null;
  error?: string; // Error message, if applicable
}

export class RedisClient {
  private client: net.Socket;

  constructor() {
    this.client = net.createConnection({ port: 6379, host: '127.0.0.1' }, () => {
      console.log('Connected to Redis server');
    });

    this.client.on('end', () => {
      console.log('Disconnected from Redis server');
    });
  }

  private sendCommand(command: string[]): Promise<OperationResult> {
    return new Promise((resolve) => {
      const onDataReceived = (data: Buffer) => {
        const response = data.toString();
        const parsedResponse = this.parseResponse(response);
        this.client.removeListener('data', onDataReceived); // Remove the listener
        resolve(parsedResponse);
      };

      this.client.on('data', onDataReceived);

      const commandString = `*${command.length}\r\n${command
        .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}`)
        .join('\r\n')}\r\n`;
      this.client.write(commandString);
    });
  }

  private parseResponse(response: string): OperationResult {
    const [type, content] = response.split('\r\n').filter(Boolean);

    switch (type.charAt(0)) {
      case '+': // Single line reply
        return { success: true, value: "successfully created" };
      case '*': // Array reply
        const count = parseInt(type.slice(1), 10);
        if (count === -1) return { success: true, value: null };
        const values = content.split('\r\n').filter(Boolean);
        return { success: true, value: values };
      case '$': // Bulk string reply
        const length = parseInt(type.slice(1), 10);
        if (length === -1) return { success: true, value: null };
        return { success: true, value: content.slice(0, length) };
      case '-': // Error reply
        return { success: false, value: null, error: content };
      case ':':
        return { success: true, value: "successfully deleted" };
      default:
        return { success: false, value: "Unexpected server response" };
    }
  }

  async set(key: string, value: string): Promise<OperationResult> {
    return this.sendCommand(['SET', key, value]);
  }

  async get(key: string): Promise<OperationResult> {
    return this.sendCommand(['GET', key]);
  }

  async delete(key: string): Promise<OperationResult> {
    return this.sendCommand(['DEL', key]);
  }
}

async function testRedisClient() {
  const redis = new RedisClient();
  const setResult = await redis.set('myKey', 'myValue');
  console.log('Set result:', setResult);

  const getValue = await redis.get('myKey');
  console.log('Value for myKey:', getValue);

  const deleteResult = await redis.delete('myKey');
  console.log('Delete result:', deleteResult);
}

testRedisClient();
