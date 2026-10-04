export type McpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
};

export type McpResourceDescriptor = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export type McpServerDescriptor = {
  id: string;
  name: string;
  description: string;
  version: string;
  transport: 'streamable-http' | 'stdio';
  endpoint?: string;
  status: 'connected' | 'disconnected' | 'error' | 'demo';
  permissions: string[];
  capabilities: string[];
  tools: McpToolDescriptor[];
  resources: McpResourceDescriptor[];
  lastChecked?: number;
  lastError?: string;
};

export type McpOperationRequest = {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  projectId?: string;
  mode: 'demo' | 'live';
};

export type McpOperationResult = {
  status: 'complete' | 'failed';
  mode: 'demo' | 'live';
  content: Array<{ type: 'text'; text: string }>;
};

export interface McpAdapter {
  listServers(): Promise<McpServerDescriptor[]>;
  inspectServer(serverId: string): Promise<McpServerDescriptor | null>;
  callTool(request: McpOperationRequest): Promise<McpOperationResult>;
}
