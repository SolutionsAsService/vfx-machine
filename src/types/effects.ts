export type EffectParameter = {
  id: string;
  label: string;
  group: string;
  type: 'range' | 'select' | 'toggle' | 'color';
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
};

export type EffectManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  category: string;
  version: string;
  summary: string;
  tags: string[];
  preview: { kind: 'illustrated-demo' | 'image' | 'video'; label: string; src?: string };
  inputs: string[];
  outputs: string[];
  parameters: EffectParameter[];
  capabilities: { ai: string[]; mcp: string[]; davinci: string[] };
  execution: { mode: 'demo' | 'local' | 'mcp'; adapter: string; safety: string };
};

export type EffectInstance = {
  instanceId: string;
  effectId: string;
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
};

export type WorkbenchJob = {
  id: string;
  title: string;
  effectId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  mode: 'demo' | 'mcp';
  createdAt: number;
  message: string;
};
