export type AiCapability = 'image-generation' | 'video-generation' | 'segmentation' | 'tracking' | 'rotoscoping' | 'upscaling' | 'inpainting' | 'analysis';

export type AiProvider = {
  id: string;
  name: string;
  status: 'not-configured' | 'ready';
  capabilities: AiCapability[];
  credentialField?: string;
};

export const aiProviderSlots: AiProvider[] = [
  { id: 'openai-compatible', name: 'OpenAI-compatible', status: 'not-configured', capabilities: ['image-generation', 'video-generation', 'segmentation', 'analysis'], credentialField: 'API token' },
  { id: 'local-workflow', name: 'Local workflow server', status: 'not-configured', capabilities: ['image-generation', 'video-generation', 'inpainting', 'upscaling'], credentialField: 'Endpoint token' },
  { id: 'custom-provider', name: 'Custom adapter', status: 'not-configured', capabilities: ['tracking', 'rotoscoping', 'analysis'], credentialField: 'Provider token' },
];

export type StructuredEffectRequest = {
  sourceClip: string;
  effectType: string;
  frame: number | null;
  location: string | null;
  style: string | null;
  intensity: number;
  durationFrames: number | null;
  rawPrompt: string;
  executionMode: 'demo' | 'provider';
};

export function structureEffectPrompt(rawPrompt: string, sourceClip: string): StructuredEffectRequest {
  const frame = rawPrompt.match(/\bframe\s+(\d+)\b/i);
  const duration = rawPrompt.match(/\b(\d+)\s+frames?\b/i);
  const location = rawPrompt.match(/\b(?:at|on|near)\s+(?:the\s+)?([\w -]{2,48}?)(?:\s+at\s+frame|[.,]|$)/i);
  const terms = ['gunshot impact', 'muzzle flash', 'smoke', 'sparks', 'fire', 'explosion', 'fog', 'rain', 'object removal', 'tracking', 'night vision', 'film grain'];
  const effectType = terms.find(term => rawPrompt.toLowerCase().includes(term)) ?? 'custom effect request';
  return {
    sourceClip, effectType,
    frame: frame ? Number(frame[1]) : null,
    location: location?.[1]?.trim() ?? null,
    style: /realistic/i.test(rawPrompt) ? 'realistic' : /cinematic/i.test(rawPrompt) ? 'cinematic' : null,
    intensity: /subtle/i.test(rawPrompt) ? 0.3 : 0.65,
    durationFrames: duration ? Number(duration[1]) : null,
    rawPrompt: rawPrompt.trim(), executionMode: 'demo',
  };
}
