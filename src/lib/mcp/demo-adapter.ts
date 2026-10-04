import type { McpAdapter, McpOperationRequest, McpOperationResult, McpServerDescriptor } from '@/types/mcp';

const servers: McpServerDescriptor[] = [{
  id: 'davinci-local',
  name: 'DaVinci Resolve',
  description: 'Target integration slot. No Resolve MCP endpoint is configured in this workspace.',
  version: 'Not connected',
  transport: 'streamable-http',
  status: 'disconnected',
  permissions: ['Read project metadata', 'Edit timeline', 'Create nodes', 'Render/export'],
  capabilities: ['project.inspect', 'timeline.inspect', 'media.import', 'color.apply-lut', 'composite.add-layer', 'timeline.render'],
  tools: [],
  resources: [],
}];

export class DemoMcpAdapter implements McpAdapter {
  async listServers() { return structuredClone(servers); }
  async inspectServer(serverId: string) { return structuredClone(servers.find(server => server.id === serverId) ?? null); }
  async callTool(request: McpOperationRequest): Promise<McpOperationResult> {
    return {
      status: 'complete', mode: 'demo',
      content: [{ type: 'text', text: `DEMO ONLY — ${request.toolName} was recorded as a simulated job. No MCP server or DaVinci Resolve was contacted.` }],
    };
  }
}

export const mcpAdapter: McpAdapter = new DemoMcpAdapter();

export function capabilitiesForEffects(effectCapabilities: string[][]) {
  return [...new Set(effectCapabilities.flat())].sort();
}
