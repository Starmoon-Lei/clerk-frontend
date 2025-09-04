import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPServerConfig {
  url: string;
  label: string;
  description: string;
  headers?: Record<string, string>;
  sessionId?: string;
}

export class MCPClientManager {
  private clients: Map<string, any> = new Map();

  async createClient(config: MCPServerConfig) {
    if (this.clients.has(config.label)) {
      return this.clients.get(config.label);
    }

    // Use Streamable HTTP transport for better performance
    const transport = new StreamableHTTPClientTransport(
      new URL(config.url),
      {
        ...(config.sessionId && { sessionId: config.sessionId }),
        ...(config.headers && { headers: config.headers })
      }
    );

    const client = await experimental_createMCPClient({
      transport: transport // Type assertion to work around compatibility issue
    });

    this.clients.set(config.label, client);
    return client;
  }

  async getTools(config: MCPServerConfig) {
    const client = await this.createClient(config);
    return await client.tools();
  }

  async closeClient(label: string) {
    const client = this.clients.get(label);
    if (client) {
      await client.close();
      this.clients.delete(label);
    }
  }

  async closeAllClients() {
    const closePromises = Array.from(this.clients.entries()).map(
      async ([label, client]) => {
        await client.close();
        this.clients.delete(label);
      }
    );
    
    await Promise.all(closePromises);
  }
}

export const defaultMCPServer: MCPServerConfig = {
  url: 'https://mcp-server-jet.vercel.app/mcp',
  label: 'mcp',
  description: 'A mcp server to assist with document analysis.'
};

export async function createMCPTools(configs: MCPServerConfig[] = [defaultMCPServer]) {
  const manager = new MCPClientManager();
  
  try {
    const toolPromises = configs.map(config => manager.getTools(config));
    const toolArrays = await Promise.all(toolPromises);
    
    // Combine tools from all servers
    const combinedTools = toolArrays.reduce((acc, tools) => ({
      ...acc,
      ...tools
    }), {});

    return {
      tools: combinedTools,
      cleanup: () => manager.closeAllClients()
    };
  } catch (error) {
    await manager.closeAllClients();
    throw error;
  }
}