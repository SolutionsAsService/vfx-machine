import type { EffectManifest, EffectParameter } from '@/types/effects';

export function defaultsForEffect(effect: EffectManifest) {
  return Object.fromEntries(effect.parameters.map(parameter => [parameter.id, parameter.default]));
}

export function clampParameter(parameter: EffectParameter, value: number | string | boolean) {
  if (parameter.type === 'range') {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return parameter.default;
    const clamped = Math.min(parameter.max ?? numeric, Math.max(parameter.min ?? numeric, numeric));
    const step = parameter.step ?? 0;
    return step > 0 ? Math.round((clamped - (parameter.min ?? 0)) / step) * step + (parameter.min ?? 0) : clamped;
  }
  if (parameter.type === 'select' && parameter.options && !parameter.options.includes(String(value))) return parameter.default;
  if (parameter.type === 'toggle') return Boolean(value);
  if (parameter.type === 'color' && !/^#[0-9a-f]{6}$/i.test(String(value))) return parameter.default;
  return value;
}

export function previewFilter(effects: EffectManifest[], stack: { effectId: string; enabled: boolean; parameters: Record<string, unknown> }[]) {
  const active = stack.filter(item => item.enabled).map(item => ({
    effect: effects.find(effect => effect.id === item.effectId),
    parameters: item.parameters,
  }));
  const monochrome = active.find(item => item.effect?.id === 'black-and-white');
  const nightVision = active.find(item => item.effect?.id === 'night-vision');
  const grade = active.find(item => item.effect?.id === 'cinematic-grade');
  const aberration = active.find(item => item.effect?.id === 'chromatic-aberration');
  const saturation = monochrome ? 0 : Math.max(0.2, 1 + Number(grade?.parameters.saturation ?? 0));
  const contrast = Math.max(0.55, 1 + Number(grade?.parameters.contrast ?? 0));
  const brightness = Math.max(0.45, 1 + Number(grade?.parameters.exposure ?? 0) * 0.42);
  const hue = nightVision ? 76 : 0;
  return {
    filter: `grayscale(${saturation === 0 ? 1 : 0}) saturate(${saturation}) contrast(${contrast}) brightness(${brightness}) hue-rotate(${hue}deg)`,
    aberration: Boolean(aberration),
    nightVision: Boolean(nightVision),
    grain: active.some(item => item.effect?.id === 'film-grain') ? Number(active.find(item => item.effect?.id === 'film-grain')?.parameters.intensity ?? 0.2) : 0,
    approximate: active.length > 0,
  };
}
